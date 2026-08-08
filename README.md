# RingApp

<div align="center">

**桌面 AI 编程助手 — Tauri + React 图形界面**

(目前项目正在处于初始阶段，版本号在发布正式版本之前一直保持大版本为 0.x.x。本项目遵循 [语义化版本 2.0](https://semver.org/lang/zh-CN/) 规范)

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Ringaire/Ring-App)
[![Rust](https://img.shields.io/badge/rust-1.85+-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange.svg)](LICENSE)

RingCLI 的桌面图形界面，以子进程方式驱动 AI 编程助手

[功能特性](#功能特性) • [快速开始](#快速开始) • [架构设计](#架构设计) • [构建](#构建)

</div>

---

## 功能特性

- 🖥️ **原生桌面应用** — 基于 Tauri v2，支持 Linux/macOS/Windows
- 🤖 **RingCLI 子进程** — 自动 spawn ring sdk 模式，通过 JSON 协议通信
- 🔌 **RingRCA 集成** — 可选 WebSocket 连接远程网关
- 📋 **聊天界面** — 基于 shadcn/ui 的消息列表与输入框
- 🌙 **深色/浅色主题** — 自动跟随系统主题

## 前置要求

- [RingCLI](https://github.com/Ringaire/Ring-CLI) 已安装并在 `$PATH` 中
- Node.js 18+ + pnpm
- Rust 工具链（用于 Tauri）

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/Ringaire/Ring-App.git
cd RingApp

# 安装依赖并启动开发模式
pnpm install
pnpm tauri dev
```

## 架构设计

```
RingApp (Tauri)
  ├── React 前端 (Vite + shadcn/ui)
  │     └── invoke("send_message")
  └── Tauri Rust 后端
        └── spawn stdin/stdout
              └── ring sdk ──→ LLM Provider
```

### 通信协议

前端通过 Tauri IPC 调用 Rust 后端，后端以子进程方式运行 `ring sdk`，通过 JSON 行协议通信：

```json
// 输入 (React → Rust → ring stdin)
{"id":"uuid","type":"message","payload":"你好"}

// 输出 (ring stdout → Rust → React)
{"id":"uuid","type":"text","payload":"回复内容"}
{"id":"uuid","type":"done","payload":""}
```

## 构建

```bash
# 生产构建
pnpm tauri build

# 仅构建前端
pnpm build
```

## 相关项目

| 项目 | 说明 |
|------|------|
| [RingCLI](https://github.com/Ringaire/Ring-CLI) | 终端 AI 编程助手 |
| [RingRCA](https://github.com/Ringaire/Ring-RCA) | 远程控制适配器网关 |

## 许可证

[AGPL-3.0](LICENSE)
