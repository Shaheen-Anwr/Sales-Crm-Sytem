"""Query-string filtering, search and ordering for the MongoDB viewsets."""

import math
import re
from datetime import date, datetime

from rest_framework.exceptions import ValidationError
from rest_framework.filters import BaseFilterBackend


class MongoFilterBackend(BaseFilterBackend):
    """Builds the MongoDB filter and sort from options declared on the view.

    filter_fields    exact match, e.g. ?sector=retail; repeat it to match any of several values
    range_fields     {field: 'number' or 'date'}, e.g. ?revenue__gte=1000&close_date__lte=2017-06-30
    search_fields    case-insensitive "contains" match on any of them: ?search=acme
    ordering_fields  fields allowed in ?ordering=-revenue,account (- means descending)
    ordering         the sort used when ?ordering is not given
    """

    def filter_queryset(self, request, queryset, view):
        params = request.query_params
        conditions = []
        for field in view.filter_fields:
            values = [value for value in params.getlist(field) if value]
            if values:
                conditions.append({field: values[0] if len(values) == 1 else {'$in': values}})
        for field, kind in view.range_fields.items():
            for suffix, operator in (('__gte', '$gte'), ('__lte', '$lte')):
                param = field + suffix
                if params.get(param):
                    conditions.append({field: {operator: parse_bound(kind, param, params[param])}})
        term = params.get('search', '').strip()
        if term and view.search_fields:
            pattern = {'$regex': re.escape(term), '$options': 'i'}
            conditions.append({'$or': [{field: pattern} for field in view.search_fields]})
        if conditions:
            queryset = queryset.where(conditions[0] if len(conditions) == 1 else {'$and': conditions})
        return queryset.order_by(self.get_sort(request, view))

    def get_sort(self, request, view):
        sort = {}
        for term in request.query_params.get('ordering', '').split(','):
            field, direction = sort_key(term.strip())
            if field in view.ordering_fields:
                sort.setdefault(field, direction)
        if not sort:
            sort = dict(sort_key(term) for term in view.ordering)
        return [*sort.items(), ('_id', 1)]  # _id breaks ties, so pages never overlap

    def get_schema_operation_parameters(self, view):
        def parameter(name, description, schema):
            return {'name': name, 'in': 'query', 'required': False, 'description': description, 'schema': schema}

        parameters = [
            parameter(
                field, f'Only records with this {field}. Repeat it to match any of several values.',
                {'type': 'array', 'items': {'type': 'string'}},
            )
            for field in view.filter_fields
        ]
        for field, kind in view.range_fields.items():
            schema = {'type': 'string', 'format': 'date'} if kind == 'date' else {'type': 'number'}
            parameters.append(parameter(f'{field}__gte', f'Minimum {field} (inclusive).', schema))
            parameters.append(parameter(f'{field}__lte', f'Maximum {field} (inclusive).', schema))
        if view.search_fields:
            fields = ', '.join(view.search_fields)
            parameters.append(parameter('search', f'Case-insensitive text search in {fields}.', {'type': 'string'}))
        if view.ordering_fields:
            fields = ', '.join(view.ordering_fields)
            description = f'Sort by {fields}. Prefix a field with - for descending; separate several with commas.'
            parameters.append(parameter('ordering', description, {'type': 'string'}))
        return parameters


def sort_key(term):
    return term.lstrip('-'), -1 if term.startswith('-') else 1


def parse_bound(kind, param, raw):
    """Parse the value of a __gte / __lte parameter, or fail with a 400 error."""
    try:
        if kind == 'date':
            day = date.fromisoformat(raw)
            return datetime(day.year, day.month, day.day)
        number = float(raw)
        if math.isfinite(number):
            return number
    except ValueError:
        pass
    expected = 'a date as YYYY-MM-DD' if kind == 'date' else 'a number'
    raise ValidationError({param: f'Enter {expected}.'})
