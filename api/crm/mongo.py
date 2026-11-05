"""MongoDB access for the CRM app."""

from functools import cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from pymongo import MongoClient


@cache
def get_client():
    """The process-wide MongoClient; it is thread-safe and pools its own connections."""
    if '<db_password>' in settings.MONGODB_URI:
        raise ImproperlyConfigured(
            'MONGODB_URI still contains <db_password>: put your Atlas database '
            'password in MONGODB_PASSWORD (in api/.env, or in .env next to compose.yaml under Docker).'
        )
    return MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=10_000, appname='crm-api')


def get_db():
    return get_client()[settings.MONGODB_DB]


class MongoQuery:
    """A lazy find() over one collection that DRF can filter, sort and paginate.

    Django's Paginator only needs count() and slicing, so the standard DRF
    pagination classes work on it unchanged.
    """

    model = None  # tells drf-spectacular there is no Django model behind the view

    def __init__(self, collection_name, filter=None, sort=None):
        self.collection_name = collection_name
        self.filter = filter or {}
        self.sort = sort or [('_id', 1)]

    @property
    def collection(self):
        return get_db()[self.collection_name]

    def where(self, conditions):
        """A copy of this query that must also match `conditions`."""
        combined = {'$and': [self.filter, conditions]} if self.filter else conditions
        return MongoQuery(self.collection_name, combined, self.sort)

    def order_by(self, sort):
        return MongoQuery(self.collection_name, self.filter, sort)

    def count(self):
        return self.collection.count_documents(self.filter)

    def __iter__(self):
        return iter(self.collection.find(self.filter, sort=self.sort))

    def __getitem__(self, key):
        if not isinstance(key, slice) or key.step is not None:
            raise TypeError('MongoQuery only supports slices such as query[20:40].')
        start = key.start or 0
        if key.stop is not None and key.stop <= start:
            return []  # limit(0) would mean "no limit" to MongoDB
        cursor = self.collection.find(self.filter, sort=self.sort, skip=start)
        if key.stop is not None:
            cursor = cursor.limit(key.stop - start)
        return list(cursor)
