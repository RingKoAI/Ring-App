import type { ContentBlock } from "./types"

// ── Text extraction ──────────────────────────────────────────────────────────

export function buildPlainText(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.kind === "text")
    .map(b => (b.kind === "text" ? b.text : ""))
    .join("\n\n")
    .trim()
}

export function buildMarkdown(blocks: ContentBlock[]): string {
  const parts: string[] = []
  for (const b of blocks) {
    if (b.kind === "text") {
      parts.push(b.text)
    } else if (b.kind === "reasoning") {
      const label = b.summary ? "Thought for a moment" : "Reasoning"
      parts.push(`> **${label}**\n>\n> ${b.text.replace(/\n/g, "\n> ")}`)
    } else if (b.kind === "tool_call") {
      const header = `**Tool: \`${b.tool}\`**`
      const args = b.args ? `\n\n\`\`\`json\n${b.args}\n\`\`\`` : ""
      const result = b.result ? `\n\n**Result:**\n\`\`\`\n${b.result}\n\`\`\`` : ""
      parts.push(`${header}${args}${result}`)
    }
  }
  return parts.join("\n\n---\n\n").trim()
}

// ── Time formatting ──────────────────────────────────────────────────────────

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Diff parsing ─────────────────────────────────────────────────────────────

export interface DiffLine {
  kind: "add" | "del" | "ctx" | "hunk"
  text: string
}

export interface ParsedTool {
  path: string | null
  diff: DiffLine[] | null
}

export function parseToolArgs(args: string): ParsedTool {
  if (!args) return { path: null, diff: null }
  try {
    const obj = JSON.parse(args) as Record<string, unknown>
    const path = typeof obj.path === "string" ? obj.path : null

    if (typeof obj.old_string === "string" && typeof obj.new_string === "string") {
      const oldLines = obj.old_string.split("\n")
      const newLines = obj.new_string.split("\n")
      const diff: DiffLine[] = [
        { kind: "hunk", text: `@@ -1,${oldLines.length} +1,${newLines.length} @@` },
      ]
      for (const l of oldLines) diff.push({ kind: "del", text: l })
      for (const l of newLines) diff.push({ kind: "add", text: l })
      return { path, diff }
    }
    if (typeof obj.content === "string") {
      const diff: DiffLine[] = obj.content
        .split("\n")
        .map(l => ({ kind: "add" as const, text: l }))
      return { path, diff }
    }
    return { path, diff: null }
  } catch {
    return { path: null, diff: null }
  }
}
