# The Django API, served by gunicorn. compose.yaml in the project folder runs it
# together with MongoDB and the dashboard.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
# Gather the admin's and the browsable API's static files for WhiteNoise, and run
# as an unprivileged user that can still write the SQLite database in /app.
RUN python manage.py collectstatic --noinput \
    && useradd --uid 10001 --no-create-home app \
    && chown -R app /app
USER app

EXPOSE 8000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
# No access log: the health checks would fill it. To see every request, set
# GUNICORN_CMD_ARGS="--access-logfile -" on the api service.
CMD ["gunicorn", "config.wsgi", "--bind", "0.0.0.0:8000", "--workers", "3", "--no-control-socket"]
