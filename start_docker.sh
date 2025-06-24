#!/bin/bash

CONTAINER_NAME="node_backend"

echo "🔁 Stopping and removing any existing container named $CONTAINER_NAME..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "🔨 Building and starting the Docker container in detached mode..."
docker-compose up --build -d

echo "✅ Container started in background (detached mode)."
echo "🌐 Visit http://localhost:4000 or run 'docker logs -f $CONTAINER_NAME' to view logs."
