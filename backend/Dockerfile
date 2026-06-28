FROM python:3.12-slim
WORKDIR /code
RUN pip install --no-cache-dir uv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
EXPOSE 8000
# Run migrations, then start uvicorn. Binds $PORT (Render injects it; defaults to 8000
# locally). exec-form sh -c so the shell expands $PORT and parses && reliably.
# docker-compose overrides this command for the `api` service, so dev is unaffected.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
