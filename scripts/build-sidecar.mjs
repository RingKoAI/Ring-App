// Build ring-cli and copy the binary to Tauri sidecar location.
// Usage:
//   node scripts/build-sidecar.mjs           # debug build
//   node scripts/build-sidecar.mjs --release # release build

import { spawnSync } from "node:child_process"
import { existsSync, copyFileSync, mkdirSync } from "node:fs"
import { resolve, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const RING_CLI_DIR = process.env.RING_CLI_DIR || resolve(__dirname, "../../ring-cli")
const SIDECAR_DIR = resolve(__dirname, "../src-tauri/binaries")

const isRelease = process.argv.includes("--release")
const profile = isRelease ? "release" : "debug"

// ── Detect host target triple ───────────────────────────────────────────────

function getTargetTriple() {
  const { platform, arch } = process

  let rustArch
  switch (arch) {
    case "x64":   rustArch = "x86_64"; break
    case "arm64": rustArch = "aarch64"; break
    case "ia32":  rustArch = "i686"; break
    default:      rustArch = arch
  }

  let rustOs
  let ext = ""
  switch (platform) {
    case "win32":
      rustOs = "pc-windows-msvc"
      ext = ".exe"
      break
    case "darwin":
      rustOs = "apple-darwin"
      break
    case "linux":
      rustOs = "unknown-linux-gnu"
      break
    default:
      throw new Error("Unsupported platform: " + platform)
  }

  return rustArch + "-" + rustOs + ext
}

// ── Main ────────────────────────────────────────────────────────────────────

const triple = getTargetTriple()
console.log("[*] Target triple: " + triple)
console.log("[*] Build profile: " + profile)

// Step 1: Build ring-cli
console.log("[*] Building ring-cli in " + RING_CLI_DIR + "...")
const cargoArgs = ["cargo", "build", "--bin", "ring"]
if (isRelease) cargoArgs.push("--release")

const result = spawnSync(cargoArgs[0], cargoArgs.slice(1), {
  cwd: RING_CLI_DIR,
  stdio: "inherit",
  shell: true,
})

if (result.status !== 0) {
  console.error("[!] ring-cli build failed")
  process.exit(result.status || 1)
}

// Step 2: Copy binary to sidecar dir
const binName = triple.endsWith(".exe") ? "ring.exe" : "ring"
const srcBin = join(RING_CLI_DIR, "target", profile, binName)
const destBin = join(SIDECAR_DIR, "ring-" + triple)

if (!existsSync(srcBin)) {
  console.error("[!] Built binary not found: " + srcBin)
  process.exit(1)
}

mkdirSync(SIDECAR_DIR, { recursive: true })
copyFileSync(srcBin, destBin)
console.log("[OK] Copied: " + srcBin + "\n     -> " + destBin)
