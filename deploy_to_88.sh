#!/bin/bash

# Target Server Info
SERVER_IP="192.168.1.88"
SERVER_USER="root"
REPO_URL="https://git.joincare.com.cn/Jasper/ai-management-trainee-intro.git"
CONTAINER_NAME="ai-intro-app"
IMAGE_NAME="ai-intro"
PORT_MAPPING="8083:80"
NETWORK_NAME="infra-net"

echo "==========================================="
echo "Starting deployment to $SERVER_IP..."
echo "Password: Joinds2025 (Please copy this now)"
echo "==========================================="

# Commands to run on the server
REMOTE_COMMANDS=$(cat <<EOF
if [ ! -d "ai-management-trainee-intro" ]; then
    echo "Cloning repository..."
    git clone $REPO_URL
else
    echo "Repository already exists. Pulling latest changes..."
    cd ai-management-trainee-intro
    git pull
    cd ..
fi

cd ai-management-trainee-intro

echo "Building Docker image..."
docker build -t $IMAGE_NAME:latest .

echo "Cleaning up old container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Running new container..."
docker run -d -p $PORT_MAPPING --restart=always --name $CONTAINER_NAME $IMAGE_NAME:latest

# Connect to the unified network if it exists
if docker network inspect $NETWORK_NAME >/dev/null 2>&1; then
    echo "Connecting container to $NETWORK_NAME network..."
    docker network connect $NETWORK_NAME $CONTAINER_NAME 2>/dev/null || true
fi

echo "Deployment complete!"
EOF
)

# Run the commands via SSH
ssh -t "$SERVER_USER@$SERVER_IP" "$REMOTE_COMMANDS"
