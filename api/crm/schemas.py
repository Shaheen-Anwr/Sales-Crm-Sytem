"""The MongoDB collections behind the CRM API.

For each collection: the serializer that defines its documents, its natural key
(unique, and used to match rows when the CSVs are imported again) and its indexes.
The $jsonSchema validator MongoDB enforces is generated from the serializer, so the
database checks the same field types and limits as the API.
"""

from dataclasses import dataclass

from pymongo import ASCENDING, DESCENDING, IndexModel
from rest_framework import serializers

from .serializers import (
    AccountSerializer,
    DataDictionaryEntrySerializer,
    OpportunitySerializer,
    ProductSerializer,
    SalesAgentSerializer,
)


@dataclass(frozen=True)
class Collection:
    name: str
    serializer: type[serializers.Serializer]
    key: tuple[str, ...]
    indexes: tuple[IndexModel, ...] = ()

    @property
    def validator(self):
        return {'$jsonSchema': json_schema(self.serializer())}

    @property
    def all_indexes(self):
        unique_key = IndexModel([(field, ASCENDING) for field in self.key], unique=True)
        return [unique_key, *self.indexes]


# Each collection comes after the collections it references.
COLLECTIONS = (
    Collection('products', ProductSerializer, key=('product',), indexes=(IndexModel('series'),)),
    Collection(
        'sales_teams', SalesAgentSerializer, key=('sales_agent',),
        indexes=(IndexModel('manager'), IndexModel('regional_office')),
    ),
    Collection(
        'accounts', AccountSerializer, key=('account',),
        indexes=(IndexModel('sector'), IndexModel('subsidiary_of')),
    ),
    Collection(
        'sales_pipeline', OpportunitySerializer, key=('opportunity_id',),
        indexes=(
            IndexModel('sales_agent'),
            IndexModel('product'),
            IndexModel('account'),
            IndexModel('engage_date'),
            IndexModel([('deal_stage', ASCENDING), ('close_date', DESCENDING)]),
        ),
    ),
    Collection('data_dictionary', DataDictionaryEntrySerializer, key=('table', 'field')),
)

BY_NAME = {collection.name: collection for collection in COLLECTIONS}


def referenced_by(name):
    """The (collection, field) pairs that point at records of `name` by their key."""
    return [
        (collection.name, field)
        for collection in COLLECTIONS
        for field, (target, _) in collection.serializer.references.items()
        if target == name
    ]


# The BSON types each kind of serializer field is stored as; the first match wins.
BSON_TYPES = (
    (serializers.IntegerField, ['int', 'long']),
    (serializers.FloatField, ['double', 'int', 'long']),
    (serializers.DateField, ['date']),
    (serializers.ChoiceField, ['string']),
    (serializers.CharField, ['string']),
)


def json_schema(serializer):
    """A MongoDB $jsonSchema describing the documents `serializer` writes."""
    properties = {}
    for field in serializer.fields.values():
        if field.read_only:
            continue
        types = next(types for cls, types in BSON_TYPES if isinstance(field, cls))
        rules = {'bsonType': types + ['null'] if field.allow_null else types}
        if isinstance(field, serializers.ChoiceField):
            rules['enum'] = list(field.choices) + ([None] if field.allow_null else [])
        for option, keyword in (('min_value', 'minimum'), ('max_value', 'maximum'), ('max_length', 'maxLength')):
            if getattr(field, option, None) is not None:
                rules[keyword] = getattr(field, option)
        if field.help_text:
            rules['description'] = str(field.help_text)
        properties[field.source] = rules
    # Every field is stored on every document, with null for empty values.
    return {'bsonType': 'object', 'required': list(properties), 'properties': properties}
