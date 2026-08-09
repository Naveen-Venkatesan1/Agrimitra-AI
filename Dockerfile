FROM python:3.11.9-slim

WORKDIR /app

# System dependencies (for OpenCV, Git, and Git LFS)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
# (Models and DB are one directory above backend/api)
COPY backend/ backend/

# Fetch actual LFS models to replace the text pointers copied by Railway
RUN git lfs install && \
    git clone https://github.com/Naveen-Venkatesan1/Agrimitra-AI.git /tmp/repo && \
    cp -r /tmp/repo/backend/models/* backend/models/ && \
    rm -rf /tmp/repo

# Expose port (Documentation purpose)
EXPOSE 8000

# Run uvicorn using the PORT environment variable provided by Railway (or fallback to 8000)
CMD ["sh", "-c", "uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
