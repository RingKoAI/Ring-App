import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { RingUserConfig, AuthStore, ProviderEntry } from "../types/config"

// ── IPC return types (match src-tauri/src/config.rs) ─────────────────────────

interface ConfigSnapshot {
  settings: string
  auth: string
  providersCatalog: string
  ringHome: string
  settingsPath: string
  settingsExists: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonOrNull<T>(raw: string, fallback: T): T {
  if (!raw.trim()) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseRingConfigReturn {
  /** Parsed settings.jsonc (live draft — user edits this in the UI). */
  config: RingUserConfig
  /** Parsed auth.json (API key credentials). */
  auth: AuthStore
  /** Providers catalog from providers.json (may be empty). */
  providersCatalog: Record<string, unknown>
  /** File system paths for display. */
  ringHome: string
  settingsPath: string
  settingsExists: boolean
  /** Loading state during initial read. */
  loading: boolean
  /** Error message from last write. */
  error: string | null
  /** Dirty flag — true when draft differs from last-saved snapshot. */
  dirty: boolean

  /** Reload everything from disk. Discards unsaved draft changes. */
  reload: () => Promise<void>

  // ── Draft mutations (edit in memory, save explicitly) ──

  /** Update a single top-level config field. */
  patchConfig: (patch: Partial<RingUserConfig>) => void

  // ── Provider CRUD (operates on draft config.providers) ──

  /** Upsert a provider entry by id. */
  setProvider: (id: string, entry: ProviderEntry) => void
  /** Remove a provider entry by id. */
  removeProvider: (id: string) => void
  /** Patch specific fields of a provider entry. */
  patchProvider: (id: string, patch: Partial<ProviderEntry>) => void

  // ── Auth CRUD (operates on draft auth store) ──

  /** Set the API key for a provider in auth.json. */
  setApiKey: (providerId: string, apiKey: string) => void
  /** Remove a provider's auth entry. */
  removeApiKey: (providerId: string) => void

  // ── Persistence ──

  /** Write draft config + auth back to ~/.ring. Returns success. */
  save: () => Promise<boolean>
}

export function useRingConfig(): UseRingConfigReturn {
  const [config, setConfig] = useState<RingUserConfig>({ providers: {}, models: {}, modelCaps: {} })
  const [auth, setAuth] = useState<AuthStore>({})
  const [providersCatalog, setProvidersCatalog] = useState<Record<string, unknown>>({})
  const [ringHome, setRingHome] = useState("")
  const [settingsPath, setSettingsPath] = useState("")
  const [settingsExists, setSettingsExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  /** Snapshot of last-saved config/auth for dirty detection. */
  const savedConfigRef = useRef<string>("")
  const savedAuthRef = useRef<string>("")

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const snap = await invoke<ConfigSnapshot>("read_config")
      const cfg = parseJsonOrNull<RingUserConfig>(snap.settings, { providers: {}, models: {}, modelCaps: {} })
      const au = parseJsonOrNull<AuthStore>(snap.auth, {})
      const cat = parseJsonOrNull<Record<string, unknown>>(snap.providersCatalog, {})

      setConfig(cfg)
      setAuth(au)
      setProvidersCatalog(cat)
      setRingHome(snap.ringHome)
      setSettingsPath(snap.settingsPath)
      setSettingsExists(snap.settingsExists)

      savedConfigRef.current = JSON.stringify(cfg)
      savedAuthRef.current = JSON.stringify(au)
      setDirty(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // ── Draft mutations ────────────────────────────────────────────────────────

  const patchConfig = useCallback((patch: Partial<RingUserConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch }
      setDirty(JSON.stringify(next) !== savedConfigRef.current)
      return next
    })
  }, [])

  const setProvider = useCallback((id: string, entry: ProviderEntry) => {
    setConfig(prev => {
      const providers = { ...(prev.providers ?? {}), [id]: entry }
      const next = { ...prev, providers }
      setDirty(JSON.stringify(next) !== savedConfigRef.current)
      return next
    })
  }, [])

  const removeProvider = useCallback((id: string) => {
    setConfig(prev => {
      const providers = { ...(prev.providers ?? {}) }
      delete providers[id]
      const next = { ...prev, providers }
      setDirty(JSON.stringify(next) !== savedConfigRef.current)
      return next
    })
    setAuth(prev => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const patchProvider = useCallback((id: string, patch: Partial<ProviderEntry>) => {
    setConfig(prev => {
      const existing = prev.providers?.[id] ?? {}
      const merged = { ...existing, ...patch }
      const providers = { ...(prev.providers ?? {}), [id]: merged }
      const next = { ...prev, providers }
      setDirty(JSON.stringify(next) !== savedConfigRef.current)
      return next
    })
  }, [])

  const setApiKey = useCallback((providerId: string, apiKey: string) => {
    setAuth(prev => {
      const next = { ...prev, [providerId]: { type: "api" as const, key: apiKey } }
      setDirty(true)
      return next
    })
  }, [])

  const removeApiKey = useCallback((providerId: string) => {
    setAuth(prev => {
      if (!(providerId in prev)) return prev
      const next = { ...prev }
      delete next[providerId]
      setDirty(true)
      return next
    })
  }, [])

  // ── Persistence ────────────────────────────────────────────────────────────

  const save = useCallback(async (): Promise<boolean> => {
    setError(null)
    try {
      const settingsJson = JSON.stringify(config, null, 2)
      const authJson = JSON.stringify(auth, null, 2)

      await invoke("write_settings", { content: settingsJson })
      await invoke("write_auth", { content: authJson })

      savedConfigRef.current = settingsJson
      savedAuthRef.current = authJson
      setDirty(false)
      return true
    } catch (e) {
      setError(String(e))
      return false
    }
  }, [config, auth])

  return useMemo(
    () => ({
      config,
      auth,
      providersCatalog,
      ringHome,
      settingsPath,
      settingsExists,
      loading,
      error,
      dirty,
      reload,
      patchConfig,
      setProvider,
      removeProvider,
      patchProvider,
      setApiKey,
      removeApiKey,
      save,
    }),
    [config, auth, providersCatalog, ringHome, settingsPath, settingsExists, loading, error, dirty, reload, patchConfig, setProvider, removeProvider, patchProvider, setApiKey, removeApiKey, save],
  )
}
