#!/bin/bash
#
# OTA Update Client
# 检查并执行 OTA 更新
#

set -euo pipefail

# 配置
OTA_HOST="${OTA_HOST:-www.dreammate.work}"
OTA_PORT="${OTA_PORT:-443}"
OTA_URL="https://${OTA_HOST}/api/ota"
API_PORT="${API_PORT:-1420}"
MAX_RETRIES=3
RETRY_INTERVAL=30

# 设备路径配置
API_BINARY="/opt/iclaw/admin-api"
WEB_DIST_DIR="/opt/iclaw/dist"
SERVICE_NAME="iclaw-manager"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# 获取当前 admin-api 版本
get_current_api_version() {
    if [[ -x "$API_BINARY" ]]; then
        # 尝试获取版本号
        if "$API_BINARY" --version &>/dev/null; then
            "$API_BINARY" --version
        else
            # 从 build info 或其他方式获取
            echo "unknown"
        fi
    else
        echo "not-installed"
    fi
}

# 获取当前前端版本
get_current_web_version() {
    if [[ -d "$WEB_DIST_DIR" ]]; then
        # 从 package.json 获取版本
        if [[ -f "$WEB_DIST_DIR/package.json" ]]; then
            grep '"version"' "$WEB_DIST_DIR/package.json" | cut -d'"' -f4
        else
            echo "unknown"
        fi
    else
        echo "not-installed"
    fi
}

# 检查网络是否就绪
is_network_ready() {
    if ! ip route show default &>/dev/null; then
        return 1
    fi

    if ! curl -s --connect-timeout 3 -k "https://${OTA_HOST}/health" &>/dev/null; then
        return 1
    fi

    return 0
}

# 等待网络就绪
wait_for_network() {
    local attempt=1

    while ! is_network_ready; do
        if [[ $attempt -ge $MAX_RETRIES ]]; then
            error "Network not ready after ${MAX_RETRIES} attempts"
            return 1
        fi

        log "Waiting for network... (${attempt}/${MAX_RETRIES})"
        sleep "$RETRY_INTERVAL"
        ((attempt++))
    done

    return 0
}

# 检查最新版本
check_latest_version() {
    local response
    local status_code

    response=$(curl -s -w "\n%{http_code}" "${OTA_URL}/version/latest" 2>/dev/null) || {
        error "Failed to connect to OTA server"
        return 1
    }

    status_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$status_code" != "200" ]]; then
        error "Failed to check version: HTTP ${status_code}"
        return 1
    fi

    echo "$body"
    return 0
}

# 比较版本 (假设格式为 x.y.z)
is_newer_version() {
    local new_version="$1"
    local current_version="$2"

    # 未知版本认为需要更新
    if [[ "$current_version" == "unknown" ]] || [[ "$current_version" == "not-installed" ]]; then
        return 0
    fi

    # 相同版本不需要更新
    if [[ "$new_version" == "$current_version" ]]; then
        return 1
    fi

    # 使用 sort -V 进行版本比较
    echo -e "${new_version}\n${current_version}" | sort -V | tail -1 | grep -q "^${new_version}$"
}

# 下载并更新 API
update_api() {
    local download_url="${OTA_URL}/download/api"
    local tmp_file="/tmp/admin-api-new"
    local backup_file="${API_BINARY}.bak"

    log "Downloading admin-api update..."

    if ! curl -s -L -o "$tmp_file" "$download_url"; then
        error "Failed to download admin-api"
        return 1
    fi

    # 验证文件
    if ! file "$tmp_file" | grep -q "ELF.*ARM.*64"; then
        error "Downloaded file is not a valid ARM64 ELF binary"
        rm -f "$tmp_file"
        return 1
    fi

    # 备份旧版本
    if [[ -f "$API_BINARY" ]]; then
        log "Backing up current version..."
        cp "$API_BINARY" "$backup_file"
    fi

    # 替换文件
    log "Installing new version..."
    chmod +x "$tmp_file"
    mv "$tmp_file" "$API_BINARY"

    # 重启服务
    log "Restarting ${SERVICE_NAME} service..."
    systemctl restart "$SERVICE_NAME"

    log "API update completed successfully"
    return 0
}

# 下载并更新 Web
update_web() {
    local download_url="${OTA_URL}/download/web"
    local tmp_file="/tmp/web-dist.tar.gz"
    local backup_dir="${WEB_DIST_DIR}.bak"
    local tmp_extract_dir="/tmp/iclaw-dist-new"

    log "Downloading web update..."

    if ! curl -s -L -o "$tmp_file" "$download_url"; then
        error "Failed to download web package"
        return 1
    fi

    # 备份旧版本
    if [[ -d "$WEB_DIST_DIR" ]]; then
        log "Backing up current web..."
        rm -rf "$backup_dir"
        cp -r "$WEB_DIST_DIR" "$backup_dir"
    fi

    # 解压到临时目录
    log "Installing new web..."
    rm -rf "$tmp_extract_dir"
    mkdir -p "$tmp_extract_dir"
    tar -xzf "$tmp_file" -C "$tmp_extract_dir"

    # 替换文件
    rm -rf "$WEB_DIST_DIR"
    mv "$tmp_extract_dir/dist" "$WEB_DIST_DIR"
    rm -rf "$tmp_extract_dir"
    rm -f "$tmp_file"

    log "Web update completed successfully"
    return 0
}

# 主逻辑
main() {
    log "Starting OTA check..."
    log "Current API version: $(get_current_api_version)"
    log "Current Web version: $(get_current_web_version)"

    # 等待网络就绪
    if ! wait_for_network; then
        error "Network not ready, skipping OTA check"
        exit 1
    fi

    # 检查最新版本
    local version_info
    version_info=$(check_latest_version) || {
        error "Failed to check latest version"
        exit 1
    }

    log "Server version info: $version_info"

    # 解析版本信息并比较
    local new_web_version=$(echo "$version_info" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4)
    local new_api_version=$(echo "$version_info" | grep -o '"version":"[^"]*"' | tail -1 | cut -d'"' -f4)

    log "New API version: $new_api_version"
    log "New Web version: $new_web_version"

    # 比较并更新
    local needs_update=0

    if is_newer_version "$new_api_version" "$(get_current_api_version)"; then
        log "API needs update"
        needs_update=1
        update_api || error "API update failed"
    fi

    if is_newer_version "$new_web_version" "$(get_current_web_version)"; then
        log "Web needs update"
        needs_update=1
        update_web || error "Web update failed"
    fi

    if [[ $needs_update -eq 0 ]]; then
        log "No updates available"
    fi

    log "OTA check completed"
}

main "$@"
