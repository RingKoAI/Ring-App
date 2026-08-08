import { useRef, useEffect, useCallback, useState } from "react"
import { ThreadTurn } from "./MessageBubble"
import { Composer, type ComposerEditingState } from "./Composer"
import { useI18n } from "../../hooks/useI18n"
import { RingIcon } from "../RingIcon"
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
  onEditMessage?: (messageId: string, newText: string, mode: Mode) => void
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
  onEditMessage,
}: ChatViewProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)

  const editingState: ComposerEditingState | null = editingMessage
    ? { messageId: editingMessage.id, text: editingMessage.content }
    : null

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
              <ThreadTurn
                key={msg.id}
                message={msg}
                onEdit={msg.role === "user" && onEditMessage ? (m) => setEditingMessage(m) : undefined}
              />
            ))}
            {loading && <StreamingPlaceholder label={t("thread", "thinking") as string} />}
          </div>
        ) : (
          <EmptyState rcaConnected={rcaConnected} onPick={onSend} mode={mode} />
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
        editingState={editingState}
        onCancelEdit={() => setEditingMessage(null)}
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

function EmptyState({ rcaConnected, onPick, mode }: { rcaConnected?: boolean; onPick?: (text: string, mode: Mode) => void; mode: Mode }) {
  const { t } = useI18n()
  const suggestions = [
    { title: t("empty", "s1Title"), hint: t("empty", "s1Hint"), prompt: t("empty", "s1Prompt") },
    { title: t("empty", "s2Title"), hint: t("empty", "s2Hint"), prompt: t("empty", "s2Prompt") },
    { title: t("empty", "s3Title"), hint: t("empty", "s3Hint"), prompt: t("empty", "s3Prompt") },
    { title: t("empty", "s4Title"), hint: t("empty", "s4Hint"), prompt: t("empty", "s4Prompt") },
  ]
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center">
        <RingIcon className="size-16 text-primary" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-medium tracking-tight text-foreground">{t("empty", "title")}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("empty", "desc")}</p>
      </div>
      <div className="mt-4 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map(s => (
          <button
            key={s.title as string}
            onClick={() => onPick?.(s.prompt as string, mode)}
            className="rounded-xl border border-border/60 bg-card p-3 text-left transition-all hover:border-border hover:shadow-sm active:scale-[0.99]"
          >
            <div className="text-[13px] font-medium">{s.title}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{s.hint}</div>
          </button>
        ))}
      </div>
      {!rcaConnected && (
        <p className="mt-4 text-[11.5px] text-muted-foreground/70">
          {t("empty", "notConnected")} <span className="font-medium text-muted-foreground">{t("header", "settings")}</span> {t("empty", "notConnectedHint")}
        </p>
      )}
    </div>
  )
}
