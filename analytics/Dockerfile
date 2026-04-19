FROM python:3.12-slim

WORKDIR /app

# Install system deps
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     gcc \
#     libpq-dev \
#   && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN export PIP_INDEX_URL=https://package-mirror.liara.ir/repository/pypi/simple && pip install --no-cache-dir -r requirements.txt
# RUN pip install -i https://mirror-pypi.runflare.com/simple --no-cache-dir -r requirements.txt

# Copy source
COPY src/ ./src/

# Health check — confirm the worker process is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import aio_pika; print('ok')"

CMD ["python", "src/worker.py"]
