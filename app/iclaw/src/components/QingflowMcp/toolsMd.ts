// 轻流 MCP 工具使用规范文档
export const TOOLS_MD = `---
name: qingflow-mcp
description: 轻流(qingflow) MCP 工具使用规范。当用户询问轻流应用数据条数、分类统计、审批状态、待办任务、成员信息、工作区配置等内容时，必须优先使用 qingflow MCP 工具，禁止自行编写脚本或通过任务中心接口拼凑数据。
---

# 轻流 MCP 工具使用规范

## 1. 环境配置

### 1.1 工具选择优先级

**优先使用 \`qingflow-cli\` 命令行工具，其次使用 MCP 工具。**

| 优先级 | 工具 | 适用场景 |
|--------|------|----------|
| 1 | qingflow-cli | 命令行操作、脚本自动化、本地开发调试 |
| 2 | MCP 工具 | AI 助手集成、Claude Desktop、OpenClaw 等 stdio MCP 客户端 |

### 1.2 qingflow-cli 简介

\`@qingflow-tech/qingflow-cli\` 是轻流的统一命令行工具，提供完整的应用操作、记录管理、待办处理、应用构建等功能。

**安装：**

\`\`\`bash
npm install -g @qingflow-tech/qingflow-cli
\`\`\`

**环境变量：**

| 变量 | 说明 |
|------|------|
| QINGFLOW_MCP_DEFAULT_BASE_URL | API 地址，默认 https://qingflow.com/api |
| QINGFLOW_MCP_DEFAULT_QF_VERSION | 工作区版本 |
| QINGFLOW_MCP_HOME | 数据目录，默认 ~/.qingflow-mcp |

### 1.3 qingflow-cli 命令概览

\`\`\`bash
qingflow --help                    # 查看帮助
qingflow <command> --help          # 查看子命令帮助
qingflow <command> --json          # JSON 格式输出
\`\`\`

| 命令 | 说明 |
|------|------|
| auth | 认证与会话管理 |
| workspace | 工作区管理 |
| app | 应用发现 |
| record | 记录操作与表结构 |
| task | 待办与流程上下文 |
| builder | 应用构建 |
| import | 数据导入 |

### 1.4 qingflow-cli 常用命令示例

**认证：**
\`\`\`bash
qingflow auth use credential
qingflow auth whoami
qingflow auth logout
\`\`\`

**工作区：**
\`\`\`bash
qingflow workspace list
qingflow workspace select --ws-id WORKSPACE_ID
\`\`\`

**应用：**
\`\`\`bash
qingflow app list
qingflow app search --keyword 关键词
qingflow app get --app-key APP_KEY
\`\`\`

**记录：**
\`\`\`bash
qingflow record schema --app-key APP_KEY --mode applicant
qingflow record list --app-key APP_KEY --view-id VIEW_ID --limit 20
qingflow record get --app-key APP_KEY --record-id RECORD_ID
qingflow record insert --app-key APP_KEY --fields-file fields.json
qingflow record update --app-key APP_KEY --record-id RECORD_ID --fields-file fields.json
qingflow record delete --app-key APP_KEY --record-id RECORD_ID
qingflow record analyze --app-key APP_KEY --view-id VIEW_ID --dimensions-file dims.json
\`\`\`

**任务：**
\`\`\`bash
qingflow task list --task-box todo --flow-status all
qingflow task get --app-key APP_KEY --record-id RECORD_ID --workflow-node-id NODE_ID
qingflow task action --app-key APP_KEY --record-id RECORD_ID --workflow-node-id NODE_ID --action approve
qingflow task log --app-key APP_KEY --record-id RECORD_ID --workflow-node-id NODE_ID
\`\`\`

**构建：**
\`\`\`bash
qingflow builder package list
qingflow builder package resolve --package-name PACKAGE_NAME
qingflow builder app resolve --app-key APP_KEY
qingflow builder app read-fields --app-key APP_KEY
qingflow builder schema apply --app-key APP_KEY --add-fields-file fields.json
qingflow builder publish verify --app-key APP_KEY
\`\`\`

---

### 1.5 MCP 服务配置

\`\`\`json
{
  "mcpServers": {
    "qingflow-user": {
      "command": "/usr/bin/qingflow-app-user-mcp",
      "env": {
        "QINGFLOW_MCP_DEFAULT_BASE_URL": "https://qingflow.com/api"
      }
    },
    "qingflow-builder": {
      "command": "/usr/bin/qingflow-app-builder-mcp",
      "env": {
        "QINGFLOW_MCP_DEFAULT_BASE_URL": "https://qingflow.com/api"
      }
    },
    "qingflow-cli": {
      "command": "/usr/bin/qingflow",
      "env": {
        "QINGFLOW_MCP_DEFAULT_BASE_URL": "https://qingflow.com/api"
      }
    }
  }
}

QINGFLOW_MCP_AUTH_USER_TOKEN 需要读取文件 \`~/.openclaw/workspace/config/mcporter.json\`
\`\`\`

### 1.6 版本更新检查

**每日首次使用前执行：**

\`\`\`bash
# 检查最新版本
npm view @qingflow-tech/qingflow-app-user-mcp version
npm view @qingflow-tech/qingflow-app-builder-mcp version
npm view @qingflow-tech/qingflow-cli version

# 对比本地版本
cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-user-mcp/package.json | grep '"version"'
cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-builder-mcp/package.json | grep '"version"'
cat /usr/lib/node_modules/@qingflow-tech/qingflow-cli/package.json | grep '"version"'
\`\`\`

**发现新版本时提示用户并执行更新。**

---

## 2. 认证流程

### 2.1 首次使用认证（必须）

用户首次使用 qingflow MCP 时，**必须**完成认证：

| 方式 | 工具 | 参数 |
|------|------|------|
| 认证 | \`auth_use_credential\` | \`credential\`|
| credential | \`fetch_auth_context\` | \`credential\`|

**认证步骤：**

1. credential 认证方式，可以不提供credential,使用默认从 /ubuntu/home/.openclaw/workspace/config/mcporter.json中读取x-qingflow-client-id值.
2. 调用对应认证工具
3. 有获取到credential后调用 \`fetch_auth_context\` 返回上下文，里面包含token,wsId,qfVersion
4. 完成后方可使用其他工具

> ⚠️ **注意**：未完成认证和工作区选择前，禁止使用其他工具。

### 2.2 认证状态检查

- \`auth_whoami\` - 查看当前登录用户
- \`auth_logout\` - 退出登录

### 2.3 工作区切换

切换工作区时，必须同步更新 \`QINGFLOW_MCP_DEFAULT_QF_VERSION\`：

1. 调用 \`fetch_auth_context(credential=拿到的credential)\`
2. 从返回结果中提取 \`qf_version\` ,\` token\`,\`wsId\` 等字段
3. 更新 MCP 配置中的 \`QINGFLOW_MCP_DEFAULT_QF_VERSION\`

---

## 3. 技能路由

轻流 MCP 采用**技能路由**模式，根据任务类型选择对应的子技能：

\`\`\`
qingflow-app-user (入口技能)
    ├── qingflow-record-crud      → 记录增删改查、导入
    ├── qingflow-record-analysis  → 数据分析、统计
    ├── qingflow-task-ops         → 待办任务、审批流程
    └── qingflow-mcp-setup        → 认证、工作区设置

qingflow-app-builder (构建者技能)
    └── 应用构建、系统配置
\`\`\`

**路由规则：**
- 记录浏览/创建/更新/删除/导入 → \`qingflow-record-crud\`
- 数据统计/分组/趋势/占比 → \`qingflow-record-analysis\`
- 待办/审批/流程操作 → \`qingflow-task-ops\`
- 应用搭建/字段配置/流程设计 → \`qingflow-app-builder\`

---

## 4. qingflow-app-user 工具

### 4.1 认证与工作区

| 工具 | 用途 |
|------|------|
| \`auth_login\` | 用户名密码登录 |
| \`auth_use_token\` | Token 登录 |
| \`auth_whoami\` | 查看当前用户 |
| \`auth_logout\` | 退出登录 |
| \`workspace_list\` | 列出工作区 |
| \`workspace_select\` | 选择工作区 |

### 4.2 应用发现

| 工具 | 用途 |
|------|------|
| \`app_list\` | 列出所有应用 |
| \`app_search\` | 搜索应用 |
| \`app_get\` | 获取应用详情（含视图列表） |

### 4.3 记录操作（CRUD）

**核心工具：**

| 工具 | 用途 | 前置条件 |
|------|------|----------|
| \`record_schema_get\` | 获取字段结构 | 必须先调用 |
| \`record_list\` | 列表查询 | \`app_get\` + \`record_schema_get\` |
| \`record_get\` | 单条读取 | \`app_get\` + \`record_schema_get\` |
| \`record_insert\` | 创建记录 | \`record_schema_get(schema_mode="applicant")\` |
| \`record_update\` | 更新记录 | \`app_get\` + \`record_schema_get(schema_mode="browse", view_id=...)\` |
| \`record_delete\` | 删除记录 | \`record_list\` / \`record_get\` |

**辅助工具：**

| 工具 | 用途 |
|------|------|
| \`record_member_candidates\` | 成员字段候选查询 |
| \`record_department_candidates\` | 部门字段候选查询 |
| \`record_code_block_run\` | 执行代码块字段 |

**导入工具：**

| 工具 | 用途 |
|------|------|
| \`record_import_template_get\` | 获取导入模板 |
| \`record_import_verify\` | 验证导入文件 |
| \`record_import_repair_local\` | 修复本地导入文件 |
| \`record_import_start\` | 开始导入 |
| \`record_import_status_get\` | 查询导入状态 |

### 4.4 数据分析

| 工具 | 用途 | 前置条件 |
|------|------|----------|
| \`record_analyze\` | 执行 DSL 分析 | \`app_get\` + \`record_schema_get(schema_mode="browse", view_id=...)\` |

**DSL 规范：**
- \`dimensions\`: \`[{field_id, alias, bucket}]\` - 维度
- \`metrics\`: \`[{op, field_id, alias}]\` - 指标（op: count/sum/avg/min/max/distinct_count）
- \`filters\`: \`[{field_id, op, value}]\` - 过滤（op: eq/neq/in/not_in/gt/gte/lt/lte/between/contains/is_null/not_null）
- \`sort\`: \`[{by, order}]\` - 排序（by 引用 alias）

### 4.5 任务中心

| 工具 | 用途 |
|------|------|
| \`task_list\` | 待办/已办列表 |
| \`task_get\` | 获取任务详情 |
| \`task_action_execute\` | 执行审批动作（同意/拒绝/回退/转交） |
| \`task_associated_report_detail_get\` | 获取关联报表 |
| \`task_workflow_log_get\` | 获取流程日志 |

**task_box 类型：** \`todo\`(待办), \`initiated\`(我发起), \`cc\`(抄送), \`done\`(已办)

**flow_status 状态：** \`all\`, \`in_progress\`, \`approved\`, \`rejected\`, \`pending_fix\`, \`urged\`, \`overdue\`, \`due_soon\`, \`unread\`, \`ended\`

### 4.6 目录与文件

| 工具 | 用途 |
|------|------|
| \`directory_search\` | 搜索用户/部门 |
| \`directory_list_internal_users\` | 列出内部用户 |
| \`directory_list_internal_departments\` | 列出部门 |
| \`directory_list_sub_departments\` | 列出子部门 |
| \`file_get_upload_info\` | 获取上传信息 |
| \`file_upload_local\` | 上传本地文件 |

### 4.7 反馈

| 工具 | 用途 |
|------|------|
| \`feedback_submit\` | 提交产品反馈（无需登录） |

---

## 5. qingflow-app-builder 工具

### 5.1 认证与工作区

与用户端相同：\`auth_login\`, \`auth_use_token\`, \`workspace_list\`, \`workspace_select\`

### 5.2 应用包管理

| 工具 | 用途 |
|------|------|
| \`package_list\` | 列出应用包 |
| \`package_resolve\` | 解析应用包 |
| \`package_create\` | 创建应用包 |
| \`package_attach_app\` | 将应用附加到包 |

### 5.3 应用构建

**读取工具：**

| 工具 | 用途 |
|------|------|
| \`app_resolve\` | 解析应用 |
| \`app_read_summary\` | 读取应用摘要 |
| \`app_read_fields\` | 读取字段列表 |
| \`app_read_layout_summary\` | 读取布局摘要 |
| \`app_read_views_summary\` | 读取视图列表 |
| \`app_read_flow_summary\` | 读取流程摘要 |
| \`app_read_charts_summary\` | 读取图表列表 |
| \`portal_read_summary\` | 读取门户摘要 |

**构建工具：**

| 工具 | 用途 |
|------|------|
| \`app_schema_apply\` | 应用字段变更（增/改/删） |
| \`app_layout_apply\` | 应用布局变更 |
| \`app_flow_apply\` | 应用流程变更 |
| \`app_views_apply\` | 应用视图变更 |
| \`app_charts_apply\` | 应用图表变更 |
| \`portal_apply\` | 应用门户变更 |
| \`app_publish_verify\` | 发布并验证 |

### 5.4 人员与角色

| 工具 | 用途 |
|------|------|
| \`member_search\` | 搜索成员 |
| \`role_search\` | 搜索角色 |
| \`role_create\` | 创建角色 |

### 5.5 辅助工具

| 工具 | 用途 |
|------|------|
| \`builder_tool_contract\` | 获取工具契约（查看参数规范） |
| \`app_release_edit_lock_if_mine\` | 释放编辑锁 |
| \`file_upload_local\` | 上传文件 |
| \`feedback_submit\` | 提交反馈 |

---

## 6. 核心使用规范

### 6.1 Schema-First 规则

**所有记录操作必须先获取 Schema：**

| 操作类型 | Schema 模式 | 说明 |
|----------|-------------|------|
| 创建记录 | \`schema_mode="applicant"\` | 获取填报节点可见字段 |
| 更新记录 | \`schema_mode="browse"\` + \`view_id\` | 获取视图范围字段 |
| 查询记录 | \`schema_mode="browse"\` + \`view_id\` | 获取视图范围字段 |
| 数据分析 | \`schema_mode="browse"\` + \`view_id\` | 获取视图范围字段 |

**重要：**
- 所有 \`field_id\` 必须来自 Schema 响应
- 禁止猜测字段名称或 ID
- 隐藏字段会被省略，缺失字段表示当前权限不可见

### 6.2 工具查找原则

| 状态 | 操作 |
|------|------|
| ✅ 找到合适工具 | 直接调用，不做任何额外尝试 |
| ❌ 未找到工具 | 明确告知用户"qingflow MCP 暂不支持该功能"，**停止** |

### 6.3 严禁行为

以下行为**严格禁止**：

- 🚫 用 \`Write file\` + \`Exec\` / \`curl\` / \`python3\` 脚本直接调用轻流 API
- 🚫 用任务中心的"我发起+抄送"数量推算应用总数据量
- 🚫 信任 \`record_list\` 返回的 \`data.total\`（始终为 \`"0"\`，用顶层 \`totalCount\`）
- 🚫 调用一次工具后再反复尝试其他方式"验证"
- 🚫 猜测字段 ID 或名称
- 🚫 绕过 Schema 直接构建写入数据

---

## 7. 典型工作流

### 7.1 记录查询流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → app_get (获取 accessible_views)
    → record_schema_get(schema_mode="browse", view_id=...)
    → record_list / record_get
\`\`\`

### 7.2 记录创建流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → record_schema_get(schema_mode="applicant")
    → (可选: record_member_candidates / record_department_candidates)
    → record_insert
\`\`\`

### 7.3 记录更新流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → app_get (获取 accessible_views)
    → record_schema_get(schema_mode="browse", view_id=...)
    → record_update
\`\`\`

### 7.4 数据分析流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → app_get (选择 analysis_supported=true 的视图)
    → record_schema_get(schema_mode="browse", view_id=...)
    → record_analyze (DSL 分析)
\`\`\`

### 7.5 任务审批流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → task_list (task_box="todo")
    → task_get
    → task_workflow_log_get (查看审批历史)
    → task_associated_report_detail_get (查看关联报表)
    → (用户确认后) task_action_execute
\`\`\`

### 7.6 数据导入流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → app_get (检查 import_capability)
    → record_import_template_get
    → record_import_verify
    → (可选: record_import_repair_local)
    → record_import_start
    → record_import_status_get
\`\`\`

### 7.7 应用构建流程

\`\`\`
auth_login / auth_use_token
    → workspace_select
    → package_list / package_resolve
    → app_resolve (或 app_schema_apply 创建新应用)
    → app_read_fields / app_read_layout_summary / app_read_flow_summary
    → app_schema_apply / app_layout_apply / app_flow_apply
    → app_publish_verify
\`\`\`

---

## 8. 字段类型处理

### 8.1 复杂字段写入格式

| 字段类型 | 正确示例 | 说明 |
|----------|----------|------|
| 成员 | \`{"负责人": {"id": 7, "value": "张三"}}\` 或 \`{"负责人": "张三"}\` | 支持自动解析 |
| 部门 | \`{"所属部门": {"id": 336193, "value": "研发部"}}\` 或 \`{"所属部门": "研发部"}\` | 支持自动解析 |
| 关联 | \`{"关联客户": {"apply_id": 5001}}\` 或 \`{"关联客户": "客户A"}\` | 按 searchable_fields 解析 |
| 附件 | \`{"合同附件": {"value": "https://...", "name": "a.pdf"}}\` | 需先上传文件 |
| 子表 | \`{"销售明细": [{"产品名称": "企业版", "数量": 2}]}\` | 通过父字段写入 |

### 8.2 自动解析规则

- 成员/部门/关联字段支持传入自然名称进行后端自动解析
- 如果解析到多个候选，会返回 \`needs_confirmation\` 状态
- 收到确认请求时，必须停止并让用户选择，禁止猜测提交

---

## 9. 响应解读

### 9.1 通用响应字段

| 字段 | 含义 |
|------|------|
| \`ok\` | 操作是否成功 |
| \`warnings\` | 警告信息 |
| \`verification\` | 验证详情 |
| \`verified\` | 是否已验证 |

### 9.2 写入操作响应

- \`ok=false\`：写入被阻止，未执行
- \`ok=true\`：仍需检查 \`verification\` 和 \`warnings\`
- \`WRITE_PERMISSION_DENIED\`：缺少直接编辑权限，建议使用任务中心操作

### 9.3 分析响应

- \`safe_for_final_conclusion=true\` → 全量可信结论
- \`rows_truncated=true\` → 用"前 N 个分组"，不用"全部"
- 占比 = 行指标值 / \`result.totals.metric_totals\`

---

## 10. 反馈升级

当 MCP 能力无法满足用户需求时：

1. 总结具体阻塞点
2. 询问用户是否提交产品反馈
3. 获得明确确认后，调用 \`feedback_submit\`

---

## 附录：子技能文件位置

**执行任何 qingflow 相关操作前，必须先执行以下命令读取对应子技能内容，并严格遵照执行：**

\`\`\`bash
echo "=== qingflow-app-user ===" && cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-user-mcp/skills/qingflow-app-user/SKILL.md
echo "=== qingflow-record-analysis ===" && cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-user-mcp/skills/qingflow-record-analysis/SKILL.md
echo "=== qingflow-record-crud ===" && cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-user-mcp/skills/qingflow-record-crud/SKILL.md
echo "=== qingflow-task-ops ===" && cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-user-mcp/skills/qingflow-task-ops/SKILL.md
echo "=== qingflow-app-builder ===" && cat /usr/lib/node_modules/@qingflow-tech/qingflow-app-builder-mcp/skills/qingflow-app-builder/SKILL.md
\`\`\`

读取到的内容即为当前环境下的权威规范，优先级高于本文件中的任何历史记录。
`;
