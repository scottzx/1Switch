#!/bin/bash
#
# release.sh - 本地编译并发布 OTA 版本
# 用法: ./release.sh [version]
# 示例: ./release.sh v2026.3.23-9
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
SSH_KEY="$PROJECT_DIR/macOS.pem"
SERVER="root@49.235.24.95"
SERVER_DIR="/var/www/ota/releases"
GITHUB_REPO="scottzx/iclaw-manager"
BUILD_DIR="$PROJECT_DIR/.release"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"; }
error(){ echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1" >&2; exit 1; }

# 检查参数
if [ -z "$1" ]; then
    echo "用法: $0 <version>"
    echo "示例: $0 v2026.3.23-9"
    exit 1
fi

VERSION="$1"
ADMIN_API_VERSION="$VERSION"  # 保留 v 前缀

log "==> 开始发布 $VERSION"

# 切换到项目目录
cd "$PROJECT_DIR"

# 检查 SSH 密钥
if [ ! -f "$SSH_KEY" ]; then
    error "SSH 密钥不存在: $SSH_KEY"
fi

# 创建构建目录
mkdir -p "$BUILD_DIR/$VERSION"

# ========== 1. 构建前端 ==========
log "==> [1/5] 构建前端..."
cd "$PROJECT_DIR"

# 清理旧构建
rm -rf dist/
rm -f dist.zip

# 安装依赖
npm ci --silent 2>/dev/null || npm install --silent 2>/dev/null

# 构建
npm run build

# 注入版本号
sed -i '' "s/{{VERSION}}/${VERSION}/g" dist/index.html
log "    前端版本: $(grep -o 'data-version="[^"]*"' dist/index.html)"

# 打包
cd dist
zip -r ../dist.zip .
cd ..

log "    dist.zip 大小: $(du -sh dist.zip | cut -f1)"

# ========== 2. 构建 admin-api ==========
log "==> [2/5] 构建 admin-api (Linux ARM64)..."

# 更新版本号
sed -i '' "s/const Version = \".*\"/const Version = \"${ADMIN_API_VERSION}\"/" cmd/admin-api/main.go
log "    admin-api 版本: $(grep 'const Version' cmd/admin-api/main.go)"

# 编译
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o admin-api ./cmd/admin-api

log "    admin-api 大小: $(du -sh admin-api | cut -f1)"
file admin-api

# ========== 3. 复制到构建目录 ==========
log "==> [3/5] 准备发布文件..."
cp dist.zip "$BUILD_DIR/$VERSION/"
cp admin-api "$BUILD_DIR/$VERSION/"
ls -lh "$BUILD_DIR/$VERSION/"

# ========== 4. 上传到服务器 ==========
log "==> [4/5] 上传到服务器..."
ssh -i "$SSH_KEY" "$SERVER" "mkdir -p ${SERVER_DIR}/${VERSION}"
scp -i "$SSH_KEY" "$BUILD_DIR/$VERSION/admin-api" "$BUILD_DIR/$VERSION/dist.zip" "$SERVER:${SERVER_DIR}/${VERSION}/"
ssh -i "$SSH_KEY" "$SERVER" "chmod +x ${SERVER_DIR}/${VERSION}/admin-api"
log "    服务器: https://www.dreammate.work/ota/releases/${VERSION}/"

# ========== 5. 上传到 GitHub ==========
log "==> [5/5] 上传到 GitHub..."

# 检查 release 是否存在
if gh release view "$VERSION" --repo "$GITHUB_REPO" &>/dev/null; then
    log "    Release 已存在，更新文件..."
    gh release upload "$VERSION" "$BUILD_DIR/$VERSION/admin-api" "$BUILD_DIR/$VERSION/dist.zip" --clobber --repo "$GITHUB_REPO"
else
    log "    创建新 Release..."
    gh release create "$VERSION" --title "$VERSION" --notes "iClaw OTA 版本" --target main "$BUILD_DIR/$VERSION/admin-api" "$BUILD_DIR/$VERSION/dist.zip" --repo "$GITHUB_REPO"
fi

log "    GitHub: https://github.com/${GITHUB_REPO}/releases/tag/${VERSION}"

# ========== 完成 ==========
echo ""
log "=========================================="
log "  发布完成!"
log "=========================================="
echo ""
log "  版本: $VERSION"
log "  服务器: https://www.dreammate.work/ota/releases/${VERSION}/"
log "  GitHub: https://github.com/${GITHUB_REPO}/releases/tag/${VERSION}"
echo ""
