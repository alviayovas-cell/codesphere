# CodeSphere backend - FastAPI API + RQ worker share this image; which one
# runs is decided by the command each service passes (see docker-compose.yml
# and "Production Deployment" in the root README).
FROM python:3.12-slim AS base

WORKDIR /app

# Only what's needed to build the wheels this project actually uses
# (bcrypt, pydantic-core) - kept minimal to keep the image small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Runs as a non-root user - defense in depth, not that this process ever
# touches the filesystem beyond its own code.
RUN useradd --create-home --shell /bin/bash codesphere
USER codesphere

EXPOSE 8000

# Single worker process by default - see the README's Phase 14 notes on
# why (the run/submit rate limiter is in-process state; Run/Submit
# throughput itself scales via more `worker` service replicas instead,
# which is where the actual grading work happens). Load-tested to handle
# 60 concurrent students comfortably at this concurrency (see README).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
