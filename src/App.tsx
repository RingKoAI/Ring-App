import { useState, useCallback, useEffect } from "react"
import "./App.css"
import { Sidebar } from "./components/layout/Sidebar"
import { Header } from "./components/layout/Header"
import { ChatView } from "./components/chat/ChatView"
import { SettingsPanel } from "./components/settings/SettingsPanel"
import type { ProviderConfig } from "./components/settings/AgentSettings"
import type { Mode, Transport } from "./components/chat/types"
import { useChat } from "./hooks/useChat"
import { useI18n } from "./hooks/useI18n"

function App() {
  const { t } = useI18n()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("build")
  const [model, setModel] = useState<string>(() => { try { return localStorage.getItem("ring-model") || "" } catch { return "" } })
  const [transport, setTransport] = useState<Transport>(() => { try { return (localStorage.getItem("ring-transport") as Transport) || "sdk" } catch { return "sdk" } })
  const [httpUrl, setHttpUrl] = useState(() => { try { return localStorage.getItem("ring-http-url") || "http://127.0.0.1:8765" } catch { return "http://127.0.0.1:8765" } })
  const [rcaUrl, setRcaUrl] = useState(() => { try { return localStorage.getItem("rca_url") || "" } catch { return "" } })
  const [rcaToken, setRcaToken] = useState(() => { try { return localStorage.getItem("rca_token") || "" } catch { return "" } })
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("provider_configs") || "[]")
    } catch {
      return []
    }
  })

  const chat = useChat({
    transport,
    httpUrl,
    rcaUrl,
    rcaToken,
    model,
    readyMessage: t("chat", "ready"),
    messagesLabel: t("chat", "messages"),
    notConnectedMessage: t("chat", "notConnected"),
  })

  // auto-select first model when catalog arrives and none chosen
  useEffect(() => {
    if (chat.models.length > 0 && !chat.models.some(m => m.id === model)) {
      const first = chat.models[0].id
      setModel(first)
      localStorage.setItem("ring-model", first)
    }
  }, [chat.models, model])

  // Auto-connect on mount
  useEffect(() => {
    chat.connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport])

  const handleSend = useCallback(
    (text: string, sendMode: Mode) => {
      chat.send(text, sendMode)
    },
    [chat],
  )

  const handleCommand = useCallback(
    (raw: string) => {
      const body = raw.replace(/^\//, "")
      const [name, ...rest] = body.split(/\s+/)
      const arg = rest.join(" ")
      chat.pushMessage({ id: crypto.randomUUID(), role: "system", content: `/${name}${arg ? " " + arg : ""}`, timestamp: Date.now() })

      switch (name) {
        case "clear":
        case "new":
          chat.clear()
          return

        case "model": {
          if (arg && arg !== "refresh" && arg !== "reload") {
            handleModelChange(arg)
            return
          }
          chat.pushMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: `${t("cmdMsg", "cliOnly")}: ring /${body}`,
            timestamp: Date.now(),
          })
          return
        }

        case "help":
        case "sessions":
          chat.pushMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: `${t("cmdMsg", "cliOnly")}: ring /${name}`,
            timestamp: Date.now(),
          })
          return

        case "compact":
        case "think":
        case "connect":
        case "review":
        case "init":
        case "reload":
        case "exit":
          chat.pushMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: t("cmdMsg", "unavailable"),
            timestamp: Date.now(),
          })
          return

        default:
          chat.pushMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: t("cmdMsg", "unknown"),
            timestamp: Date.now(),
          })
          return
      }
    },
    [chat, t],
  )

  function handleModelChange(id: string) {
    setModel(id)
    localStorage.setItem("ring-model", id)
  }

  function handleSaveSettings(s: { httpUrl: string; rcaUrl: string; rcaToken: string; transport: Transport }) {
    localStorage.setItem("ring-http-url", s.httpUrl)
    localStorage.setItem("rca_url", s.rcaUrl)
    localStorage.setItem("rca_token", s.rcaToken)
    localStorage.setItem("ring-transport", s.transport)
    setHttpUrl(s.httpUrl)
    setRcaUrl(s.rcaUrl)
    setRcaToken(s.rcaToken)
    setTransport(s.transport)
    chat.disconnect()
    chat.connect()
  }

  function handleSaveProviders(configs: ProviderConfig[]) {
    localStorage.setItem("provider_configs", JSON.stringify(configs))
    setProviderConfigs(configs)
  }

  const activeModelLabel = chat.models.find(m => m.id === model)?.label
  const connected = chat.status === "connected"

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar
        sessions={chat.sessions}
        activeSession={chat.activeSessionId ?? ""}
        onSelect={(id) => chat.loadSession(id)}
        onNew={() => chat.clear()}
        rcaConnected={connected}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          model={connected ? activeModelLabel : undefined}
          onSettings={() => setSettingsOpen(true)}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
          onNew={() => chat.clear()}
        />
        {chat.localError === "not_found" && transport === "sdk" && (
          <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[12px] text-amber-500">
            {t("transport", "notFound")}
          </div>
        )}
        {chat.status === "error" && transport === "rca" && (
          <div className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-[12px] text-destructive">
            <span>{t("rca", "error")}</span>
            <button className="underline hover:no-underline" onClick={() => chat.connect()}>
              {t("app", "retry")}
            </button>
          </div>
        )}
        {chat.status === "error" && transport === "http" && (
          <div className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-[12px] text-destructive">
            <span>{t("transport", "unreachable")}</span>
            <button className="underline hover:no-underline" onClick={() => chat.connect()}>
              {t("app", "retry")}
            </button>
          </div>
        )}
        <ChatView
          messages={chat.messages}
          onSend={handleSend}
          onCommand={handleCommand}
          onAbort={chat.abort}
          loading={chat.loading}
          rcaConnected={connected}
          model={model}
          models={chat.models.length > 0 ? chat.models : undefined}
          onModelChange={handleModelChange}
          mode={mode}
          onModeChange={setMode}
        />
      </div>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={{ httpUrl, rcaUrl, rcaToken, transport }}
        onSave={handleSaveSettings}
        rcaConnected={connected}
        providerConfigs={providerConfigs}
        onSaveProviders={handleSaveProviders}
        serverProvider={chat.serverProvider}
        transport={transport}
      />
    </div>
  )
}

export default App
