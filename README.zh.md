# RingApp

<div align="center">

**Desktop GUI for RingCLI — Tauri + React**

(Project in early stage. Version stays 0.x.x until first stable release. [Semantic Versioning 2.0](https://semver.org/))

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Ringaire/RingApp)
[![Rust](https://img.shields.io/badge/rust-1.85+-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange.svg)](LICENSE)

Desktop GUI for RingCLI — spawns the AI coding assistant as a subprocess.

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Build](#build)

</div>

---

## Features

- 🖥️ **Native desktop app** — Tauri v2, cross-platform (Linux/macOS/Windows)
- 🤖 **RingCLI subprocess** — spawns `ring sdk` mode, JSON-line protocol
- 🔌 **RingRCA integration** — optional WebSocket connection to remote gateway
- 📋 **Chat interface** — shadcn/ui based message list and input
- 🌙 **Dark/Light theme** — follows system preference

## Prerequisites

- [RingCLI](https://github.com/Ringaire/RingCLI) installed and in `$PATH`
- Node.js 18+ + pnpm
- Rust toolchain (for Tauri)

## Quick Start

```bash
git clone https://github.com/Ringaire/RingApp.git
cd RingApp
pnpm install
pnpm tauri dev
```

## Architecture

```
RingApp (Tauri)
  ├── React frontend (Vite + shadcn/ui)
  │     └── invoke("send_message")
  └── Tauri Rust backend
        └── spawn stdin/stdout
              └── ring sdk ──→ LLM Provider
```

### Protocol

Frontend calls Rust backend via Tauri IPC. Backend spawns `ring sdk` as subprocess with JSON-line protocol:

```json
// Input (React → Rust → ring stdin)
{"id":"uuid","type":"message","payload":"hello"}

// Output (ring stdout → Rust → React)
{"id":"uuid","type":"text","payload":"response"}
{"id":"uuid","type":"done","payload":""}
```

## Build

```bash
pnpm tauri build
pnpm build       # frontend only
```

## Related Projects

| Project | Description |
|---------|-------------|
| [RingCLI](https://github.com/Ringaire/RingCLI) | Terminal AI coding assistant |
| [RingRCA](https://github.com/Ringaire/RingRCA) | Remote Control Adapter gateway |

## License

[AGPL-3.0](LICENSE)
