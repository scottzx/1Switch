#!/bin/bash
#
# Device Registration Client
# 设备启动时向注册中心上报信息
# - 先等待网络就绪
# - 上报成功后退出
# - 由 systemd timer 每天触发一次
#

set -euo pipefail

# 配置
REGISTRY_HOST="${REGISTRY_HOST:-www.dreammate.work}"
REGISTRY_PORT="${REGISTRY_PORT:-443}"
REGISTRY_URL="https://${REGISTRY_HOST}/api/register"
NETWORK_CHECK_INTERVAL=10
MAX_RETRIES=30  # 最多等待 5 分钟 (30 * 10s)

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# 检查网络是否就绪（有默认路由且能连通外网）
is_network_ready() {
    # 检查是否有默认路由
    if ! ip route show default &>/dev/null; then
        return 1
    fi

    # 检查是否能访问注册服务器
    if ! curl -s --connect-timeout 3 -k "https://${REGISTRY_HOST}/health" &>/dev/null; then
        return 1
    fi

    return 0
}

# 等待网络就绪
wait_for_network() {
    local attempt=1

    while ! is_network_ready; do
        if [[ $attempt -ge $MAX_RETRIES ]]; then
            error "Network not ready after ${MAX_RETRIES} attempts (${NETWORK_CHECK_INTERVAL}s each)"
            return 1
        fi

        log "Waiting for network... (${attempt}/${MAX_RETRIES})"
        sleep "$NETWORK_CHECK_INTERVAL"
        ((attempt++))
    done

    log "Network is ready"
    return 0
}

# 获取 MAC 地址 (有线网卡的 MAC)
get_mac() {
    local mac

    # 优先获取 end0 或 eth0 的 MAC
    for iface in end0 eth0 en0 en1 enp0s1; do
        if mac=$(cat "/sys/class/net/${iface}/address" 2>/dev/null); then
            echo "$mac"
            return 0
        fi
    done

    # Fallback: 使用 ip link
    mac=$(ip link show 2>/dev/null | grep -oE '([0-9a-f]{2}:){5}[0-9a-f]{2}' | head -1)
    if [[ -n "$mac" ]]; then
        echo "$mac"
        return 0
    fi

    return 1
}

# 获取 IP 地址
get_ip() {
    local ip

    # 优先获取 end0 或 eth0 的 IP
    for iface in end0 eth0 en0 en1 enp0s1; do
        ip=$(ip -4 addr show "${iface}" 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
        if [[ -n "$ip" ]]; then
            echo "$ip"
            return 0
        fi
    done

    # Fallback: 使用 hostname -I
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "$ip" ]]; then
        echo "$ip"
        return 0
    fi

    return 1
}

# 获取 hostname
get_hostname() {
    hostname
}

# 注册设备
register() {
    local mac ip hostname

    mac=$(get_mac)
    ip=$(get_ip)
    hostname=$(get_hostname)

    if [[ -z "$mac" ]] || [[ -z "$ip" ]] || [[ -z "$hostname" ]]; then
        error "Failed to get device info"
        return 1
    fi

    log "Registering device: mac=${mac}, ip=${ip}, hostname=${hostname}"

    local payload
    payload=$(printf '{"mac":"%s","ip":"%s","hostname":"%s"}' "$mac" "$ip" "$hostname")

    local response
    local status_code

    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null) || {
        error "Failed to connect to registry at ${REGISTRY_URL}"
        return 1
    }

    status_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$status_code" == "200" ]]; then
        log "Device registered successfully"
        return 0
    else
        error "Registration failed: HTTP ${status_code}, body: ${body}"
        return 1
    fi
}

# 主逻辑
main() {
    log "Starting device registration..."

    # 等待网络就绪
    if ! wait_for_network; then
        error "Network check failed, exiting"
        exit 1
    fi

    # 注册
    register
}

main "$@"
