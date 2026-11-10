FROM python:3.11-slim-bookworm AS build

COPY --from=ghcr.io/astral-sh/uv:0.13.4 /uv /bin/uv

WORKDIR /app

ENV UV_PYTHON_DOWNLOADS=0

COPY pyproject.toml uv.lock ./

RUN uv sync --locked --no-dev --no-install-project

COPY src/ src/

COPY README.md ./

RUN uv sync --locked --no-dev --no-editable

FROM python:3.11-slim-bookworm AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

COPY --from=build /app/.venv /app/.venv

EXPOSE 8000

CMD ["fastapi", "run", "backend/main.py", "--host", "0.0.0.0", "--port", "8000"]
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]