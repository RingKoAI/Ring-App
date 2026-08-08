import { useState, useRef, useEffect, useCallback, memo } from "react"
import { ArrowUp, ChevronDown, CirclePause, Paperclip, Pencil, Terminal, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import type { Mode, ModelOption } from "./types"
import type { I18nKeys } from "../../i18n"

export interface ComposerEditingState {
  messageId: string
  text: string
}

interface ComposerProps {
  onSend: (text: string, mode: Mode) => void
  onCommand?: (cmd: string) => void
  onAbort?: () => void
  disabled?: boolean
  loading?: boolean
  rcaConnected?: boolean
  model?: string
  models?: ModelOption[]
  onModelChange?: (id: string) => void
  mode?: Mode
  onModeChange?: (mode: Mode) => void
  editingState?: ComposerEditingState | null
  onCancelEdit?: () => void
}

type CmdKey = keyof I18nKeys["cmd"]

type ModeKey = keyof I18nKeys["mode"]

const MODES: { id: Mode; labelKey: ModeKey; descKey: ModeKey }[] = [
  { id: "build", labelKey: "build", descKey: "buildDesc" },
  { id: "edit", labelKey: "edit", descKey: "editDesc" },
  { id: "plan", labelKey: "plan", descKey: "planDesc" },
  { id: "ask", labelKey: "ask", descKey: "askDesc" },
  { id: "agent", labelKey: "agent", descKey: "agentDesc" },
]

const COMMANDS: { name: string; key: CmdKey }[] = [
  { name: "help", key: "help" },
  { name: "clear", key: "clear" },
  { name: "new", key: "new" },
  { name: "model", key: "model" },
  { name: "model refresh", key: "modelRefresh" },
  { name: "model reload", key: "modelReload" },
  { name: "connect", key: "connect" },
  { name: "sessions", key: "sessions" },
  { name: "compact", key: "compact" },
  { name: "think", key: "think" },
  { name: "review", key: "review" },
  { name: "init", key: "init" },
  { name: "reload", key: "reload" },
  { name: "exit", key: "exit" },
]

const MAX_HEIGHT = 224

export const Composer = memo(function Composer({
  onSend,
  onCommand,
  onAbort,
  disabled,
  loading,
  rcaConnected,
  model,
  models,
  onModelChange,
  mode = "build",
  onModeChange,
  editingState,
  onCancelEdit,
}: ComposerProps) {
  const { t } = useI18n()
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [cmdIdx, setCmdIdx] = useState(0)
  const [showModels, setShowModels] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Editing mode: when editingState arrives, load its text and focus ──
  useEffect(() => {
    if (editingState) {
      setText(editingState.text)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(editingState.text.length, editingState.text.length)
      })
    }
  }, [editingState?.messageId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [text])

  const cmdQuery = text.startsWith("/") ? text.slice(1).split(" ")[0].toLowerCase() : null
  const filtered = cmdQuery !== null ? COMMANDS.filter(c => c.name.startsWith(cmdQuery)) : []
  const showPalette = cmdQuery !== null && !text.includes(" ")

  useEffect(() => {
    if (showPalette) setCmdIdx(0)
  }, [showPalette, text])

  function submit() {
    if (loading) return
    if (!text.trim() && files.length === 0) return
    if (editingState) {
      onSend(text.trim(), mode)
      onCancelEdit?.()
      setText("")
      setFiles([])
      return
    }
    if (text.trim().startsWith("/") && onCommand) {
      onCommand(text.trim())
      setText("")
      setFiles([])
      return
    }
    onSend(text.trim(), mode)
    setText("")
    setFiles([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showPalette && filtered.length > 0) {
      if (e.key === "Tab" || e.key === "ArrowDown") {
        e.preventDefault()
        setCmdIdx(i => (i + 1) % filtered.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setCmdIdx(i => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        setText("/" + filtered[cmdIdx].name + " ")
        return
      }
      if (e.key === "Escape") {
        setText("")
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !showPalette) {
      e.preventDefault()
      submit()
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragOver(false), [])

  function removeFile(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  const activeModel = models?.find(m => m.id === model)

  return (
    <div className="border-t border-border/70 bg-background/80 px-4 pb-3 pt-3 backdrop-blur">
      <div className="mx-auto w-full max-w-[800px] px-4">
        <div
          className={cn(
            "relative rounded-2xl border bg-card transition-all duration-200 shadow-sm",
            isDragOver
              ? "border-primary ring-2 ring-primary/30"
              : "border-border focus-within:border-ring/50 focus-within:shadow-md",
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5">
              <span className="text-[13px] font-medium text-primary">{t("composer", "dropFiles")}</span>
            </div>
          )}

          {/* ── Editing banner ── */}
          {editingState && (
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3 text-xs text-muted-foreground">
              <div className="flex min-w-0 items-center gap-1.5">
                <Pencil className="size-3.5 shrink-0" />
                <span className="truncate font-medium">{t("composer", "editing") as string}</span>
              </div>
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3" />
                {t("composer", "cancelEdit") as string}
              </button>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {files.map(f => (
                <span key={f.name} className="flex max-w-[220px] items-center gap-1 rounded-full border bg-background/80 px-2 py-1 text-[11px]">
                  <Paperclip className="size-3 text-muted-foreground" />
                  {f.name}
                  <button type="button" onClick={() => removeFile(f.name)} className="ml-0.5 text-muted-foreground hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            name="ring-composer"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat", "placeholder") as string}
            disabled={disabled}
            rows={1}
            className="block max-h-[224px] w-full resize-none bg-transparent px-4 pt-3 text-[0.9rem] leading-6 outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1">
            <ModeSelector mode={mode} onChange={onModeChange} />

            <button
              type="button"
              title={t("composer", "attach") as string}
              onClick={() => fileInputRef.current?.click()}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--ring-overlay)] hover:text-foreground"
            >
              <Paperclip className="size-4" />
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />

            {models && models.length > 0 && (
              <ModelPicker
                active={activeModel}
                models={models}
                open={showModels}
                onOpenChange={setShowModels}
                onSelect={id => {
                  onModelChange?.(id)
                  setShowModels(false)
                }}
              />
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1 text-[10.5px] text-muted-foreground/70 sm:flex">
                <kbd className="rounded border border-border/60 bg-[var(--ring-overlay)] px-1 font-mono text-[10px]">↵</kbd>
                {t("composer", "sendHint")}
                <kbd className="ml-1 rounded border border-border/60 bg-[var(--ring-overlay)] px-1 font-mono text-[10px]">⇧↵</kbd>
                {t("composer", "newlineHint")}
              </span>
              {loading ? (
                <button
                  type="button"
                  onClick={onAbort}
                  title={t("composer", "stop") as string}
                  className="flex size-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-accent"
                >
                  <CirclePause className="size-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={disabled || (!text.trim() && files.length === 0)}
                  title={t("composer", "send") as string}
                  className="flex size-8 items-center justify-center rounded-full transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ color: "var(--primary)" }}
                >
                  <ArrowUp className="size-[22px]" />
                </button>
              )}
            </div>
          </div>

          {showPalette && filtered.length > 0 && (
            <div className="absolute bottom-full left-2 mb-1.5 w-72 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.name}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    i === cmdIdx ? "bg-[var(--ring-overlay)]" : "hover:bg-[var(--ring-overlay)]",
                  )}
                  onMouseDown={e => {
                    e.preventDefault()
                    setText("/" + cmd.name + " ")
                  }}
                  onMouseEnter={() => setCmdIdx(i)}
                >
                  <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium">/{cmd.name}</span>
                  <span className="ml-auto truncate text-[11px] text-muted-foreground">{t("cmd", cmd.key)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-center">
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/70">
            <span className={cn("size-1.5 rounded-full", loading ? "bg-amber-400" : rcaConnected ? "bg-emerald-400" : "bg-muted-foreground/50")} />
            {loading ? t("chat", "working") : rcaConnected ? t("sidebar", "connected") : t("sidebar", "disconnected")}
          </span>
        </div>
      </div>
    </div>
  )
})

function ModelPicker({
  active,
  models,
  open,
  onOpenChange,
  onSelect,
}: {
  active?: ModelOption
  models: ModelOption[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (id: string) => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-1 rounded-lg border border-border/70 bg-[var(--ring-overlay)] px-2 py-1 text-[11.5px] font-medium transition-colors hover:bg-[var(--ring-overlay)]"
      >
        <span className="max-w-[140px] truncate">{active?.label ?? "Model"}</span>
        <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => onOpenChange(false)} />
          <div className="absolute bottom-full left-0 z-30 mb-1.5 max-h-72 w-60 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
            {models.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--ring-overlay)]",
                  active?.id === m.id && "bg-[var(--ring-overlay)]",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{m.label}</span>
                {m.provider && <span className="shrink-0 text-[10px] text-muted-foreground">{m.provider}</span>}
                {m.badge && (
                  <span className="shrink-0 rounded bg-primary/15 px-1 py-px text-[9px] font-medium uppercase text-primary">{m.badge}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Mode selector (compact dropdown) ─────────────────────────────────────────

function ModeSelector({ mode, onChange }: { mode: Mode; onChange?: (m: Mode) => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const activeMode = MODES.find(m => m.id === mode) ?? MODES[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={t("mode", activeMode.descKey) as string}
        className="flex items-center gap-1 rounded-lg border border-border/70 bg-[var(--ring-overlay)] px-2 py-1 text-[11.5px] font-medium transition-colors hover:bg-[var(--ring-overlay)]"
      >
        <span>{t("mode", activeMode.labelKey)}</span>
        <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-30 mb-1.5 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
            {MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange?.(m.id)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--ring-overlay)]",
                  mode === m.id && "bg-[var(--ring-overlay)]",
                )}
              >
                <span className="flex items-center gap-1.5 text-[12px] font-medium">
                  {mode === m.id && <span className="size-1.5 rounded-full bg-primary" />}
                  {mode !== m.id && <span className="size-1.5" />}
                  {t("mode", m.labelKey)}
                </span>
                <span className="pl-3 text-[10.5px] text-muted-foreground">{t("mode", m.descKey)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
