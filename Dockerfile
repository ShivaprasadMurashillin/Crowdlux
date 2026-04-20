# Stage 1: Build the React Frontend
FROM node:20 AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the FastAPI Backend & Serve Frontend
FROM python:3.11-slim
WORKDIR /app

# Ensure tzdata is installed if required for time operations, plus clean up
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
ENV TZ=UTC

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source
COPY backend/ .

# Copy the built React app into the static folder
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
