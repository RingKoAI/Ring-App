import { useState, useMemo } from "react"
import {
  ArrowLeft, Bot, ChevronRight, Eye, EyeOff, Key, Plus,
  Search, Server, Trash2, X, Cpu,
} from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { cn } from "../../lib/utils"
import { useI18n } from "../../hooks/useI18n"
import type { UseRingConfigReturn } from "../../hooks/useRingConfig"
import type { ProviderEntry, ProviderType } from "../../types/config"

// ── Provider type labels ─────────────────────────────────────────────────────

const PROVIDER_TYPES: { value: ProviderType; labelKey: "typeAnthropic" | "typeOpenai" | "typeOpenaiResponses" | "typeOpenaiCompatible" | "typeGemini" | "typeOllamaNative" }[] = [
  { value: "anthropic", labelKey: "typeAnthropic" },
  { value: "openai", labelKey: "typeOpenai" },
  { value: "openai-responses", labelKey: "typeOpenaiResponses" },
  { value: "openai-compatible", labelKey: "typeOpenaiCompatible" },
  { value: "gemini", labelKey: "typeGemini" },
  { value: "ollama-native", labelKey: "typeOllamaNative" },
]

// ── Component ────────────────────────────────────────────────────────────────

export function ProvidersTab({ ringConfig }: { ringConfig: UseRingConfigReturn }) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)

  const providers = ringConfig.config.providers ?? {}
  const models = ringConfig.config.models ?? {}
  const entries = useMemo(() => Object.entries(providers), [providers])

  const filtered = search
    ? entries.filter(([id, p]) =>
        id.toLowerCase().includes(search.toLowerCase()) ||
        (p.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : entries

  const selected = selectedId ? providers[selectedId] : null
  const selectedModels = selectedId ? (models[selectedId] ?? []) : []

  function handleAdd(id: string) {
    ringConfig.setProvider(id, { type: "openai-compatible" })
    setAdding(false)
    setSelectedId(id)
  }

  function handleDelete(id: string) {
    ringConfig.removeProvider(id)
    // Also clean up models map
    if (models[id]) {
      const nextModels = { ...models }
      delete nextModels[id]
      ringConfig.patchConfig({ models: nextModels })
    }
    setSelectedId(null)
  }

  function handleModelAdd(modelId: string) {
    if (!selectedId || !modelId.trim()) return
    const current = models[selectedId] ?? []
    if (current.includes(modelId.trim())) return
    const next = { ...models, [selectedId]: [...current, modelId.trim()] }
    ringConfig.patchConfig({ models: next })
  }

  function handleModelRemove(modelId: string) {
    if (!selectedId) return
    const current = models[selectedId] ?? []
    const next = { ...models, [selectedId]: current.filter(m => m !== modelId) }
    ringConfig.patchConfig({ models: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{t("settings", "providersTitle") as string}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings", "providersDesc") as string}</p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-3" style={{ minHeight: "400px" }}>
        {/* Left: provider list */}
        <div className="flex w-2/5 flex-col border-r border-border pr-3">
          <div className="mb-2 space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("settings", "searchProviders") as string}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setAdding(true)}>
              <Plus className="size-3" />
              {t("settings", "addProvider") as string}
            </Button>
            {adding && (
              <AddProviderForm
                onAdd={handleAdd}
                onCancel={() => setAdding(false)}
                existingIds={entries.map(([id]) => id)}
              />
            )}
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("settings", "providerEmpty") as string}
              </p>
            ) : (
              filtered.map(([id, p]) => {
                const modelCount = models[id]?.length ?? 0
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      selectedId === id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-accent/50",
                    )}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Bot className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{p.name || id}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{p.type ?? "openai-compatible"}</span>
                        {modelCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Cpu className="size-2.5" />
                              {modelCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selected && selectedId ? (
            <ProviderDetail
              id={selectedId}
              entry={selected}
              models={selectedModels}
              apiKey={ringConfig.auth[selectedId]?.key ?? ""}
              onBack={() => setSelectedId(null)}
              onPatch={(patch) => ringConfig.patchProvider(selectedId, patch)}
              onSetApiKey={(key) => ringConfig.setApiKey(selectedId, key)}
              onModelAdd={handleModelAdd}
              onModelRemove={handleModelRemove}
              onDelete={() => handleDelete(selectedId)}
            />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyDetail() {
  const { t } = useI18n()
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <Server className="mb-2 size-8 opacity-30" />
      <p className="text-xs">{t("settings", "providerEmpty") as string}</p>
    </div>
  )
}

// ── Add provider form ────────────────────────────────────────────────────────

function AddProviderForm({
  onAdd,
  onCancel,
  existingIds,
}: {
  onAdd: (id: string) => void
  onCancel: () => void
  existingIds: string[]
}) {
  const { t } = useI18n()
  const [id, setId] = useState("")
  const trimmed = id.trim().toLowerCase()
  const exists = existingIds.includes(trimmed)
  const valid = trimmed.length > 0 && !exists

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
      <Input
        autoFocus
        value={id}
        onChange={e => setId(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && valid) onAdd(trimmed)
          if (e.key === "Escape") onCancel()
        }}
        placeholder={t("settings", "providerIdPh") as string}
        className="h-7 text-xs"
      />
      {exists && <p className="mt-1 text-[10px] text-destructive">Already exists</p>}
      <div className="mt-1.5 flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          {t("settings", "cancel") as string}
        </Button>
        <Button size="sm" className="h-7 text-xs" disabled={!valid} onClick={() => onAdd(trimmed)}>
          <Plus className="mr-1 size-3" />
          {t("settings", "addProvider") as string}
        </Button>
      </div>
    </div>
  )
}

// ── Provider detail ──────────────────────────────────────────────────────────

function ProviderDetail({
  id,
  entry,
  models,
  apiKey,
  onBack,
  onPatch,
  onSetApiKey,
  onModelAdd,
  onModelRemove,
  onDelete,
}: {
  id: string
  entry: ProviderEntry
  models: string[]
  apiKey: string
  onBack: () => void
  onPatch: (patch: Partial<ProviderEntry>) => void
  onSetApiKey: (key: string) => void
  onModelAdd: (modelId: string) => void
  onModelRemove: (modelId: string) => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [showKey, setShowKey] = useState(false)
  const [newModel, setNewModel] = useState("")

  function addModel() {
    const trimmed = newModel.trim()
    if (!trimmed) return
    onModelAdd(trimmed)
    setNewModel("")
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button variant="ghost" size="icon" className="size-7" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <h4 className="flex-1 truncate text-sm font-medium">{entry.name || id}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-4 overflow-y-auto pt-3">
        {/* Provider ID */}
        <Field label={t("settings", "providerId") as string}>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 font-mono text-xs text-muted-foreground">
            {id}
          </div>
        </Field>

        {/* Display name */}
        <Field label={t("settings", "providerName") as string}>
          <Input
            value={entry.name ?? ""}
            onChange={e => onPatch({ name: e.target.value })}
            placeholder={id}
            className="h-8 text-xs"
          />
        </Field>

        {/* Type */}
        <Field label={t("settings", "providerType") as string}>
          <select
            value={entry.type ?? "openai-compatible"}
            onChange={e => onPatch({ type: e.target.value as ProviderType })}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PROVIDER_TYPES.map(pt => (
              <option key={pt.value} value={pt.value}>{t("settings", pt.labelKey) as string}</option>
            ))}
          </select>
        </Field>

        {/* Base URL */}
        <Field label={t("settings", "providerBaseUrl") as string}>
          <Input
            value={entry.baseUrl ?? ""}
            onChange={e => onPatch({ baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="h-8 text-xs"
          />
        </Field>

        {/* API Key */}
        <Field
          label={
            <span className="flex items-center gap-1">
              <Key className="size-3" />
              {t("settings", "providerApiKey") as string}
              <span className="ml-1 rounded bg-muted px-1 py-px text-[9px]">auth.json</span>
            </span>
          }
        >
          <div className="relative">
            <Input
              value={apiKey}
              onChange={e => onSetApiKey(e.target.value)}
              type={showKey ? "text" : "password"}
              placeholder={t("settings", "providerApiKeyPh") as string}
              className="h-8 pr-8 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 size-6 -translate-y-1/2"
              onClick={() => setShowKey(v => !v)}
            >
              {showKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </Button>
          </div>
        </Field>

        {/* Models */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground">{t("settings", "providerModels") as string}</label>

          {/* Model list */}
          {models.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {models.map(m => (
                <span
                  key={m}
                  className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[11px]"
                >
                  {m}
                  <button
                    onClick={() => onModelRemove(m)}
                    className="text-muted-foreground/60 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add model input */}
          <div className="flex gap-1.5">
            <Input
              value={newModel}
              onChange={e => setNewModel(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); addModel() }
              }}
              placeholder={t("settings", "providerModelsHint") as string}
              className="h-8 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1 text-xs"
              onClick={addModel}
              disabled={!newModel.trim()}
            >
              <Plus className="size-3" />
              {t("settings", "providerModelsAdd") as string}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Form field wrapper ───────────────────────────────────────────────────────

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
