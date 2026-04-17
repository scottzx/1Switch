#!/bin/bash
#
# claude-wrapper.sh - Claude 单槽位 + 三等待位 wrapper
#
# 功能：
#   - 槽位最多 2 个
#   - 等待队列最多 3 个
#   - 第 5 个直接报错返回
#
# 使用方式：
#   1. 备份原始 claude: mv /usr/local/bin/claude /usr/local/bin/claude-real
#   2. 安装 wrapper:     cp claude-wrapper.sh /usr/local/bin/claude && chmod +x /usr/local/bin/claude
#

# ========== 配置 ==========
MAX_SLOTS=2
MAX_WAIT=3
LOCK_DIR="/tmp/claude-slot.lock"

# ========== 辅助函数 ==========
log_info() {
    echo "[$(date '+%H:%M:%S')] $1"
}

log_error() {
    echo "[$(date '+%H:%M:%S')] ERROR: $1" >&2
}

# 清理 stale 锁（槽位或等待位的进程已死）
cleanup_stale_locks() {
    # slot-*: 检查每个槽位的进程是否存活
    for slot_dir in "$LOCK_DIR"/slot-*; do
        [ -d "$slot_dir" ] || continue
        local slot_pid
        slot_pid=$(cat "$slot_dir/pid" 2>/dev/null)
        if [ -n "$slot_pid" ] && ! kill -0 "$slot_pid" 2>/dev/null; then
            rm -rf "$slot_dir"
        fi
    done
    # wait-*: 检查每个等待位的进程是否存活
    for wait_dir in "$LOCK_DIR"/wait-*; do
        [ -d "$wait_dir" ] || continue
        local wait_pid
        wait_pid=$(basename "$wait_dir" | sed 's/wait-//')
        if ! kill -0 "$wait_pid" 2>/dev/null; then
            rm -rf "$wait_dir"
        fi
    done
}

# 尝试获取任意空闲槽位
try_acquire_slot() {
    # 先清理 stale 锁
    cleanup_stale_locks

    # 尝试占用任意一个空闲槽位
    for i in $(seq 0 $((MAX_SLOTS - 1))); do
        if mkdir "$LOCK_DIR/slot-$i" 2>/dev/null; then
            echo $$ > "$LOCK_DIR/slot-$i/pid"
            return 0
        fi
    done
    return 1
}

# 当前占用的槽位数
count_active_slots() {
    ls -d "$LOCK_DIR"/slot-* 2>/dev/null | wc -l
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

        # 槽位被占用，检查等待队列是否已满（先清理 stale 锁）
        cleanup_stale_locks
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

        # 等待任意槽位释放的信号
        log_info "等待空位... (队列位置: $wait_count, 运行中: $(count_active_slots)/$MAX_SLOTS)"
        while [ "$(count_active_slots)" -ge "$MAX_SLOTS" ]; do
            sleep 1
            # 等待期间也检查槽位是否已 stale，避免死等
            cleanup_stale_locks
        done

        # 有槽位空了，移除自己的等待位并重试竞争槽位
        rmdir "$LOCK_DIR/wait-$$" 2>/dev/null
    done
}

# 释放槽位
release_slot() {
    for slot_dir in "$LOCK_DIR"/slot-*; do
        [ -d "$slot_dir" ] || continue
        if [ "$(cat "$slot_dir/pid" 2>/dev/null)" = "$$" ]; then
            rm -rf "$slot_dir"
            log_info "释放槽位"
            return
        fi
    done
}

# ========== 主逻辑 ==========

mkdir -p "$LOCK_DIR"

# 注册退出清理
trap release_slot EXIT

# 等待获取槽位
if ! wait_for_slot; then
    log_error "已有 $MAX_SLOTS 个 Claude 运行中，$MAX_WAIT 个等待位也已满，请稍后再试"
    exit 1
fi

log_info "获得槽位，启动 Claude..."

# 用子进程方式执行（保留 trap 生效）
claude-real "$@" &

# 等待子进程结束
wait $!

# 退出码
exit $?
