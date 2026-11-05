"""The schema of every CRM record.

Each serializer lists the fields of one kind of MongoDB document, their types and
the rules a write must pass. The API validates requests with them, the CSV import
validates rows with them, and schemas.py turns them into the $jsonSchema validator
MongoDB enforces, so all three always agree.
"""

import secrets
import string
from datetime import datetime

from rest_framework import serializers

from .mongo import get_db

DEAL_STAGES = ('Prospecting', 'Engaging', 'Won', 'Lost')

# What each deal stage needs filled in and what it must leave empty, as in the
# source data: deals get an engage date once Engaging, and an account, close date
# and close value once they are Won or Lost.
STAGE_FIELDS = {
    'Prospecting': {'required': (), 'empty': ('engage_date', 'close_date', 'close_value')},
    'Engaging': {'required': ('engage_date',), 'empty': ('close_date', 'close_value')},
    'Won': {'required': ('account', 'engage_date', 'close_date', 'close_value'), 'empty': ()},
    'Lost': {'required': ('account', 'engage_date', 'close_date', 'close_value'), 'empty': ()},
}


class DateField(serializers.DateField):
    """A calendar date, stored as midnight UTC because BSON has no date-only type."""

    def to_internal_value(self, value):
        day = super().to_internal_value(value)
        return datetime(day.year, day.month, day.day)

    def to_representation(self, value):
        if isinstance(value, datetime):
            value = value.date()
        return super().to_representation(value)


class MongoSerializer(serializers.Serializer):
    """Base class: exposes the document's ObjectId as `id` and checks references."""

    id = serializers.CharField(source='_id', read_only=True, help_text='MongoDB ObjectId of the record')

    # Fields that name a record in another collection, as {field: (collection, key field)}.
    # Writes through the API are rejected when that record doesn't exist.
    references = {}

    def validate(self, attrs):
        if self.context.get('check_references', True):
            missing = {
                field: f'No record in {collection} has {key} "{attrs[field]}".'
                for field, (collection, key) in self.references.items()
                if attrs.get(field) is not None
                and not get_db()[collection].count_documents({key: attrs[field]}, limit=1)
            }
            if missing:
                raise serializers.ValidationError(missing)
        return attrs

    def current(self, attrs, field):
        """The value `field` will have after this write; a PATCH only sends what changes."""
        if field in attrs:
            return attrs[field]
        return (self.instance or {}).get(field)


class AccountSerializer(MongoSerializer):
    account = serializers.CharField(max_length=100, help_text='Company name')
    sector = serializers.CharField(max_length=50, help_text='Industry')
    year_established = serializers.IntegerField(min_value=1800, max_value=2100, help_text='Year established')
    revenue = serializers.FloatField(min_value=0, help_text='Annual revenue (in millions of USD)')
    employees = serializers.IntegerField(min_value=0, help_text='Number of employees')
    office_location = serializers.CharField(max_length=100, help_text='Headquarters (country)')
    subsidiary_of = serializers.CharField(
        max_length=100, allow_null=True, default=None, help_text='Parent company (an account name)'
    )

    references = {'subsidiary_of': ('accounts', 'account')}


class ProductSerializer(MongoSerializer):
    product = serializers.CharField(max_length=100, help_text='Product name')
    series = serializers.CharField(max_length=50, help_text='Product series')
    sales_price = serializers.IntegerField(min_value=0, help_text='Suggested retail price')


class SalesAgentSerializer(MongoSerializer):
    sales_agent = serializers.CharField(max_length=100, help_text='Sales agent')
    manager = serializers.CharField(max_length=100, help_text='Respective sales manager')
    regional_office = serializers.CharField(max_length=50, help_text='Regional office')


class OpportunitySerializer(MongoSerializer):
    opportunity_id = serializers.CharField(
        max_length=20, required=False, help_text='Unique identifier; generated if left out'
    )
    sales_agent = serializers.CharField(max_length=100, help_text='Sales agent (from sales teams)')
    product = serializers.CharField(max_length=100, help_text='Product name (from products)')
    account = serializers.CharField(
        max_length=100, allow_null=True, default=None,
        help_text='Company name (from accounts); can be empty while the deal is open',
    )
    deal_stage = serializers.ChoiceField(
        choices=DEAL_STAGES, help_text='Sales pipeline stage (Prospecting > Engaging > Won / Lost)'
    )
    engage_date = DateField(
        allow_null=True, default=None, help_text='Date in which the "Engaging" deal stage was initiated'
    )
    close_date = DateField(allow_null=True, default=None, help_text='Date in which the deal was "Won" or "Lost"')
    close_value = serializers.IntegerField(
        min_value=0, allow_null=True, default=None, help_text='Revenue from the deal'
    )

    references = {
        'sales_agent': ('sales_teams', 'sales_agent'),
        'product': ('products', 'product'),
        'account': ('accounts', 'account'),
    }

    def validate(self, attrs):
        stage = self.current(attrs, 'deal_stage')
        errors = {}
        for field in STAGE_FIELDS[stage]['required']:
            if self.current(attrs, field) is None:
                errors[field] = f'Required when deal_stage is {stage}.'
        for field in STAGE_FIELDS[stage]['empty']:
            if self.current(attrs, field) is not None:
                errors[field] = f'Must be empty when deal_stage is {stage}.'
        engaged, closed = self.current(attrs, 'engage_date'), self.current(attrs, 'close_date')
        if engaged and closed and closed < engaged:
            errors['close_date'] = 'Cannot be earlier than engage_date.'
        if errors:
            raise serializers.ValidationError(errors)
        if not self.instance and not attrs.get('opportunity_id'):
            attrs['opportunity_id'] = new_opportunity_id()
        return super().validate(attrs)


def new_opportunity_id():
    """Eight random capital letters and digits, like the IDs in sales_pipeline.csv."""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))


class DataDictionaryEntrySerializer(MongoSerializer):
    table = serializers.ChoiceField(
        choices=('accounts', 'products', 'sales_teams', 'sales_pipeline'),
        help_text='Collection the field belongs to',
    )
    field = serializers.CharField(max_length=100, help_text='Field name')
    description = serializers.CharField(max_length=500, help_text='What the field holds')
