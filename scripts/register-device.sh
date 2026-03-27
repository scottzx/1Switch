#!/bin/bash
#
# Device Registration Client
# 设备启动时向注册中心上报信息
# - 先等待网络就绪
# - 上报成功后退出
# - 由 systemd timer 每天触发一次
#

set -euo pipefail

# ========== 配置 ==========
REGISTRY_HOST="${REGISTRY_HOST:-www.dreammate.work}"
REGISTRY_PORT="${REGISTRY_PORT:-443}"
REGISTRY_URL="https://${REGISTRY_HOST}/api/register"
NETWORK_CHECK_INTERVAL=10
MAX_RETRIES=30
MAX_REGISTER_RETRIES=3
REGISTER_RETRY_DELAY=5
CACHE_FILE="/var/lib/iclaw/registration_cache.json"

# ========== 日志函数 ==========
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEBUG: $*" >&2
    fi
}

# ========== 网络检测 ==========
is_network_ready() {
    # 检查是否有默认路由
    if ! ip route show default &>/dev/null; then
        debug "No default route"
        return 1
    fi

    # 检查 DNS 解析
    if ! nslookup "${REGISTRY_HOST}" &>/dev/null && ! getent hosts "${REGISTRY_HOST}" &>/dev/null; then
        debug "DNS resolution failed for ${REGISTRY_HOST}"
        return 1
    fi

    # 检查是否能访问注册服务器
    if ! curl -s --connect-timeout 3 -k "https://${REGISTRY_HOST}/health" &>/dev/null; then
        debug "Cannot reach ${REGISTRY_HOST}"
        return 1
    fi

    return 0
}

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

# ========== 设备信息获取 ==========

# 获取 MAC 地址
get_mac() {
    local mac
    for iface in end0 eth0 en0 en1 enp0s1; do
        if mac=$(cat "/sys/class/net/${iface}/address" 2>/dev/null); then
            echo "$mac" | tr '[:lower:]' '[:upper:]'
            return 0
        fi
    done

    mac=$(ip link show 2>/dev/null | grep -oE '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}' | head -1)
    if [[ -n "$mac" ]]; then
        echo "$mac" | tr '[:lower:]' '[:upper:]'
        return 0
    fi

    return 1
}

# 获取序列号
get_serial() {
    local serial

    # 优先读取静态文件（install.sh 生成）
    if [[ -f /var/lib/iclaw/serial ]]; then
        serial=$(cat /var/lib/iclaw/serial | tr -d '[:space:]\0' | head -c 64)
        if [[ -n "$serial" ]]; then
            echo "$serial"
            return 0
        fi
    fi

    # 静态文件不存在时，按顺序尝试其他来源（仅作为首次安装的 fallback）
    for path in \
        /sys/firmware/devicetree/base/serial-number \
        /etc/serial-number \
        /sys/class/dmi/id/product_uuid; do

        if [[ -f "$path" ]]; then
            serial=$(cat "$path" 2>/dev/null | tr -d '[:space:]\0' | head -c 64)
            if [[ -n "$serial" ]]; then
                echo "$serial"
                return 0
            fi
        fi
    done

    # ARM 设备最后 fallback: 使用 CPU part+revision+implementer 生成伪序列号
    if [[ -f /proc/cpuinfo ]]; then
        local implementer=$(grep -oP 'CPU implementer\s*:\s*\K0x[a-f0-9]+' /proc/cpuinfo | head -1)
        local part=$(grep -oP 'CPU part\s*:\s*\K[a-f0-9]+' /proc/cpuinfo | head -1)
        local revision=$(grep -oP 'CPU revision\s*:\s*\K[a-f0-9]+' /proc/cpuinfo | head -1)
        if [[ -n "$implementer" && -n "$part" ]]; then
            echo "${implementer#0x}${part}${revision}"
            return 0
        fi
    fi

    return 1
}

