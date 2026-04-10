#!/bin/bash
#
# claude-wrapper.sh - Claude 单槽位 + 三等待位 wrapper
#
# 功能：
#   - 槽位只有 1 个
#   - 等待队列最多 3 个
#   - 第 4 个直接报错返回
#
# 使用方式：
#   1. 备份原始 claude: mv /usr/local/bin/claude /usr/local/bin/claude-real
#   2. 安装 wrapper:     cp claude-wrapper.sh /usr/local/bin/claude && chmod +x /usr/local/bin/claude
#

# ========== 配置 ==========
MAX_WAIT=3
LOCK_DIR="/tmp/claude-slot.lock"

# ========== 辅助函数 ==========
log_info() {
    echo "[$(date '+%H:%M:%S')] $1"
}

log_error() {
    echo "[$(date '+%H:%M:%S')] ERROR: $1" >&2
}

# 尝试获取槽位（slot-0）
try_acquire_slot() {
    if mkdir "$LOCK_DIR/slot-0" 2>/dev/null; then
        echo $$ > "$LOCK_DIR/slot-0/pid"
        return 0
    fi
    return 1
}

# 获取槽位（阻塞，直到成功或队列满）
# 返回 0 表示获得槽位，1 表示队列已满
wait_for_slot() {
    local wait_count=0

    while true; do
        # 先尝试获取槽位
        if try_acquire_slot; then
            return 0
        fi

        # 槽位被占用，检查等待队列是否已满
        wait_count=$(ls -d "$LOCK_DIR/wait-"* 2>/dev/null | wc -l)

        if [ "$wait_count" -ge "$MAX_WAIT" ]; then
            return 1  # 队列满
        fi

        # 加入等待队列（wait-$$ 作为唯一标记）
        mkdir -p "$LOCK_DIR/wait-$$"
        wait_count=$(ls -d "$LOCK_DIR/wait-"* 2>/dev/null | wc -l)

        if [ "$wait_count" -gt "$MAX_WAIT" ]; then
            # 队列已满，移除自己的等待位并报错
            rmdir "$LOCK_DIR/wait-$$" 2>/dev/null
            return 1
        fi

        # 等待槽位释放的信号
        log_info "等待空位... (队列位置: $wait_count)"
        while [ -d "$LOCK_DIR/slot-0" ]; do
            sleep 1
        done

        # 槽位空了，移除自己的等待位并重试竞争槽位
        rmdir "$LOCK_DIR/wait-$$" 2>/dev/null
    done
}

# 释放槽位
release_slot() {
    if [ -f "$LOCK_DIR/slot-0/pid" ] && [ "$(cat "$LOCK_DIR/slot-0/pid")" = "$$" ]; then
        rm -rf "$LOCK_DIR/slot-0"
        log_info "释放槽位"
    fi
}

# ========== 主逻辑 ==========

mkdir -p "$LOCK_DIR"

# 注册退出清理
trap release_slot EXIT

# 等待获取槽位
if ! wait_for_slot; then
    log_error "已有 1 个 Claude 运行中，3 个等待位也已满，请稍后再试"
    exit 1
fi

log_info "获得槽位，启动 Claude..."

# 用子进程方式执行（保留 trap 生效）
claude-real "$@" &

# 等待子进程结束
wait $!

# 退出码
exit $?
