#!/bin/sh
# Prepares the API in its container, then runs the command (gunicorn by default).
set -e

# Django's own tables (admin users, sessions) live in SQLite inside the container.
python manage.py migrate --noinput

# Load the CSVs in data/ into MongoDB. The import writes only rows that are new or
# changed, so running it on every start is safe. SEED_DATA=false skips it.
if [ "${SEED_DATA:-true}" = "true" ]; then
    python manage.py import_data
fi

exec "$@"