# 获取 IP 地址
get_ip() {
    local ip
    for iface in end0 eth0 en0 en1 enp0s1; do
        ip=$(ip -4 addr show "${iface}" 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
        if [[ -n "$ip" ]]; then
            echo "$ip"
            return 0
        fi
    done

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

# 获取 OS 信息
get_os_info() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "${PRETTY_NAME:-${NAME:-unknown}}"
    elif [[ -f /etc/lsb-release ]]; then
        . /etc/lsb-release
        echo "${DISTRIB_DESCRIPTION:-${DISTRIB_ID:-unknown}}"
    else
        uname -s
    fi
}

# 获取架构
get_arch() {
    uname -m
}

# 获取内核版本
get_kernel() {
    uname -r
}

# 获取运行时间
get_uptime() {
    local seconds
    if [[ -f /proc/uptime ]]; then
        seconds=$(awk '{print int($1)}' /proc/uptime)
        local days=$((seconds / 86400))
        local hours=$(( (seconds % 86400) / 3600 ))
        local mins=$(( (seconds % 3600) / 60 ))
        if [[ $days -gt 0 ]]; then
            echo "${days}d ${hours}h ${mins}m"
        elif [[ $hours -gt 0 ]]; then
            echo "${hours}h ${mins}m"
        else
            echo "${mins}m"
        fi
    else
        echo "unknown"
    fi
}

# 获取内存信息 (MB)
get_memory_info() {
    if [[ -f /proc/meminfo ]]; then
        local total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        if [[ -n "$total" ]]; then
            total=$((total / 1024))
            if [[ -n "$available" ]]; then
                available=$((available / 1024))
                echo "${available}/${total}MB"
            else
                echo "${total}MB"
            fi
        fi
    else
        echo "unknown"
    fi
}

# 获取磁盘信息
get_disk_info() {
    df -h / | awk 'NR==2 {print $2"("$1")"}'
}

# 获取 CPU 信息
get_cpu_info() {
    if [[ -f /proc/cpuinfo ]]; then
        grep -oP 'model name\s*:\s*\K[^/]+' /proc/cpuinfo | head -1 || \
        grep -oP 'Hardware\s*:\s*\K[^/]+' /proc/cpuinfo | head -1 || \
        echo "unknown"
    else
        echo "unknown"
    fi
}

# ========== 数据缓存 ==========
save_cache() {
    local payload="$1"
    local dir
    dir=$(dirname "$CACHE_FILE")
    mkdir -p "$dir"
    echo "$payload" > "$CACHE_FILE"
    debug "Cached registration data"
}

load_cache() {
    if [[ -f "$CACHE_FILE" ]]; then
        cat "$CACHE_FILE"
        return 0
    fi
    return 1
}

clear_cache() {
    if [[ -f "$CACHE_FILE" ]]; then
        rm -f "$CACHE_FILE"
        debug "Cleared cache"
    fi
}

# ========== OpenClaw Config 更新 ==========
update_openclaw_config() {
    local ip origin
    ip=$(get_ip) || return 0

    # openclaw 配置路径（root 用户安装时在 /root/.openclaw）
    local openclaw_json="/root/.openclaw/openclaw.json"

    if [[ ! -f "$openclaw_json" ]]; then
        debug "openclaw.json not found at $openclaw_json, skipping"
        return 0
    fi

    origin="http://${ip}:18789"

    # 使用 Python 更新 JSON
    python3 -c "
import json

config_path = '$openclaw_json'
ip = '$ip'
origin = 'http://${ip}:18789'

try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except Exception as e:
    print(f'Failed to read openclaw.json: {e}')
    exit(0)

# 确保 gateway.controlUi 存在
if 'gateway' not in config:
    config['gateway'] = {}
if 'controlUi' not in config['gateway']:
    config['gateway']['controlUi'] = {}

# 设置 dangerouslyDisableDeviceAuth=true
config['gateway']['controlUi']['dangerouslyDisableDeviceAuth'] = True

# 初始化 allowedOrigins 为空数组（如果不存在）
if 'allowedOrigins' not in config['gateway']['controlUi']:
    config['gateway']['controlUi']['allowedOrigins'] = []

# 追加当前 IP（如果不在列表中）
if origin not in config['gateway']['controlUi']['allowedOrigins']:
    config['gateway']['controlUi']['allowedOrigins'].append(origin)
    print(f'Added {origin} to allowedOrigins')
else:
    print(f'{origin} already in allowedOrigins')

# 写回文件
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
" 2>/dev/null || true
}

# ========== 注册 ==========
build_payload() {
    local mac serial ip hostname os arch kernel uptime memory disk cpu

    mac=$(get_mac) || mac="unknown"
    serial=$(get_serial) || serial="unknown"
    ip=$(get_ip) || ip="unknown"
    hostname=$(get_hostname) || hostname="unknown"
    os=$(get_os_info) || os="unknown"
    arch=$(get_arch) || arch="unknown"
    kernel=$(get_kernel) || kernel="unknown"
    uptime=$(get_uptime) || uptime="unknown"
    memory=$(get_memory_info) || memory="unknown"
    disk=$(get_disk_info) || disk="unknown"
    cpu=$(get_cpu_info) || cpu="unknown"

    # 使用 jq 生成 JSON（如果可用），否则手动转义
    if command -v jq &>/dev/null; then
        jq -n \
            --arg mac "$mac" \
            --arg serial "$serial" \
            --arg ip "$ip" \
            --arg hostname "$hostname" \
            --arg os "$os" \
            --arg arch "$arch" \
            --arg kernel "$kernel" \
            --arg uptime "$uptime" \
            --arg memory "$memory" \
            --arg disk "$disk" \
            --arg cpu "$cpu" \
            '{
                mac: $mac,
                serial: $serial,
                ip: $ip,
                hostname: $hostname,
                os: $os,
                arch: $arch,
                kernel: $kernel,
                uptime: $uptime,
                memory: $memory,
                disk: $disk,
                cpu: $cpu
            }'
    else
        # 手动转义 JSON 特殊字符
        _escape_json() {
            echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\r/\\r/g; s/\n/\\n/g'
        }
        printf '{"mac":"%s","serial":"%s","ip":"%s","hostname":"%s","os":"%s","arch":"%s","kernel":"%s","uptime":"%s","memory":"%s","disk":"%s","cpu":"%s"}' \
            "$(_escape_json "$mac")" \
            "$(_escape_json "$serial")" \
            "$(_escape_json "$ip")" \
            "$(_escape_json "$hostname")" \
            "$(_escape_json "$os")" \
            "$(_escape_json "$arch")" \
            "$(_escape_json "$kernel")" \
            "$(_escape_json "$uptime")" \
            "$(_escape_json "$memory")" \
            "$(_escape_json "$disk")" \
            "$(_escape_json "$cpu")"
    fi
}

