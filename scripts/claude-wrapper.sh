#!/bin/bash
#
# claude-wrapper.sh - Claude 并发限制 wrapper
#
# 功能：最多同时运行 N 个 Claude 会话，超出的等待，退出时自动释放槽位
#
# 使用方式：
#   1. 备份原始 claude: mv /usr/local/bin/claude /usr/local/bin/claude-real
#   2. 安装 wrapper:     cp claude-wrapper.sh /usr/local/bin/claude && chmod +x /usr/local/bin/claude
#

set -e

# ========== 配置 ==========
MAX_CONCURRENT=3
LOCK_DIR="/tmp/claude-slot.lock"

# ========== 辅助函数 ==========
log_info() {
    echo "[$(date '+%H:%M:%S')] $1"
}

log_error() {
    echo "[$(date '+%H:%M:%S')] ERROR: $1" >&2
}

# 尝试获取一个槽位
# 返回值: 成功返回槽位号(1-$MAX_CONCURRENT)，失败返回空
try_acquire_slot() {
    for i in $(seq 1 $MAX_CONCURRENT); do
        if mkdir "$LOCK_DIR/slot-$i" 2>/dev/null; then
            echo $$ > "$LOCK_DIR/slot-$i/pid"
            echo $i
            return 0
        fi
    done
    return 1
}

# 查找并释放当前进程占用的槽位
release_my_slot() {
    for i in $(seq 1 $MAX_CONCURRENT); do
        local pid_file="$LOCK_DIR/slot-$i/pid"
        if [ -f "$pid_file" ] && [ "$(cat "$pid_file")" = "$$" ]; then
            rm -rf "$LOCK_DIR/slot-$i"
            log_info "释放槽位 $i"
            return 0
        fi
    done
    return 1
}

# ========== 主逻辑 ==========

# 确保锁目录存在
mkdir -p "$LOCK_DIR"

# 注册退出清理（EXIT 确保无论正常/异常退出都释放槽位）
trap release_my_slot EXIT

# 等待获取槽位（阻塞）
while true; do
    slot=$(try_acquire_slot) && break
    log_info "已有 $MAX_CONCURRENT 个 Claude 会话运行中，等待空位..."
    sleep 3
done

log_info "获得槽位 $slot，启动 Claude..."

# 执行真正的 claude（替换当前进程）
exec claude-real "$@"
