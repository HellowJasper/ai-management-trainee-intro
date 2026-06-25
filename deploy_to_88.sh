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

MYSQL_APP_PASSWORD=""
if [ -f "/root/middleware-credentials.txt" ]; then
    MYSQL_APP_PASSWORD=\$(awk '/^  otc[[:space:]]*\// {print \$3; exit}' /root/middleware-credentials.txt)
fi

NETWORK_ARGS=""
if docker network inspect $NETWORK_NAME >/dev/null 2>&1; then
    NETWORK_ARGS="--network $NETWORK_NAME"
fi

echo "Running new container..."
docker run -d -p $PORT_MAPPING --restart=always --name $CONTAINER_NAME \$NETWORK_ARGS \\
    -e DATA_BACKEND=mysql \\
    -e MYSQL_HOST=mysql \\
    -e MYSQL_PORT=3306 \\
    -e MYSQL_DATABASE=ai_management_trainee_intro \\
    -e MYSQL_USER=otc \\
    -e MYSQL_PASSWORD="\$MYSQL_APP_PASSWORD" \\
    $IMAGE_NAME:latest

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
