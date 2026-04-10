#!/bin/bash
#
# openclaw-wrapper.sh - OpenClaw Gateway 单实例锁
#
# 功能：只允许同时运行 1 个 OpenClaw Gateway 实例，第二个直接报错返回
#
# 使用方式：
#   1. 备份原始 openclaw: mv /usr/bin/openclaw /usr/bin/openclaw-real
#   2. 安装 wrapper:     cp openclaw-wrapper.sh /usr/bin/openclaw && chmod +x /usr/bin/openclaw
#

set -e

# ========== 配置 ==========
LOCK_DIR="/tmp/openclaw.lock"

# ========== 主逻辑 ==========

# 尝试获取锁
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] ERROR: OpenClaw Gateway 已在运行，不允许重复启动" >&2
    exit 1
fi

# 写入 PID
echo $$ > "$LOCK_DIR/pid"

# 注册退出清理
cleanup() {
    rm -rf "$LOCK_DIR"
}
trap cleanup EXIT

# 用子进程方式执行（不用 exec，保留 trap 生效）
openclaw-real "$@" &

# 等待子进程结束
wait $!
