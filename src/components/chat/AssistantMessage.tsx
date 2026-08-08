import { memo, useState } from "react"
import {
  Brain,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  FileText,
  Loader2,
  SquareCheck,
  SquarePen,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import { Markdown } from "./Markdown"
import { RingIcon } from "../RingIcon"
import type { ContentBlock, Message } from "./types"
import {
  buildMarkdown,
  buildPlainText,
  formatDuration,
  formatTime,
  parseToolArgs,
} from "./utils"

interface AssistantMessageProps {
  message: Message
}

export const AssistantMessage = memo(function AssistantMessage({ message }: AssistantMessageProps) {
  const blocks = message.blocks ?? [{ kind: "text", text: message.content }]
  const streaming = message.status === "streaming" || message.status === "pending"
  const label = message.model ?? "Ring"

  return (
    <article className="ring-fade-up group/turn px-4 py-3.5" data-role={message.role}>
      <div className="mx-auto flex max-w-[800px] gap-3.5">
        <RingIcon className="mt-0.5 size-7 shrink-0 text-primary" />

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold tracking-tight">{label}</span>
            <span className="text-[11px] text-muted-foreground/70">{formatTime(message.timestamp)}</span>
          </div>

          {/* Content */}
          {message.error ? (
            <div className="mt-1 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[0.82rem] text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{message.error}</span>
            </div>
          ) : (
            <div className="mt-0.5">
              {blocks.map((b, i) => (
                <BlockRenderer key={i} block={b} streaming={streaming && i === blocks.length - 1} />
              ))}
              {streaming && blocks.every(b => b.kind !== "text") && <ThinkingDots />}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.attachments.map(a => (
                <span
                  key={a.id}
                  className="rounded-md border border-border/70 bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  {a.name}
                </span>
              ))}
            </div>
          )}

          {/* Action bar (hover-reveal) */}
          {!streaming && !message.error && blocks.some(b => b.kind === "text") && (
            <AssistantActions blocks={blocks} />
          )}
        </div>
      </div>
    </article>
  )
})

// ── Action bar: copy plain text + copy markdown ──────────────────────────────

function AssistantActions({ blocks }: { blocks: ContentBlock[] }) {
  const { t } = useI18n()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const plainText = buildPlainText(blocks)
  const markdown = buildMarkdown(blocks)
  if (!plainText) return null

  async function doCopy(key: string, content: string) {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const btnClass =
    "flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground/60 transition-colors hover:bg-[var(--ring-overlay)] hover:text-foreground"

  return (
    <div className="mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/turn:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={() => doCopy("text", plainText)}
        className={btnClass}
        title={t("composer", "copy") as string}
      >
        {copiedKey === "text" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
      </button>
      <button
        type="button"
        onClick={() => doCopy("md", markdown)}
        className={btnClass}
        title="Copy Markdown"
      >
        {copiedKey === "md" ? <Check className="size-3 text-emerald-400" /> : <FileText className="size-3" />}
      </button>
    </div>
  )
}

// ── Block renderer ───────────────────────────────────────────────────────────

function BlockRenderer({ block, streaming }: { block: ContentBlock; streaming: boolean }) {
  switch (block.kind) {
    case "reasoning":
      return <ReasoningBlock text={block.text} summary={block.summary} />
    case "text":
      return (
        <div className="text-[0.9rem] leading-7">
          <Markdown>{block.text}</Markdown>
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

// ── Tool call card ───────────────────────────────────────────────────────────

function ToolCallBlockView({ block }: { block: Extract<ContentBlock, { kind: "tool_call" }> }) {
  const running = block.state === "running"
  const isEdit = block.tool === "edit_file"
  const isWrite = block.tool === "write_file"
  const isFileChange = isEdit || isWrite
  const parsed = parseToolArgs(block.args)

  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-border/60 bg-[var(--ring-overlay)]">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded",
            block.state === "error"
              ? "text-destructive"
              : block.state === "done"
                ? "text-emerald-400"
                : "text-muted-foreground",
          )}
        >
          {running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : block.state === "done" ? (
            <SquareCheck className="size-3.5" />
          ) : block.state === "error" ? (
            <CircleAlert className="size-3.5" />
          ) : (
            <SquarePen className="size-3.5" />
          )}
        </span>
        <span className="font-mono text-[12px] font-medium">{block.tool}</span>
        {parsed.path && (
          <span className="truncate font-mono text-[11px] text-muted-foreground">{parsed.path}</span>
        )}
        {block.durationMs != null && (
          <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground/70">
            {formatDuration(block.durationMs)}
          </span>
        )}
      </div>

      {/* Diff or args */}
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

      {/* Result */}
      {block.result && (
        <pre className="border-t border-border/50 bg-white/[0.02] px-3 py-2 font-mono text-[11.5px] leading-5">
          <code>{block.result}</code>
        </pre>
      )}
    </div>
  )
}

// ── Thinking dots ────────────────────────────────────────────────────────────

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
