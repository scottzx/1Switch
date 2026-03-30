#!/bin/bash
set -e

# 编译目标配置
GOOS=linux
GOARCH=arm64
BINARY_NAME=admin-api
DEPLOY_DIR="/Users/scott/Documents/01-开发项目/AI应用/iclaw/iclaw-deploy/iclaw-manager"

echo "=== 开始编译: ${GOOS}/${GOARCH} ==="

# 1. 清理旧构建
echo "[1/4] 清理旧构建..."
rm -rf dist/
rm -rf bin/
rm -f "${DEPLOY_DIR:?}/dist" "${DEPLOY_DIR:?}/${BINARY_NAME}" "${DEPLOY_DIR:?}/admin-api" 2>/dev/null || true

# 2. 编译前端
echo "[2/4] 编译前端 (Vite)..."
npm run build

# 3. 编译后端 Go (Linux ARM64)
echo "[3/4] 编译后端 (Go ${GOOS}/${GOARCH})..."
GOOS=${GOOS} GOARCH=${GOARCH} go build -o bin/${BINARY_NAME} ./cmd/admin-api

# 4. 复制到部署目录
echo "[4/4] 复制到部署目录..."
mkdir -p "${DEPLOY_DIR}"

# 复制前端
cp -r dist/ "${DEPLOY_DIR}/"

# 复制后端
cp bin/${BINARY_NAME} "${DEPLOY_DIR}/"

# 复制 index.html (如果需要)
cp index.html "${DEPLOY_DIR}/" 2>/dev/null || true

echo ""
echo "=== 编译完成 ==="
echo "部署目录: ${DEPLOY_DIR}"
echo "前端: ${DEPLOY_DIR}/dist/"
echo "后端: ${DEPLOY_DIR}/${BINARY_NAME}"

# 验证文件
echo ""
echo "验证构建文件:"
file "${DEPLOY_DIR}/${BINARY_NAME}"
du -sh "${DEPLOY_DIR}/dist/"
