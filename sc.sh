#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Updating system packages..."
sudo yum update -y

echo "========================================="
echo "       INSTALLING DOCKER ENGINE          "
echo "========================================="
# Check OS version to determine the correct installation method
if grep -q "Amazon Linux 2023" /etc/os-release; then
    echo "Detected Amazon Linux 2023. Using dnf..."
    sudo dnf install -y docker
else
    echo "Detected Amazon Linux 2. Using amazon-linux-extras..."
    sudo amazon-linux-extras install -y docker
fi

echo "Starting and enabling the Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

echo "Adding the current user to the Docker group..."
sudo usermod -aG docker $USER

echo "========================================="
echo "       INSTALLING DOCKER BUILDX          "
echo "========================================="
# Determine architecture for binary downloads
ARCH=$(uname -m)
case $ARCH in
    x86_64) PLUGIN_ARCH="amd64" ;;
    aarch64) PLUGIN_ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Fetch the latest release version dynamically
BUILDX_VERSION=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

# Fallback to v0.17.1 if GitHub API rate limit is exceeded
if [ -z "$BUILDX_VERSION" ]; then
    BUILDX_VERSION="v0.17.1"
fi

# Install Buildx as a system-wide Docker CLI plugin
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-${PLUGIN_ARCH}" -o /usr/libexec/docker/cli-plugins/docker-buildx
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-buildx

echo "========================================="
echo "       INSTALLING DOCKER COMPOSE         "
echo "========================================="
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "========================================="
echo "       INSTALLING NODE.JS & NPM          "
echo "========================================="
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM directly in the script so we can use it immediately
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install the latest LTS version of Node.js (which includes npm)
nvm install --lts

echo "========================================="
echo "       INSTALLATION COMPLETE!            "
echo "========================================="
docker --version
docker-compose --version
docker buildx version
node -v
npm -v

echo ""
echo "################################################################################"
echo "IMPORTANT FINAL STEPS:"
echo "1. To apply the new Docker permissions, run: newgrp docker"
echo "2. To apply the new NPM/Node variables to your terminal, run: source ~/.bashrc"
echo "################################################################################"

yum install git -y
