import { useState, useEffect, useRef } from "react"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import {
  X, Server, Palette, Info, Bot, ChevronRight,
  Braces, Eye, Save, CheckCircle2, AlertCircle, FolderOpen,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import type { Transport } from "../chat/types"
import { GeneralTab } from "./GeneralTab"
import { AppearanceTab } from "./AppearanceTab"
import { AboutTab } from "./AboutTab"
import { ProvidersTab } from "./ProvidersTab"
import type { UseRingConfigReturn } from "../../hooks/useRingConfig"

// ── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  httpUrl: string
  rcaUrl: string
  rcaToken: string
  transport: Transport
}

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: Settings
  onSave: (s: Settings) => void
  rcaConnected: boolean
  ringConfig: UseRingConfigReturn
}

type SettingsTab = "general" | "providers" | "appearance" | "about"
type EditMode = "visual" | "json"

// ── Component ────────────────────────────────────────────────────────────────

export function SettingsPanel({
  open,
  onClose,
  settings,
  onSave,
  rcaConnected,
  ringConfig,
}: SettingsPanelProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<SettingsTab>("general")
  const [editMode, setEditMode] = useState<EditMode>("visual")

  // Connection form state
  const [url, setUrl] = useState(settings.rcaUrl)
  const [token, setToken] = useState(settings.rcaToken)
  const [httpUrl, setHttpUrl] = useState(settings.httpUrl)
  const [transportMode, setTransportMode] = useState<Transport>(settings.transport)

  // JSON edit state
  const [jsonDraft, setJsonDraft] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [jsonSynced, setJsonSynced] = useState(true)

  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // ── Focus trap ──
  useEffect(() => {
    if (!open) return
    const active = document.activeElement
    previousFocusRef.current = active instanceof HTMLElement ? active : null
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    modalRef.current?.querySelectorAll<HTMLElement>(selector)[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return }
      if (e.key !== "Tab") return
      const els = modalRef.current?.querySelectorAll<HTMLElement>(selector)
      if (!els || els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  // ── Sync JSON draft ──
  useEffect(() => {
    if (editMode === "json") {
      const data = getTabJsonData(tab, ringConfig)
      setJsonDraft(JSON.stringify(data, null, 2))
      setJsonError(null)
      setJsonSynced(true)
    }
  }, [editMode, tab])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── JSON validation ──
  useEffect(() => {
    if (editMode !== "json" || jsonSynced) return
    try { JSON.parse(jsonDraft); setJsonError(null) }
    catch (e) { setJsonError(String(e).replace(/^SyntaxError:\s*/, "")) }
  }, [jsonDraft, editMode, jsonSynced])

  function applyJsonDraft() {
    if (jsonError) return false
    try {
      const parsed = JSON.parse(jsonDraft)
      applyTabJsonData(tab, parsed, ringConfig)
      setJsonSynced(true)
      return true
    } catch { return false }
  }

  async function handleSave() {
    if (editMode === "json" && !jsonSynced) {
      if (!applyJsonDraft()) return
    }
    await ringConfig.save()
    onSave({ httpUrl, rcaUrl: url, rcaToken: token, transport: transportMode })
  }

  function handleClose() {
    if (ringConfig.dirty || hasTransportChanges()) ringConfig.reload()
    onClose()
  }

  function hasTransportChanges() {
    return url !== settings.rcaUrl ||
      token !== settings.rcaToken ||
      httpUrl !== settings.httpUrl ||
      transportMode !== settings.transport
  }

  const tabs: { id: SettingsTab; label: string; icon: typeof Server }[] = [
    { id: "general",    label: t("settings", "general") as string,    icon: Server },
    { id: "providers",  label: t("settings", "providers") as string,  icon: Bot },
    { id: "appearance", label: t("settings", "appearance") as string, icon: Palette },
    { id: "about",      label: t("settings", "about") as string,      icon: Info },
  ]

  const showModeToggle = tab === "providers" || tab === "general"
  const dirty = ringConfig.dirty || (editMode === "json" && !jsonSynced) || hasTransportChanges()

  if (!open) return null

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex h-[85vh] max-h-[calc(100vh-2rem)] w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
      >
        {/* ── Top bar ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 id="settings-title" className="text-base font-semibold">{t("settings", "title") as string}</h2>
            {ringConfig.error && (
              <span className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="size-3" />
                {ringConfig.error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showModeToggle && <ModeToggle mode={editMode} onChange={setEditMode} />}
            <Button variant="ghost" size="icon" className="size-7" onClick={handleClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar nav */}
          <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/30 p-2">
            {tabs.map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                  tab === tabItem.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <tabItem.icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{tabItem.label}</span>
                {tab === tabItem.id && <ChevronRight className="size-3 shrink-0" />}
              </button>
            ))}

            {/* Config path footer */}
            <div className="mt-auto space-y-1 border-t border-border/50 pt-2">
              {ringConfig.ringHome && (
                <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground/70">
                  <FolderOpen className="size-2.5 shrink-0" />
                  <span className="truncate" title={ringConfig.ringHome}>{ringConfig.ringHome}</span>
                </div>
              )}
            </div>
          </nav>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-5">
                {editMode === "json" && showModeToggle ? (
                  <JsonEditor
                    value={jsonDraft}
                    onChange={v => { setJsonDraft(v); setJsonSynced(false) }}
                    error={jsonError}
                    path={tab === "providers" ? "providers" : "config"}
                  />
                ) : (
                  renderTabContent()
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {dirty ? (
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    Unsaved changes
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    {t("settings", "jsonSaved") as string}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  {t("settings", "cancel") as string}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty || (editMode === "json" && !!jsonError)}
                  className="gap-1.5"
                >
                  <Save className="size-3.5" />
                  {t("settings", "save") as string}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function renderTabContent() {
    switch (tab) {
      case "general":
        return <GeneralTab
          rcaConnected={rcaConnected}
          transportMode={transportMode}
          setTransportMode={setTransportMode}
          httpUrl={httpUrl}
          setHttpUrl={setHttpUrl}
          url={url}
          setUrl={setUrl}
          token={token}
          setToken={setToken}
          settingsPath={ringConfig.settingsPath}
          ringHome={ringConfig.ringHome}
        />
      case "providers":
        return <ProvidersTab ringConfig={ringConfig} />
      case "appearance":
        return <AppearanceTab />
      case "about":
        return <AboutTab />
    }
  }
}

// ── Mode toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: EditMode; onChange: (m: EditMode) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5">
      <button
        onClick={() => onChange("visual")}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
          mode === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Eye className="size-3" />
        {t("settings", "visualMode") as string}
      </button>
      <button
        onClick={() => onChange("json")}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
          mode === "json" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Braces className="size-3" />
        {t("settings", "jsonMode") as string}
      </button>
    </div>
  )
}

// ── JSON editor ──────────────────────────────────────────────────────────────

function JsonEditor({
  value,
  onChange,
  error,
  path,
}: {
  value: string
  onChange: (v: string) => void
  error: string | null
  path: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">
          ~/.ring/config/settings.jsonc → "{path}"
        </span>
        {error && (
          <span className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="size-3" />
            {error}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        rows={22}
        className="w-full rounded-lg border border-border bg-[var(--ring-code-bg)] p-3 font-mono text-[12px] leading-5 text-foreground outline-none focus:border-ring/60 focus:ring-1 focus:ring-ring/30"
      />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTabJsonData(tab: SettingsTab, ringConfig: UseRingConfigReturn): unknown {
  if (tab === "providers") return ringConfig.config.providers ?? {}
  const { providers, ...rest } = ringConfig.config
  return rest
}

function applyTabJsonData(tab: SettingsTab, parsed: unknown, ringConfig: UseRingConfigReturn): void {
  if (tab === "providers") {
    ringConfig.patchConfig({ providers: parsed as Record<string, import("../../types/config").ProviderEntry> })
  } else {
    ringConfig.patchConfig({ ...(parsed as Record<string, unknown>), providers: ringConfig.config.providers })
  }
}
