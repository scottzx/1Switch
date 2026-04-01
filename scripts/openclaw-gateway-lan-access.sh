#!/bin/bash
#
# openclaw-gateway-lan-access - Update OpenClaw gateway config with current IP addresses for LAN access
# Usage: npx github:scottzx/iclaw-manager/openclaw-gateway-lan-access
#        bash scripts/openclaw-gateway-lan-access.sh
#

set -euo pipefail

# ========== 配置 ==========
OPENCLAW_JSON="${OPENCLAW_JSON:-$HOME/.openclaw/openclaw.json}"
DEBUG="${DEBUG:-0}"

# ========== 日志函数 ==========
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

debug() {
    if [[ "$DEBUG" == "1" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEBUG: $*" >&2
    fi
}

# ========== 获取 IPv4 地址列表 ==========
get_ips() {
    local ips
    ips=$(ip -4 addr show 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 | grep -v '^127\.')
    if [[ -z "$ips" ]]; then
        return 1
    fi
    echo "$ips"
}

# ========== 更新 openclaw.json ==========
update_openclaw_config() {
    if [[ ! -f "$OPENCLAW_JSON" ]]; then
        log "openclaw.json not found at $OPENCLAW_JSON"
        return 1
    fi

    # 获取 IP 列表
    local ips
    ips=$(get_ips) || {
        log "No valid IPv4 addresses found"
        return 1
    }

    debug "Found IPs: $ips"

    # 构建 JSON 数组
    local ips_json="["
    local first=true
    while IFS= read -r ip; do
        [[ -z "$ip" ]] && continue
        if [[ "$first" == "true" ]]; then
            first=false
        else
            ips_json+=","
        fi
        ips_json+="\"$ip\""
    done <<< "$ips"
    ips_json+="]"

    debug "IPs JSON: $ips_json"

    # 使用 Python 更新 JSON
    echo "$ips_json" | python3 -c "
import json
import sys

config_path = '$OPENCLAW_JSON'

try:
    ips_json = sys.stdin.read()
    ips = json.loads(ips_json)
except json.JSONDecodeError as e:
    print(f'Failed to parse IPs JSON: {e}')
    sys.exit(1)

try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except Exception as e:
    print(f'Failed to read openclaw.json: {e}')
    sys.exit(1)

# 确保 gateway.controlUi 存在
if 'gateway' not in config:
    config['gateway'] = {}
if 'controlUi' not in config['gateway']:
    config['gateway']['controlUi'] = {}

# 设置 gateway.bind 模式
config['gateway']['bind'] = 'lan'

# 设置 gateway.mode 为 local（关键修复！）
config['gateway']['mode'] = 'local'

# 设置 dangerouslyDisableDeviceAuth=true
config['gateway']['controlUi']['dangerouslyDisableDeviceAuth'] = True

# 初始化 allowedOrigins 为空数组（如果不存在）
if 'allowedOrigins' not in config['gateway']['controlUi']:
    config['gateway']['controlUi']['allowedOrigins'] = []

# 遍历所有 IP，追加到 allowedOrigins
for ip in ips:
    origin = f'http://{ip}:18789'
    if origin not in config['gateway']['controlUi']['allowedOrigins']:
        config['gateway']['controlUi']['allowedOrigins'].append(origin)
        print(f'Added {origin}')
    else:
        print(f'{origin} already in allowedOrigins')

# 写回文件
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print('Updated openclaw.json successfully')
"
}

# ========== 主逻辑 ==========
main() {
    log "Starting openclaw gateway config update..."
    log "Target: $OPENCLAW_JSON"

    if update_openclaw_config; then
        log "Done"
        return 0
    else
        log "Failed to update openclaw config"
        return 1
    fi
}

main "$@"
