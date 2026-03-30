#!/bin/bash
#
# deploy-ota.sh - 从 GitHub 下载最新 release 并上传到服务器
# 用法: ./deploy-ota.sh [version]
#

set -e

VERSION="${1:-latest}"
SSH_KEY="/Users/scott/Documents/01-开发项目/AI应用/iclaw/iclaw-manager/macOS.pem"
SERVER="root@49.235.24.95"
SERVER_DIR="/var/www/ota/releases"
TMP_DIR="/tmp/ota-deploy-$$"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1" >&2
}

# 检查 SSH 密钥
if [ ! -f "$SSH_KEY" ]; then
    error "SSH 密钥不存在: $SSH_KEY"
    exit 1
fi

log "==> 下载 Release $VERSION ..."

# 创建临时目录
mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

# 下载 release assets
if [ "$VERSION" = "latest" ]; then
    log "下载最新版本..."
    gh release download --repo scottzx/iclaw-manager -p "admin-api" -p "dist.zip" -D .
else
    log "下载版本 $VERSION ..."
    gh release download --repo scottzx/iclaw-manager "$VERSION" -p "admin-api" -p "dist.zip" -D .
fi

log "下载完成: $(ls -lh)"

# 创建服务器目录
log "==> 上传到服务器..."
VERSION_NAME=$(gh release view --json tagName --jq '.tagName' "${VERSION}" 2>/dev/null || echo "$VERSION")
log "版本: $VERSION_NAME"

ssh -i "$SSH_KEY" "$SERVER" "mkdir -p ${SERVER_DIR}/${VERSION_NAME}"

# 上传文件
scp -i "$SSH_KEY" admin-api dist.zip "$SERVER:${SERVER_DIR}/${VERSION_NAME}/"

# 验证
ssh -i "$SSH_KEY" "$SERVER" "ls -la ${SERVER_DIR}/${VERSION_NAME}/"

# 清理
cd /
rm -rf "$TMP_DIR"

log "==> 完成!"
log "下载地址: https://www.dreammate.work/ota/releases/${VERSION_NAME}/"
