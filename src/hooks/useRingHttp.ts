import { useState, useCallback, useMemo, useRef } from "react"

interface ModelEntry {
  id: string
  role: string
}

export interface SessionSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: number
}

export interface SessionDetail {
  sessionId: string
  title: string
  messages: { role: string; content: string }[]
}

interface RawSessionSummary {
  id: string
  title: string
  message_count: number
  updated_at: number
}

interface RawSessionMessage {
  role: string
  content: string
}

interface RawSessionDetail {
  session_id: string
  title: string
  messages: RawSessionMessage[]
}

/**
 * HTTP transport: talks to a `ring --serve` REST server.
 * Streaming chat (POST /v1/chat/stream) plus health, models, and session endpoints.
 */
export function useRingHttp(baseUrl: string) {
  const [reachable, setReachable] = useState(false)

  const normalize = (url: string) => url.replace(/\/+$/, "")

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${normalize(baseUrl)}/health`, { signal: AbortSignal.timeout(3000) })
      setReachable(res.ok)
      return res.ok
    } catch {
      setReachable(false)
      return false
    }
  }, [baseUrl])

  const fetchModels = useCallback(async (): Promise<ModelEntry[]> => {
    try {
      const res = await fetch(`${normalize(baseUrl)}/v1/models`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return []
      const data = (await res.json()) as { models: ModelEntry[] }
      return data.models ?? []
    } catch {
      return []
    }
  }, [baseUrl])

  interface StreamCallbacks {
    onReasoning: (delta: string) => void
    onReasoningDone: (full: string) => void
    onText: (delta: string) => void
    onTextDone: (full: string) => void
    onToolStart: (callId: string, tool: string, input: Record<string, unknown>) => void
    onToolEnd: (callId: string, ok: boolean, durationMs: number) => void
    onDone: (stopReason: string) => void
    onError: (err: string) => void
  }

  /** abort signal holder — call abortStream() to cancel */
  const abortRef = useRef<AbortController | null>(null)

  /** 流式对话：POST /v1/chat/stream，逐 NDJSON 行回调 */
  const sendStream = useCallback(
    async (prompt: string, model: string, cb: StreamCallbacks): Promise<void> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

      try {
        const res = await fetch(`${normalize(baseUrl)}/v1/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, model }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          cb.onError(`HTTP ${res.status}`)
          return
        }

        reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const msg = JSON.parse(line) as { type: string; delta?: string; full?: string; stop_reason?: string; error?: string; call_id?: string; tool?: string; input?: Record<string, unknown>; ok?: boolean; duration_ms?: number }
              switch (msg.type) {
                case "reasoning": cb.onReasoning(msg.delta ?? ""); break
                case "reasoning_done": cb.onReasoningDone(msg.full ?? ""); break
                case "text": cb.onText(msg.delta ?? ""); break
                case "text_done": cb.onTextDone(msg.full ?? ""); break
                case "tool_start": cb.onToolStart(msg.call_id ?? "", msg.tool ?? "", msg.input ?? {}); break
                case "tool_end": cb.onToolEnd(msg.call_id ?? "", msg.ok ?? true, msg.duration_ms ?? 0); break
                case "done": cb.onDone(msg.stop_reason ?? "end_turn"); break
                case "error": cb.onError(msg.error ?? "unknown error"); break
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") cb.onError(String(e))
      } finally {
        reader?.cancel().catch(() => {})
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [baseUrl],
  )

  const abortStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  interface ServerProvider {
    active: { id: string; name: string; default_model: string; active_model: string } | null
  }

  const fetchProviders = useCallback(async (): Promise<ServerProvider["active"]> => {
    try {
      const res = await fetch(`${normalize(baseUrl)}/v1/providers`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return null
      const data = (await res.json()) as ServerProvider
      return data.active
    } catch {
      return null
    }
  }, [baseUrl])

  const fetchSessions = useCallback(async (): Promise<SessionSummary[]> => {
    try {
      const res = await fetch(`${normalize(baseUrl)}/v1/sessions`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return []
      const data = (await res.json()) as { sessions: RawSessionSummary[] }
      return (data.sessions ?? []).map(s => ({
        id: s.id,
        title: s.title,
        messageCount: s.message_count,
        updatedAt: s.updated_at,
      }))
    } catch {
      return []
    }
  }, [baseUrl])

  const fetchSession = useCallback(async (id: string): Promise<SessionDetail | null> => {
    try {
      const res = await fetch(`${normalize(baseUrl)}/v1/sessions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return null
      const data = (await res.json()) as RawSessionDetail
      return {
        sessionId: data.session_id,
        title: data.title,
        messages: (data.messages ?? []).map(m => ({ role: m.role, content: m.content })),
      }
    } catch {
      return null
    }
  }, [baseUrl])

  return useMemo(
    () => ({ reachable, checkHealth, sendStream, abortStream, fetchModels, fetchProviders, fetchSessions, fetchSession }),
    [reachable, checkHealth, sendStream, abortStream, fetchModels, fetchProviders, fetchSessions, fetchSession],
  )
}
