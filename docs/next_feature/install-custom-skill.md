# install_custom_skill 未实现

## 状态

**待实现** - 2026-03-30

## 描述

前端 `CustomInstallDialog` 组件中的自定义技能安装功能，调用了 `invoke('install_custom_skill')`，但后端 Rust Tauri 和 Go API 均未实现该功能。

## 当前行为

- **前端**: 调用 `invoke('install_custom_skill', { source, sourceType })`
- **Rust Tauri**: 无对应命令
- **Go API**: 返回错误 `"Use openclaw skills install <slug> to install custom skills"`

## 期望行为

支持通过以下方式安装自定义技能：
1. **npm 包**: 通过 npm 包名安装（如 `@scope/package-name`）
2. **本地路径**: 通过本地文件夹或 zip 文件路径安装

## 实现位置

### Rust Tauri（推荐）

`src-tauri/src/commands/config.rs` 中添加 `install_custom_skill` 命令：

```rust
#[command]
pub async fn install_custom_skill(
    source: String,
    source_type: String,  // "npm" | "local"
) -> Result<String, String> {
    match source_type.as_str() {
        "npm" => {
            // 执行 npm install -g <source>
            // 或者 openclaw plugins install <source>
        }
        "local" => {
            // 处理本地路径安装
        }
        _ => Err("Unknown source type".to_string())
    }
}
```

### Go API

`internal/handler/skills.go` 中 `InstallCustomSkill` 函数已占位，但返回错误。

## 相关文件

- 前端组件: `src/components/Skills/index.tsx` (CustomInstallDialog)
- Rust 命令: `src-tauri/src/commands/config.rs`
- Go 处理器: `internal/handler/skills.go`
- API 路由: `internal/router/router.go`
