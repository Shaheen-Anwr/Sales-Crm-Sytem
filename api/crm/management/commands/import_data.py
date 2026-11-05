"""Load the CRM CSV files into MongoDB.

    python manage.py import_data           # insert new rows and update changed ones
    python manage.py import_data --drop    # delete the collections first, then import

Every row is checked with the same serializers the API uses before anything is
written. Rows are matched on their natural key (opportunity_id, account name, ...),
so running the import again updates records instead of duplicating them.
"""

import csv
from collections import Counter
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError
from pymongo import ReplaceOne
from pymongo.errors import ConfigurationError, OperationFailure, ServerSelectionTimeoutError

from crm.mongo import get_db
from crm.schemas import COLLECTIONS

# Typos in the source CSVs, corrected on import: {collection: {field: {wrong: right}}}.
FIXES = {
    'sales_pipeline': {'product': {'GTXPro': 'GTX Pro'}},  # products.csv calls it "GTX Pro"
    'accounts': {
        'sector': {'technolgy': 'technology'},
        'office_location': {'Philipines': 'Philippines'},
    },
}

UNAUTHORIZED = 13  # MongoDB error code


class Command(BaseCommand):
    help = 'Import accounts, products, sales teams, the sales pipeline and the data dictionary into MongoDB.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-dir', type=Path, default=settings.BASE_DIR / 'data',
            help='Folder with the CSV files (default: api/data).',
        )
        parser.add_argument('--drop', action='store_true', help='Delete the CRM collections before importing.')

    def handle(self, *args, data_dir, drop, **options):
        documents = {collection.name: self.read(collection, data_dir) for collection in COLLECTIONS}
        self.check_references(documents)
        db = self.connect()
        for collection in COLLECTIONS:
            self.write(db, collection, documents[collection.name], drop)
        self.stdout.write(self.style.SUCCESS(f'Import finished, the data is in the "{db.name}" database.'))

    def read(self, collection, data_dir):
        """Parse and validate one CSV file into documents ready for MongoDB."""
        path = data_dir / f'{collection.name}.csv'
        if not path.is_file():
            raise CommandError(f'{path} not found. Use --data-dir to point at the folder with the CSV files.')
        fixes, fixed = FIXES.get(collection.name, {}), Counter()
        rows, lines = [], []
        with path.open(newline='', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            for raw in reader:
                # Lower-case the headers (data_dictionary.csv uses "Table,Field,...") and store blank cells as null.
                row = {key.strip().lower(): (value or '').strip() or None for key, value in raw.items() if key}
                for field, corrections in fixes.items():
                    if row.get(field) in corrections:
                        fixed[field, row[field], corrections[row[field]]] += 1
                        row[field] = corrections[row[field]]
                rows.append(row)
                lines.append(reader.line_num)

        serializer = collection.serializer(data=rows, many=True, context={'check_references': False})
        if not serializer.is_valid():
            problems = [
                f'  line {line}: '
                + '; '.join(f'{field}: {" ".join(map(str, messages))}' for field, messages in errors.items())
                for line, errors in zip(lines, serializer.errors, strict=True)
                if errors
            ]
            more = [f'  ... and {len(problems) - 20} more'] if len(problems) > 20 else []
            raise CommandError(
                f'{path.name} has {len(problems)} invalid row(s), nothing was imported:\n'
                + '\n'.join(problems[:20] + more)
            )

        notes = ''.join(
            f'; fixed {field} "{wrong}" -> "{right}" in {count} row{"s" if count > 1 else ""}'
            for (field, wrong, right), count in fixed.items()
        )
        self.stdout.write(f'{path.name}: {len(rows)} rows OK{notes}')
        return [dict(document) for document in serializer.validated_data]

    def check_references(self, documents):
        """Make sure every row points at records that exist, before anything is written."""
        keys = {
            collection.name: {document[collection.key[0]] for document in documents[collection.name]}
            for collection in COLLECTIONS
        }
        problems = []
        for collection in COLLECTIONS:
            for field, (target, _) in collection.serializer.references.items():
                missing = Counter(
                    document[field]
                    for document in documents[collection.name]
                    if document[field] is not None and document[field] not in keys[target]
                )
                problems += [
                    f'  {collection.name}.{field} "{value}" ({count} rows) is not in {target}'
                    for value, count in missing.items()
                ]
        if problems:
            raise CommandError('Some rows point at records that do not exist, nothing was imported:\n' + '\n'.join(problems))

    def connect(self):
        try:
            db = get_db()
            db.command('ping')
        except ImproperlyConfigured as error:
            raise CommandError(str(error)) from None
        except ConfigurationError as error:
            raise CommandError(f'The MongoDB connection string (MONGODB_URI) is not valid: {error}') from None
        except ServerSelectionTimeoutError as error:
            raise CommandError(
                f'Could not reach MongoDB: {str(error).split(", Timeout:")[0]}\n'
                'On Atlas, add your IP address under Security > Network Access.'
            ) from None
        except OperationFailure as error:
            raise CommandError(
                f'MongoDB refused the login: {error}\n'
                "Check MONGODB_PASSWORD: it is the database user's password (Atlas > Database Access)."
            ) from None
        self.stdout.write(f'Connected to MongoDB, database "{db.name}".')
        return db

    def write(self, db, collection, documents, drop):
        if drop:
            db.drop_collection(collection.name)
        self.apply_schema(db, collection)
        db[collection.name].create_indexes(collection.all_indexes)

        # Only write rows that are new or differ from what is stored, so a repeated
        # import is fast and reports honestly what changed.
        def key(document):
            return tuple(document[field] for field in collection.key)

        stored = {key(document): document for document in db[collection.name].find({}, {'_id': False})}
        changed = [document for document in documents if stored.get(key(document)) != document]
        inserted = 0
        if changed:
            result = db[collection.name].bulk_write([
                ReplaceOne({field: document[field] for field in collection.key}, document, upsert=True)
                for document in changed
            ])
            inserted = result.upserted_count
        self.stdout.write(
            f'{collection.name}: {inserted} inserted, {len(changed) - inserted} updated, '
            f'{len(documents) - len(changed)} unchanged'
        )

    def apply_schema(self, db, collection):
        """Create the collection with its $jsonSchema validator, or refresh the validator."""
        info = next(db.list_collections(filter={'name': collection.name}), None)
        if info is None:
            db.create_collection(collection.name, validator=collection.validator)
            return
        if info.get('options', {}).get('validator') == collection.validator:
            return
        try:
            db.command('collMod', collection.name, validator=collection.validator)
        except OperationFailure as error:
            if error.code != UNAUTHORIZED:
                raise
            self.stdout.write(self.style.WARNING(
                f'{collection.name}: this database user may not change the validator of an existing '
                'collection, so its stored schema was left as it was. Run with --drop to recreate it.'
            ))
