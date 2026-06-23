#!/bin/bash

# Target Server Info
SERVER_IP="192.168.1.88"
SERVER_USER="root"
REPO_URL="https://git.joincare.com.cn/Jasper/ai-management-trainee-intro.git"
CONTAINER_NAME="ai-intro-app"
IMAGE_NAME="ai-intro"
PORT_MAPPING="8083:5173"
NETWORK_NAME="infra-net"

echo "==========================================="
echo "Starting deployment to $SERVER_IP..."
echo "Use DEPLOY_SSH_PASSWORD, .deploy.env, or your configured SSH credentials."
echo "==========================================="

if [ -f ".deploy.env" ]; then
    set -a
    # shellcheck source=/dev/null
    source ".deploy.env"
    set +a
fi

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

# Run the commands via SSH. If a local password is configured, use expect so
# deployment stays one-command while keeping the secret out of version control.
SSH_TARGET="$SERVER_USER@$SERVER_IP"

if [ -n "${DEPLOY_SSH_PASSWORD:-}" ]; then
    if ! command -v expect >/dev/null 2>&1; then
        echo "DEPLOY_SSH_PASSWORD is set, but expect is not installed." >&2
        echo "Install expect or unset DEPLOY_SSH_PASSWORD to enter the password manually." >&2
        exit 1
    fi

    export DEPLOY_SSH_PASSWORD REMOTE_COMMANDS SSH_TARGET
    expect <<'EXPECT'
set timeout -1
set pass $env(DEPLOY_SSH_PASSWORD)
set target $env(SSH_TARGET)
set remote_commands $env(REMOTE_COMMANDS)

spawn ssh -t $target $remote_commands
expect {
  -re {Are you sure you want to continue connecting.*} { send "yes\r"; exp_continue }
  -re {(?i)password:} { send "$pass\r"; exp_continue }
  eof
}

catch wait result
exit [lindex $result 3]
EXPECT
else
    ssh -t "$SSH_TARGET" "$REMOTE_COMMANDS"
fi
