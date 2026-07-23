import { useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Key, Eye, EyeOff, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { PROVIDER_CATALOG, matchProvider, listProviders } from "../../config/providers"
import { useI18n } from "../../hooks/useI18n"

export interface ProviderConfig {
  id: string
  name: string
  type: string
  apiKey: string
  baseUrl: string
  defaultModel: string
  enabled: boolean
}

interface AgentSettingsProps {
  configs: ProviderConfig[]
  onSave: (configs: ProviderConfig[]) => void
}

let nextId = 100

type TestStatus = "idle" | "testing" | "success" | "error"

export function AgentSettings({ configs, onSave }: AgentSettingsProps) {
  const { t } = useI18n()
  const [local, setLocal] = useState<ProviderConfig[]>(configs)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [testStatus, setTestStatus] = useState<Record<string, TestStatus>>({})

  function update(id: string, field: keyof ProviderConfig, value: string | boolean) {
    setLocal(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function remove(id: string) {
    setLocal(prev => prev.filter(p => p.id !== id))
  }

  function addProvider(info: typeof PROVIDER_CATALOG[keyof typeof PROVIDER_CATALOG]) {
    const id = `prov_${nextId++}`
    setLocal(prev => [...prev, {
      id, name: info.name, type: info.type,
      apiKey: "", baseUrl: info.baseUrl, defaultModel: info.defaultModel, enabled: false,
    }])
  }

  function addCustom() {
    const id = `prov_${nextId++}`
    setLocal(prev => [...prev, {
      id, name: "", type: "openai-compatible",
      apiKey: "", baseUrl: "", defaultModel: "", enabled: false,
    }])
  }

  async function testConnection(id: string) {
    setTestStatus(prev => ({ ...prev, [id]: "testing" }))
    const cfg = local.find(p => p.id === id)
    if (!cfg || !cfg.apiKey) {
      setTestStatus(prev => ({ ...prev, [id]: "error" }))
      return
    }
    try {
      const baseUrl = cfg.baseUrl.replace(/\/+$/, "")
      const url = cfg.type === "anthropic" ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (cfg.type === "anthropic") {
        headers["x-api-key"] = cfg.apiKey
        headers["anthropic-version"] = "2023-06-01"
      } else {
        headers["Authorization"] = `Bearer ${cfg.apiKey}`
      }
      const body = cfg.type === "anthropic"
        ? JSON.stringify({ model: cfg.defaultModel || "claude-sonnet-4-6", max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
        : JSON.stringify({ model: cfg.defaultModel || "gpt-4o", max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
      const res = await fetch(url, { method: "POST", headers, body })
      if (res.ok) {
        setTestStatus(prev => ({ ...prev, [id]: "success" }))
      } else {
        setTestStatus(prev => ({ ...prev, [id]: "error" }))
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [id]: "error" }))
    }
  }

  const unusedPresets = listProviders().filter(p => !local.some(l => l.name === p.name))

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">{t("settings", "llmProviders") as string}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "llmProvidersDesc") as string}</p>
      </div>

      {/* Preset quick-add */}
      <div className="flex flex-wrap gap-1.5">
        {unusedPresets.slice(0, 8).map(p => (
          <Button key={p.id} variant="outline" size="sm" className="text-xs" onClick={() => addProvider(p)}>
            <Plus className="mr-1 size-3" />{p.name}
          </Button>
        ))}
        {unusedPresets.length > 8 && (
          <select
            onChange={e => { const p = PROVIDER_CATALOG[e.target.value]; if (p) addProvider(p); e.target.value = "" }}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">{t("settings", "more") as string}</option>
            {unusedPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <Button variant="outline" size="sm" className="text-xs" onClick={addCustom}>
          <Plus className="mr-1 size-3" />{t("settings", "custom") as string}
        </Button>
      </div>

      {/* Provider list */}
      <div className="space-y-2">
        {local.map(cfg => (
          <div key={cfg.id} className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={cfg.name}
                onChange={e => {
                  update(cfg.id, "name", e.target.value)
                  const match = matchProvider(e.target.value)
                  if (match && !cfg.baseUrl) {
                    update(cfg.id, "baseUrl", match.baseUrl)
                    update(cfg.id, "type", match.type)
                    update(cfg.id, "defaultModel", match.defaultModel)
                  }
                }}
                placeholder={t("settings", "providerName") as string}
                className="h-7 flex-1 text-xs font-medium"
              />
              <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => remove(cfg.id)}>
                <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>

            <div className="mt-2 space-y-2">
              <div className="relative">
                <Input
                  value={cfg.apiKey}
                  onChange={e => update(cfg.id, "apiKey", e.target.value)}
                  type={showKey[cfg.id] ? "text" : "password"}
                  placeholder={cfg.type === "ollama" || !cfg.type ? t("settings", "apiKeyLocal") as string : t("settings", "apiKey") as string}
                  className="pr-8 text-xs"
                />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 size-6 -translate-y-1/2" onClick={() => setShowKey(prev => ({ ...prev, [cfg.id]: !prev[cfg.id] }))}>
                  {showKey[cfg.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </Button>
              </div>
              <Input
                value={cfg.baseUrl}
                onChange={e => update(cfg.id, "baseUrl", e.target.value)}
                placeholder={t("settings", "baseUrlPh") as string}
                className="text-xs"
              />
              <div className="flex items-center gap-2">
                <Input
                  value={cfg.defaultModel}
                  onChange={e => update(cfg.id, "defaultModel", e.target.value)}
                  placeholder={t("settings", "defaultModel") as string}
                  className="flex-1 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  disabled={testStatus[cfg.id] === "testing" || !cfg.apiKey}
                  onClick={() => testConnection(cfg.id)}
                >
                  {testStatus[cfg.id] === "testing" ? <Loader2 className="size-3 animate-spin" /> :
                   testStatus[cfg.id] === "success" ? <CheckCircle2 className="size-3 text-green-500" /> :
                   testStatus[cfg.id] === "error" ? <XCircle className="size-3 text-red-500" /> : null}
                  {t("settings", "test") as string}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {local.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("settings", "noProviders") as string}</p>
        )}
      </div>

      {/* OAuth placeholder */}
      <div className="rounded-lg border border-dashed p-3 opacity-50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Key className="size-3" />
          <span>{t("settings", "oauthTodo") as string}</span>
        </div>
      </div>

      <Button className="w-full" size="sm" onClick={() => onSave(local)}>
        {t("settings", "save") as string}
      </Button>
    </div>
  )
}
