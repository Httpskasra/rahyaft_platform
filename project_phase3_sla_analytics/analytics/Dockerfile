# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/

FROM base AS dev
CMD ["python", "src/worker.py"]

FROM base AS prod
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "from pathlib import Path; import sys; c=Path('/proc/1/cmdline').read_bytes(); sys.exit(0 if b'python' in c else 1)"
CMD ["python", "src/worker.py"]
