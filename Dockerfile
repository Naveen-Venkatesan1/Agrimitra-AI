FROM python:3.11.9-slim

WORKDIR /app

# System dependencies (for OpenCV)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files (models excluded by .dockerignore)
COPY backend/ backend/
RUN mkdir -p backend/models

# Expose port (Documentation purpose)
EXPOSE 8000

# Run uvicorn using the PORT environment variable provided by Railway (or fallback to 8000)
CMD ["sh", "-c", "uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
