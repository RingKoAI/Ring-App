import { useRef, useEffect, useCallback } from "react"
import { ThreadTurn } from "./MessageBubble"
import { Composer } from "./Composer"
import { useI18n } from "../../hooks/useI18n"
import { CatIcon } from "../CatIcon"
import type { Message, Mode, ModelOption } from "./types"

interface ChatViewProps {
  messages: Message[]
  onSend: (text: string, mode: Mode) => void
  onCommand?: (cmd: string) => void
  onAbort?: () => void
  loading?: boolean
  rcaConnected?: boolean
  model?: string
  models?: ModelOption[]
  onModelChange?: (id: string) => void
  mode?: Mode
  onModeChange?: (mode: Mode) => void
}

export function ChatView({
  messages,
  onSend,
  onCommand,
  onAbort,
  loading,
  rcaConnected,
  model,
  models,
  onModelChange,
  mode = "build",
  onModeChange,
}: ChatViewProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedToBottom.current = distance < 96
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !pinnedToBottom.current) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const hasTurns = messages.some(m => m.role !== "system")

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        {hasTurns ? (
          <div className="pb-6">
            {messages.map(msg => (
              <ThreadTurn key={msg.id} message={msg} />
            ))}
            {loading && <StreamingPlaceholder label={t("thread", "thinking") as string} />}
          </div>
        ) : (
          <EmptyState rcaConnected={rcaConnected} />
        )}
      </div>
      <Composer
        onSend={onSend}
        onCommand={onCommand}
        onAbort={onAbort}
        disabled={loading}
        rcaConnected={rcaConnected}
        model={model}
        models={models}
        onModelChange={onModelChange}
        mode={mode}
        onModeChange={onModeChange}
        loading={loading}
      />
    </div>
  )
}

function StreamingPlaceholder({ label }: { label: string }) {
  return (
    <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-4 py-3.5 text-muted-foreground">
      {[0, 1, 2].map(i => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
      <span className="ml-1 text-[12px]">{label}…</span>
    </div>
  )
}

function EmptyState({ rcaConnected }: { rcaConnected?: boolean }) {
  const { t } = useI18n()
  const suggestions = [
    { title: t("empty", "s1Title"), hint: t("empty", "s1Hint") },
    { title: t("empty", "s2Title"), hint: t("empty", "s2Hint") },
    { title: t("empty", "s3Title"), hint: t("empty", "s3Hint") },
    { title: t("empty", "s4Title"), hint: t("empty", "s4Hint") },
  ]
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
        <CatIcon className="size-7" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{t("empty", "title")}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{t("empty", "desc")}</p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map(s => (
          <div key={s.title as string} className="rounded-xl border border-border/70 bg-[var(--ring-overlay)] p-3 text-left transition-colors hover:border-border">
            <div className="text-[13px] font-medium">{s.title}</div>
            <div className="text-[11.5px] text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </div>
      {!rcaConnected && (
        <p className="mt-6 text-[11.5px] text-muted-foreground/70">
          {t("empty", "notConnected")} <span className="font-medium text-muted-foreground">{t("header", "settings")}</span> {t("empty", "notConnectedHint")}
        </p>
      )}
    </div>
  )
}
