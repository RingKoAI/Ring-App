import { useState, useEffect, useRef } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Separator } from "../ui/separator"
import { ScrollArea } from "../ui/scroll-area"
import { X, Wifi, WifiOff, Server, Palette, Info, ChevronRight, Languages, Bot, AlertTriangle } from "lucide-react"
import { useI18n } from "../../hooks/useI18n"
import { useTheme, type ThemeMode } from "../../hooks/useTheme"
import { LANGUAGES } from "../../i18n"
import type { Transport } from "../chat/types"
import { AgentSettings, type ProviderConfig } from "./AgentSettings"

interface ServerProvider {
  id: string
  name: string
  default_model: string
  active_model: string
}

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
  providerConfigs: ProviderConfig[]
  onSaveProviders: (configs: ProviderConfig[]) => void
  serverProvider?: ServerProvider | null
  transport?: Transport
}

type SettingsTab = "general" | "agent" | "appearance" | "about"

export function SettingsPanel({ open, onClose, settings, onSave, rcaConnected, providerConfigs, onSaveProviders, serverProvider, transport }: SettingsPanelProps) {
  const { t, lang, setLang } = useI18n()
  const { mode: themeMode, setTheme } = useTheme()
  const [tab, setTab] = useState<SettingsTab>("general")
  const [url, setUrl] = useState(settings.rcaUrl)
  const [token, setToken] = useState(settings.rcaToken)
  const [httpUrl, setHttpUrl] = useState(settings.httpUrl)
  const [transportMode, setTransportMode] = useState<Transport>(settings.transport)

  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    const active = document.activeElement
    previousFocusRef.current = active instanceof HTMLElement ? active : null

    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    modalRef.current?.querySelectorAll<HTMLElement>(selector)[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab") return

      const els = modalRef.current?.querySelectorAll<HTMLElement>(selector)
      if (!els || els.length === 0) return

      const first = els[0]
      const last = els[els.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  const tabs: { id: SettingsTab; label: string; icon: typeof Server }[] = [
    { id: "general", label: t("settings", "general") as string, icon: Server },
    { id: "agent", label: t("settings", "agent") as string, icon: Bot },
    { id: "appearance", label: t("settings", "appearance") as string, icon: Palette },
    { id: "about", label: t("settings", "about") as string, icon: Info },
  ]

  if (!open) return null

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-panel-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex bg-black/20"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="mx-auto flex w-full max-w-2xl flex-col bg-background shadow-2xl sm:my-8 sm:rounded-xl sm:border sm:shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="settings-panel-title" className="text-sm font-semibold">{t("settings", "title") as string}</h2>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          <nav className="flex shrink-0 gap-1 border-b p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r">
            {tabs.map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  tab === tabItem.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <tabItem.icon className="size-4" />
                <span className="flex-1">{tabItem.label}</span>
                <ChevronRight className="size-3 sm:hidden" />
              </button>
            ))}
          </nav>

          <ScrollArea className="flex-1 p-4">
            {tab === "general" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium">{t("settings", "connection") as string}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "connectionDesc") as string}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t("settings", "transportLabel") as string}</label>
                  <div className="grid gap-2">
                    {(["sdk", "http", "rca"] as Transport[]).map(tr => (
                      <button
                        key={tr}
                        onClick={() => setTransportMode(tr)}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                          transportMode === tr ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                        }`}
                      >
                        <div className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${transportMode === tr ? "border-primary" : "border-muted-foreground/40"}`}>
                          {transportMode === tr && <div className="m-auto mt-[3px] size-1.5 rounded-full bg-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium">{t("transport", tr)}</div>
                          <div className="text-[11px] text-muted-foreground">{t("transport", tr === "sdk" ? "sdkDesc" : tr === "http" ? "httpDesc" : "rcaDesc")}</div>
                          {tr === "rca" && (
                            <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[10.5px] leading-snug text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="mt-px size-3 shrink-0" />
                              <span>{t("transport", "rcaWarning")}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  {rcaConnected ? <Wifi className="size-4 text-emerald-500" /> : <WifiOff className="size-4 text-muted-foreground" />}
                  <span className="text-xs">{rcaConnected ? t("settings", "connected") as string : t("settings", "disconnected") as string}</span>
                </div>

                {transportMode === "http" && (
                  <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <label className="text-xs text-muted-foreground">{t("transport", "httpUrl") as string}</label>
                    <Input value={httpUrl} onChange={e => setHttpUrl(e.target.value)} placeholder={t("transport", "httpUrlPh") as string} className="text-xs" />
                  </div>
                )}

                {transportMode === "rca" && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-start gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" />
                      <span>{t("transport", "rcaWarning")}</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{t("settings", "serverUrl") as string}</label>
                      <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="ws://host:8080" className="text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{t("settings", "authToken") as string}</label>
                      <Input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="optional" className="text-xs" />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => onSave({ httpUrl, rcaUrl: url, rcaToken: token, transport: transportMode })}
                >
                  {rcaConnected ? t("settings", "reconnect") as string : t("settings", "connect") as string}
                </Button>
              </div>
            )}

            {tab === "agent" && (
              <div className="space-y-5">
                {serverProvider && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-primary" />
                      <span className="text-[13px] font-medium">{t("settings", "agent") as string} · {t("settings", "server") as string}</span>
                      <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-500">{t("settings", "activeBadge") as string}</span>
                    </div>
                    <div className="mt-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("settings", "providerLabel") as string}</span>
                        <span className="font-medium">{serverProvider.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("settings", "idLabel") as string}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{serverProvider.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("settings", "modelLabel") as string}</span>
                        <span className="font-medium">{serverProvider.active_model}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground/70">
                      {transport === "http"
                        ? t("settings", "configuredOnServer") as string
                        : t("settings", "managedByServer") as string}
                    </p>
                  </div>
                )}
                <AgentSettings configs={providerConfigs} onSave={onSaveProviders} />
              </div>
            )}
            {tab === "appearance" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium">{t("settings", "appearance") as string}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "appearanceDesc") as string}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t("settings", "theme") as string}</label>
                  <div className="flex gap-2">
                    {(["system", "light", "dark"] as ThemeMode[]).map(th => (
                      <Button
                        key={th}
                        variant={themeMode === th ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setTheme(th)}
                      >
                        {t("settings", th) as string}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    <Languages className="mr-1 inline size-3" />
                    {t("settings", "language") as string}
                  </label>
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value as any)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium">{t("settings", "about") as string}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "aboutDesc") as string}</p>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t("settings", "version") as string}</span>
                    <span className="text-foreground">0.1.0</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>{t("settings", "runtime") as string}</span>
                    <span className="text-foreground">Tauri + React</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>{t("settings", "license") as string}</span>
                    <span className="text-foreground">AGPL-3.0</span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
