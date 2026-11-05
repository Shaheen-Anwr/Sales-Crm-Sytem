"""REST endpoints for the CRM collections stored in MongoDB."""

from contextlib import contextmanager

from bson import ObjectId
from drf_spectacular.utils import extend_schema
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.reverse import reverse

from . import analytics, schemas
from .filters import MongoFilterBackend
from .mongo import MongoQuery, get_db
from .serializers import (
    AccountSerializer,
    DataDictionaryEntrySerializer,
    OpportunitySerializer,
    ProductSerializer,
    SalesAgentSerializer,
)


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'This record is still used by other records.'
    default_code = 'conflict'


class MongoViewSet(viewsets.GenericViewSet):
    """List, read, create, update and delete the documents of one MongoDB collection.

    Subclasses set `collection_name`, `serializer_class` and the query options
    read by MongoFilterBackend.
    """

    collection_name = None
    filter_backends = [MongoFilterBackend]
    filter_fields = ()
    range_fields = {}
    search_fields = ()
    ordering_fields = ()
    ordering = ()
    lookup_field = 'id'
    lookup_value_regex = '[0-9a-f]{24}'

    @property
    def collection(self):
        return get_db()[self.collection_name]

    @property
    def spec(self):
        return schemas.BY_NAME[self.collection_name]

    def get_queryset(self):
        return MongoQuery(self.collection_name)

    def get_object(self):
        document = self.collection.find_one({'_id': ObjectId(self.kwargs['id'])})
        if document is None:
            raise NotFound()
        self.check_object_permissions(self.request, document)
        return document

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        return Response(self.get_serializer(self.get_object()).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = dict(serializer.validated_data)
        with self.unique_key_errors():
            self.collection.insert_one(document)  # also adds the new _id to `document`
        return Response(self.get_serializer(document).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, partial=False, **kwargs):
        before = self.get_object()
        serializer = self.get_serializer(before, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data:
            return Response(serializer.data)
        with self.unique_key_errors():
            after = self.collection.find_one_and_update(
                {'_id': before['_id']},
                {'$set': dict(serializer.validated_data)},
                return_document=ReturnDocument.AFTER,
            )
        if after is None:
            raise NotFound()
        self.rename_references(before, after)
        return Response(self.get_serializer(after).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, partial=True, **kwargs)

    def destroy(self, request, *args, **kwargs):
        document = self.get_object()
        key = document[self.spec.key[0]]
        for collection, field in schemas.referenced_by(self.collection_name):
            count = get_db()[collection].count_documents({field: key})
            if count:
                raise Conflict(
                    f'{count} record(s) in {collection} still have {field} "{key}". '
                    'Change or delete them first.'
                )
        self.collection.delete_one({'_id': document['_id']})
        return Response(status=status.HTTP_204_NO_CONTENT)

    @contextmanager
    def unique_key_errors(self):
        """Report a clash on the collection's unique key as a 400 error instead of a 500."""
        try:
            yield
        except DuplicateKeyError:
            key = ' and '.join(self.spec.key)
            raise ValidationError({self.spec.key[-1]: [f'A record with this {key} already exists.']}) from None

    def rename_references(self, before, after):
        """When a record's key changes (e.g. an account is renamed), update the records using it."""
        key = self.spec.key[0]
        if before[key] != after[key]:
            for collection, field in schemas.referenced_by(self.collection_name):
                get_db()[collection].update_many({field: before[key]}, {'$set': {field: after[key]}})


class AccountViewSet(MongoViewSet):
    """Customer companies."""

    collection_name = 'accounts'
    serializer_class = AccountSerializer
    filter_fields = ('account', 'sector', 'office_location', 'subsidiary_of')
    range_fields = {'revenue': 'number', 'employees': 'number', 'year_established': 'number'}
    search_fields = ('account',)
    ordering_fields = ('account', 'sector', 'revenue', 'employees', 'year_established')
    ordering = ('account',)


class ProductViewSet(MongoViewSet):
    """Products and their suggested retail prices."""

    collection_name = 'products'
    serializer_class = ProductSerializer
    filter_fields = ('product', 'series')
    range_fields = {'sales_price': 'number'}
    search_fields = ('product', 'series')
    ordering_fields = ('product', 'series', 'sales_price')
    ordering = ('product',)


class SalesTeamViewSet(MongoViewSet):
    """Sales agents, with their manager and regional office."""

    collection_name = 'sales_teams'
    serializer_class = SalesAgentSerializer
    filter_fields = ('sales_agent', 'manager', 'regional_office')
    search_fields = ('sales_agent', 'manager')
    ordering_fields = ('sales_agent', 'manager', 'regional_office')
    ordering = ('sales_agent',)


class SalesPipelineViewSet(MongoViewSet):
    """Sales opportunities and the stage each one has reached."""

    collection_name = 'sales_pipeline'
    serializer_class = OpportunitySerializer
    filter_fields = ('opportunity_id', 'deal_stage', 'sales_agent', 'product', 'account')
    range_fields = {'engage_date': 'date', 'close_date': 'date', 'close_value': 'number'}
    search_fields = ('opportunity_id', 'account', 'sales_agent', 'product')
    ordering_fields = (
        'opportunity_id', 'deal_stage', 'engage_date', 'close_date', 'close_value',
        'account', 'sales_agent', 'product',
    )
    ordering = ('-engage_date',)


class DataDictionaryViewSet(MongoViewSet):
    """What each field of the other collections means."""

    collection_name = 'data_dictionary'
    serializer_class = DataDictionaryEntrySerializer
    filter_fields = ('table', 'field')
    search_fields = ('field', 'description')
    ordering_fields = ('table', 'field')
    # No default ordering: entries come back in the order of data_dictionary.csv.


class AnalyticsViewSet(viewsets.ViewSet):
    """Sales figures for dashboard charts, aggregated by MongoDB from the sales pipeline."""

    @extend_schema(exclude=True)
    def list(self, request):
        return Response({
            'summary': reverse('analytics-summary', request=request),
            'timeline': reverse('analytics-timeline', request=request),
            'breakdown': reverse('analytics-breakdown', request=request),
            'filter_options': reverse('analytics-filter-options', request=request),
        })

    @extend_schema(parameters=[analytics.DealFiltersSerializer], responses=analytics.DealMetricsSerializer)
    @action(detail=False)
    def summary(self, request):
        """Totals for KPI cards: deals per stage, revenue, win rate, average deal size and sales cycle."""
        return Response(analytics.summary(self.validated_query(analytics.DealFiltersSerializer)))

    @extend_schema(
        parameters=[analytics.TimelineParamsSerializer], responses=analytics.TimelinePointSerializer(many=True)
    )
    @action(detail=False)
    def timeline(self, request):
        """The metrics per week, month or quarter, for line and bar charts over time."""
        params = self.validated_query(analytics.TimelineParamsSerializer)
        return Response(analytics.timeline(params, params['interval'], params['date_field']))

    @extend_schema(
        parameters=[analytics.BreakdownParamsSerializer], responses=analytics.BreakdownRowSerializer(many=True)
    )
    @action(detail=False)
    def breakdown(self, request):
        """The metrics per sales agent, product, sector, regional office, ... for bar and pie charts."""
        params = self.validated_query(analytics.BreakdownParamsSerializer)
        return Response(analytics.breakdown(params, params['by'], params.get('ordering'), params.get('limit')))

    @extend_schema(responses=analytics.FilterOptionsSerializer)
    @action(detail=False, url_path='filter-options')
    def filter_options(self, request):
        """The values each chart filter can take, e.g. to fill dashboard dropdowns."""
        return Response(analytics.filter_options())

    def validated_query(self, serializer_class):
        """The request's query parameters, checked by `serializer_class` (invalid ones give a 400 error)."""
        serializer = serializer_class(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data
