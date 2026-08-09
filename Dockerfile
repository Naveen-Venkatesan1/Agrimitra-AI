FROM python:3.11.9-slim

WORKDIR /app

# System dependencies (for OpenCV if needed by Pillow/Keras)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
# (Models and DB are one directory above backend/api)
COPY backend/ backend/

# Expose port
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
