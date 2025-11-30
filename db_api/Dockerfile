# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (Docker layer caching optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the API server code
COPY api_server.py .

# Cloud Run uses PORT environment variable
# We'll modify api_server.py to read this
EXPOSE 8080

# Run the application
CMD ["python", "api_server.py"]