do_register() {
    local payload
    payload=$(build_payload)

    debug "Payload: $payload"

    local response
    local status_code

    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -H "User-Agent: iClaw-Device/1.0" \
        -d "$payload" 2>/dev/null) || {
        error "Failed to connect to registry at ${REGISTRY_URL}"
        return 1
    }

    status_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$status_code" == "200" ]]; then
        log "Device registered successfully"
        clear_cache
        return 0
    else
        error "Registration failed: HTTP ${status_code}, body: ${body}"
        return 1
    fi
}

register_with_retry() {
    local attempt=1
    local delay=$REGISTER_RETRY_DELAY

    while [[ $attempt -le $MAX_REGISTER_RETRIES ]]; do
        log "Registration attempt ${attempt}/${MAX_REGISTER_RETRIES}"

        if do_register; then
            return 0
        fi

        if [[ $attempt -lt $MAX_REGISTER_RETRIES ]]; then
            log "Retrying in ${delay}s..."
            sleep "$delay"
            # 指数退避
            delay=$((delay * 2))
        fi

        ((attempt++))
    done

    error "Registration failed after ${MAX_REGISTER_RETRIES} attempts"
    return 1
}

# ========== 主逻辑 ==========
main() {
    log "Starting device registration..."

    # 等待网络就绪
    if ! wait_for_network; then
        error "Network check failed, exiting"
        # 保存缓存以便下次重试
        if [[ -t 0 ]] && [[ -w /var/lib/iclaw ]]; then
            payload=$(build_payload)
            save_cache "$payload"
            log "Cached registration data for next attempt"
        fi
        exit 1
    fi

    # 更新 openclaw.json allowedOrigins（每次上报时动态添加当前 IP）
    log "Updating openclaw config with current IP..."
    update_openclaw_config

    # 注册（带重试）
    if ! register_with_retry; then
        # 保存缓存
        if [[ -w /var/lib/iclaw ]]; then
            payload=$(build_payload)
            save_cache "$payload"
            log "Cached registration data for next attempt"
        fi
        exit 1
    fi

    exit 0
}

main "$@"
