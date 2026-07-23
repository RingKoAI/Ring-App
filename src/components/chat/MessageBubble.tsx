import { memo, useState } from "react"
import { Brain, ChevronRight, CircleAlert, Loader2, SquareCheck, SquarePen, Terminal, User2 } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import { Markdown } from "./Markdown"
import { CatIcon } from "../CatIcon"
import type { Attachment, ContentBlock, Message } from "./types"

interface ThreadTurnProps {
  message: Message
}

export const ThreadTurn = memo(function ThreadTurn({ message }: ThreadTurnProps) {
  if (message.role === "system") return <SystemNotice message={message} />

  const blocks = message.blocks ?? [{ kind: "text", text: message.content }]
  const streaming = message.status === "streaming" || message.status === "pending"

  return (
    <article className="ring-fade-up group/turn px-4 py-3.5" data-role={message.role}>
      <div className="mx-auto flex max-w-3xl gap-3.5">
        <RoleAvatar role={message.role} />
        <div className="min-w-0 flex-1">
          <TurnHeader role={message.role} model={message.model} timestamp={message.timestamp} />
          {message.error ? (
            <TurnError text={message.error} />
          ) : (
            <div className="mt-0.5">
              {blocks.map((b, i) => (
                <BlockRenderer key={i} block={b} streaming={streaming && i === blocks.length - 1} />
              ))}
              {streaming && blocks.every(b => b.kind !== "text") && <ThinkingDots />}
            </div>
          )}
          {message.attachments && message.attachments.length > 0 && <AttachmentList items={message.attachments} />}
        </div>
      </div>
    </article>
  )
})

function RoleAvatar({ role }: { role: Message["role"] }) {
  if (role === "user") {
    return (
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <User2 className="size-4" />
      </div>
    )
  }
  if (role === "tool") {
    return (
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Terminal className="size-3.5" />
      </div>
    )
  }
  return (
    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
      <CatIcon className="size-[18px]" face={false} />
    </div>
  )
}

function TurnHeader({ role, model, timestamp }: { role: Message["role"]; model?: string; timestamp: number }) {
  const { t } = useI18n()
  const label = role === "user" ? t("thread", "you") : role === "tool" ? t("thread", "tool") : model ?? "Ring"
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] font-semibold tracking-tight">{label}</span>
      <span className="text-[11px] text-muted-foreground/70">{formatTime(timestamp)}</span>
    </div>
  )
}

function BlockRenderer({ block, streaming }: { block: ContentBlock; streaming: boolean }) {
  switch (block.kind) {
    case "reasoning":
      return <ReasoningBlock text={block.text} summary={block.summary} />
    case "text":
      return (
        <div className="text-[0.9rem] leading-7">
          {block.kind === "text" && <Markdown>{block.text}</Markdown>}
          {streaming && <span className="ring-cursor" aria-hidden />}
        </div>
      )
    case "tool_call":
      return <ToolCallBlockView block={block} />
  }
}

function ReasoningBlock({ text, summary }: { text: string; summary?: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <div className="my-1.5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        <Brain className="size-3.5" />
        {summary ? t("thread", "thoughtFor") : t("thread", "reasoning")}
      </button>
      {open && (
        <div className="mt-1 border-l-2 border-border pl-3 text-[0.82rem] leading-6 text-muted-foreground">
          <Markdown>{text}</Markdown>
        </div>
      )}
    </div>
  )
}

function ToolCallBlockView({ block }: { block: Extract<ContentBlock, { kind: "tool_call" }> }) {
  const running = block.state === "running"
  const isEdit = block.tool === "edit_file"
  const isWrite = block.tool === "write_file"
  const isFileChange = isEdit || isWrite

  // parse args for file-path display
  const parsed = parseToolArgs(block.args)

  return (
    <div className="my-1.5 overflow-hidden rounded-lg border border-border/70 bg-white/[0.015]">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded",
            block.state === "error" ? "text-destructive" : block.state === "done" ? "text-emerald-400" : "text-muted-foreground",
          )}
        >
          {running ? <Loader2 className="size-3.5 animate-spin" /> : block.state === "done" ? <SquareCheck className="size-3.5" /> : block.state === "error" ? <CircleAlert className="size-3.5" /> : <SquarePen className="size-3.5" />}
        </span>
        <span className="font-mono text-[12px] font-medium">{block.tool}</span>
        {parsed.path && (
          <span className="truncate font-mono text-[11px] text-muted-foreground">{parsed.path}</span>
        )}
        {block.durationMs != null && (
          <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground/70">{formatDuration(block.durationMs)}</span>
        )}
      </div>

      {/* file change: diff view */}
      {isFileChange && parsed.diff ? (
        <div className="overflow-x-auto border-t border-border/50 font-mono text-[11.5px] leading-5">
          {parsed.diff.map((line, i) => (
            <div
              key={i}
              className={cn(
                "px-3",
                line.kind === "add" && "bg-emerald-500/10 text-emerald-300",
                line.kind === "del" && "bg-red-500/10 text-red-300",
                line.kind === "hunk" && "bg-white/[0.03] text-muted-foreground",
              )}
            >
              <span className="select-none opacity-50">
                {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
              </span>
              {line.text}
            </div>
          ))}
        </div>
      ) : block.args ? (
        <pre className="border-t border-border/50 px-3 py-2 font-mono text-[11.5px] leading-5 text-muted-foreground">
          <code>{block.args}</code>
        </pre>
      ) : null}
      {block.result && (
        <pre className="border-t border-border/50 bg-white/[0.02] px-3 py-2 font-mono text-[11.5px] leading-5">
          <code>{block.result}</code>
        </pre>
      )}
    </div>
  )
}

interface DiffLine {
  kind: "add" | "del" | "ctx" | "hunk"
  text: string
}

interface ParsedTool {
  path: string | null
  diff: DiffLine[] | null
}

function parseToolArgs(args: string): ParsedTool {
  if (!args) return { path: null, diff: null }
  try {
    const obj = JSON.parse(args) as Record<string, unknown>
    const path = typeof obj.path === "string" ? obj.path : null

    // edit_file: old_string → new_string diff
    if (typeof obj.old_string === "string" && typeof obj.new_string === "string") {
      const oldLines = obj.old_string.split("\n")
      const newLines = obj.new_string.split("\n")
      const diff: DiffLine[] = [{ kind: "hunk", text: `@@ -1,${oldLines.length} +1,${newLines.length} @@` }]
      for (const l of oldLines) diff.push({ kind: "del", text: l })
      for (const l of newLines) diff.push({ kind: "add", text: l })
      return { path, diff }
    }
    // write_file: all-green new content
    if (typeof obj.content === "string") {
      const diff: DiffLine[] = obj.content.split("\n").map(l => ({ kind: "add" as const, text: l }))
      return { path, diff }
    }
    return { path, diff: null }
  } catch {
    return { path: null, diff: null }
  }
}

function TurnError({ text }: { text: string }) {
  return (
    <div className="mt-1 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[0.82rem] text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

function AttachmentList({ items }: { items: Attachment[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map(a => (
        <span key={a.id} className="rounded-md border border-border/70 bg-white/[0.02] px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {a.name}
        </span>
      ))}
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1.5" aria-label="Thinking">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function SystemNotice({ message }: { message: Message }) {
  return (
    <div className="mx-auto my-1.5 flex max-w-3xl items-center justify-center px-4">
      <span className="rounded-full border border-border/60 bg-white/[0.02] px-3 py-1 text-center text-[11.5px] text-muted-foreground">
        {message.content}
      </span>
    </div>
  )
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
