import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useRingClient } from "./useRingClient"
import { useRingRca } from "./useRingRca"
import { useRingHttp } from "./useRingHttp"
import type { Message, Mode, ModelOption, Role, Session, Transport } from "../components/chat/types"

interface SdkMessage {
  id: string
  type: string
  payload: string
}

export type ChatStatus = "disconnected" | "connecting" | "connected" | "error"

interface UseChatOptions {
  transport: Transport
  httpUrl: string
  rcaUrl: string
  rcaToken: string
  model: string
  readyMessage?: string
  messagesLabel?: string
  notConnectedMessage?: string
}

function formatToolArgs(_tool: string, input: Record<string, unknown>): string {
  return JSON.stringify(input)
}

function isRole(value: string): value is Role {
  return value === "user" || value === "assistant" || value === "system" || value === "tool"
}

export function useChat({ transport, httpUrl, rcaUrl, rcaToken, model, readyMessage = "Ring ready", messagesLabel = "messages", notConnectedMessage = "Not connected — open Settings to configure a transport." }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("ring-messages")
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          // reset any mid-stream statuses on restore
          return parsed.map(m => (m.status === "streaming" ? { ...m, status: "complete" as const } : m))
        }
      }
    } catch { /* ignore */ }
    return [{ id: "init", role: "system", content: readyMessage, timestamp: Date.now() }]
  })
  const [status, setStatus] = useState<ChatStatus>("disconnected")
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [models, setModels] = useState<ModelOption[]>([])
  const [serverProvider, setServerProvider] = useState<{ id: string; name: string; default_model: string; active_model: string } | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const pendingIdRef = useRef<string | null>(null)

  const pushMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const appendAssistantText = useCallback((id: string, chunk: string, done: boolean) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id)
      if (idx === -1) {
        return [
          ...prev,
          {
            id,
            role: "assistant",
            content: chunk,
            model,
            status: done ? "complete" : "streaming",
            timestamp: Date.now(),
          } as Message,
        ]
      }
      const next = [...prev]
      const existing = next[idx]
      // when blocks exist, update the text block (ThreadTurn renders from blocks)
      const blocks = existing.blocks ? existing.blocks.map(b =>
        b.kind === "text" ? { ...b, text: b.text + chunk } : b
      ) : undefined
      next[idx] = {
        ...existing,
        content: existing.content + chunk,
        blocks,
        status: done ? "complete" : "streaming",
      }
      return next
    })
  }, [model])

  /** REPLACE the assistant text content with canonical full text (used by done/text_done events) */
  const setAssistantText = useCallback((id: string, full: string, done: boolean) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id)
      if (idx === -1) {
        return [
          ...prev,
          {
            id,
            role: "assistant",
            content: full,
            model,
            status: done ? "complete" : "streaming",
            timestamp: Date.now(),
          } as Message,
        ]
      }
      const next = [...prev]
      const existing = next[idx]
      const blocks = existing.blocks ? existing.blocks.map(b =>
        b.kind === "text" ? { ...b, text: full } : b
      ) : undefined
      next[idx] = {
        ...existing,
        content: full,
        blocks,
        status: done ? "complete" : "streaming",
      }
      return next
    })
  }, [model])

  /** REPLACE the reasoning content with canonical full text (used by reasoning_done events) */
  const setReasoning = useCallback((id: string, full: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const msg = next[idx]
      const blocks = msg.blocks ? [...msg.blocks] : [{ kind: "text" as const, text: msg.content }]
      const rIdx = blocks.findIndex(b => b.kind === "reasoning")
      if (rIdx === -1) {
        blocks.unshift({ kind: "reasoning", text: full })
      } else {
        const r = blocks[rIdx]
        if (r.kind === "reasoning") blocks[rIdx] = { ...r, text: full }
      }
      next[idx] = { ...msg, blocks, status: "streaming" }
      return next
    })
  }, [])

  /** append a reasoning delta into the message's reasoning block */
  const appendReasoning = useCallback((id: string, delta: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const msg = next[idx]
      const blocks = msg.blocks ? [...msg.blocks] : [{ kind: "text" as const, text: msg.content }]
      const rIdx = blocks.findIndex(b => b.kind === "reasoning")
      if (rIdx === -1) {
        blocks.unshift({ kind: "reasoning", text: delta })
      } else {
        const r = blocks[rIdx]
        if (r.kind === "reasoning") blocks[rIdx] = { ...r, text: r.text + delta }
      }
      next[idx] = { ...msg, blocks, status: "streaming" }
      return next
    })
  }, [])

  /** add a tool call block (or update if call_id exists) */
  const upsertToolCall = useCallback((id: string, callId: string, tool: string, args: string, patch?: { state?: "running" | "done" | "error"; durationMs?: number }) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const msg = next[idx]
      const blocks = msg.blocks ? [...msg.blocks] : [{ kind: "text" as const, text: msg.content }]
      const ti = blocks.findIndex(b => b.kind === "tool_call" && b.callId === callId)
      if (ti === -1) {
        blocks.push({ kind: "tool_call", callId, tool, args, state: patch?.state ?? "running", durationMs: patch?.durationMs })
      } else {
        const existing = blocks[ti]
        if (existing.kind === "tool_call") {
          blocks[ti] = { ...existing, state: patch?.state ?? existing.state, durationMs: patch?.durationMs ?? existing.durationMs }
        }
      }
      next[idx] = { ...msg, blocks, status: "streaming" }
      return next
    })
  }, [])

  // ---- SDK transport (subprocess) ----
  const handleSdkMessage = useCallback(
    (msg: SdkMessage) => {
      switch (msg.type) {
        case "ready":
          setStatus("connected")
          break
        case "text": {
          const id = msg.id || pendingIdRef.current || crypto.randomUUID()
          pendingIdRef.current = id
          appendAssistantText(id, msg.payload, false)
          break
        }
        case "reasoning": {
          const id = msg.id || pendingIdRef.current || crypto.randomUUID()
          pendingIdRef.current = id
          appendReasoning(id, msg.payload)
          break
        }
        case "tool": {
          const id = msg.id || pendingIdRef.current || ""
          const payload = msg.payload || ""
          // CLI emits payload as "tool_name(input)" — extract name and args
          const match = payload.match(/^([^(]+)\(([\s\S]*)\)$/)
          if (match && id) {
            const toolName = match[1]
            const args = match[2]
            const callId = `sdk-tool-${Date.now()}`
            upsertToolCall(id, callId, toolName, args, { state: "running" })
          }
          break
        }
        case "done": {
          const id = msg.id || pendingIdRef.current || ""
          if (id) {
            if (msg.payload) {
              setAssistantText(id, msg.payload, true)
            } else {
              appendAssistantText(id, "", true)
            }
          }
          setLoading(false)
          pendingIdRef.current = null
          break
        }
        case "error": {
          pushMessage({ id: crypto.randomUUID(), role: "system", content: msg.payload || "error", timestamp: Date.now() })
          setLoading(false)
          break
        }
      }
    },
    [appendAssistantText, setAssistantText, appendReasoning, upsertToolCall, pushMessage],
  )

  const local = useRingClient(handleSdkMessage)

  // ---- RCA transport (WebSocket gateway) ----
  const rca = useRingRca({
    url: rcaUrl,
    token: rcaToken,
    model,
    onResult: (id, text) => {
      pushMessage({ id, role: "assistant", content: text, model, status: "complete", timestamp: Date.now() })
      setLoading(false)
    },
    onError: msg => {
      pushMessage({ id: crypto.randomUUID(), role: "system", content: msg, timestamp: Date.now() })
      setLoading(false)
    },
    onStatusChange: s => setStatus(s as ChatStatus),
  })

  // ---- HTTP transport (REST server) ----
  const http = useRingHttp(httpUrl)

  // Sync SDK status → unified status
  useEffect(() => {
    if (transport !== "sdk") return
    if (local.status === "ready") setStatus("connected")
    else if (local.status === "starting") setStatus("connecting")
    else if (local.status === "exited") setStatus("disconnected")
    else if (local.status === "error") setStatus("error")
    setLocalError(local.error)
  }, [transport, local.status, local.error])

  // HTTP health check + model catalog on connect
  useEffect(() => {
    if (transport !== "http") {
      setModels([])
      return
    }
    setStatus("connecting")
    http.checkHealth().then(async ok => {
      setStatus(ok ? "connected" : "error")
      if (ok) {
        const entries = await http.fetchModels()
        setModels(entries.map(m => ({ id: m.id, label: m.id, badge: m.role })))
        const prov = await http.fetchProviders()
        setServerProvider(prov)
        const list = await http.fetchSessions()
        setSessions(list.map(s => ({
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt,
          preview: `${s.messageCount} ${messagesLabel}`,
        })))
      }
    })
  }, [transport, http, messagesLabel])

  const connect = useCallback(() => {
    if (transport === "sdk") local.start()
    else if (transport === "rca") rca.connect()
    else http.checkHealth().then(ok => setStatus(ok ? "connected" : "error"))
  }, [transport, local, rca, http])

  const disconnect = useCallback(() => {
    if (transport === "sdk") local.stop()
    else if (transport === "rca") rca.disconnect()
    setStatus("disconnected")
  }, [transport, local, rca])

  const send = useCallback(
    (text: string, mode: Mode) => {
      pushMessage({ id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now() })
      setLoading(true)

      if (transport === "sdk") {
        const sdkMsg: SdkMessage = { id: crypto.randomUUID(), type: "message", payload: text }
        pendingIdRef.current = sdkMsg.id
        local.send(JSON.stringify(sdkMsg)).catch(() => {
          setLoading(false)
          pushMessage({ id: crypto.randomUUID(), role: "system", content: "send failed", timestamp: Date.now() })
        })
      } else if (transport === "http") {
        const msgId = crypto.randomUUID()
        pushMessage({
          id: msgId,
          role: "assistant",
          content: "",
          model,
          status: "streaming",
          timestamp: Date.now(),
          blocks: [{ kind: "text", text: "" }],
        })
        http.sendStream(text, model, {
          onReasoning: delta => appendReasoning(msgId, delta),
          onReasoningDone: full => setReasoning(msgId, full),
          onText: delta => appendAssistantText(msgId, delta, false),
          onTextDone: full => setAssistantText(msgId, full, false),
          onToolStart: (callId, tool, input) => {
            upsertToolCall(msgId, callId, tool, formatToolArgs(tool, input))
          },
          onToolEnd: (callId, ok, durationMs) => {
            upsertToolCall(msgId, callId, "", "", { state: ok ? "done" : "error", durationMs })
          },
          onDone: () => appendAssistantText(msgId, "", true),
          onError: err =>
            pushMessage({ id: crypto.randomUUID(), role: "system", content: `HTTP error: ${err}`, timestamp: Date.now() }),
        }).finally(() => setLoading(false))
      } else {
        const taskId = rca.send(text, mode)
        if (!taskId) {
          setLoading(false)
          pushMessage({ id: crypto.randomUUID(), role: "assistant", content: notConnectedMessage, status: "complete", timestamp: Date.now() })
        } else {
          pendingIdRef.current = taskId
        }
      }
    },
    [transport, local, rca, http, model, pushMessage, notConnectedMessage],
  )

  const abort = useCallback(() => {
    // RCA protocol has no abort_task; we can only stop waiting client-side.
    if (transport === "http") http.abortStream()
    setLoading(false)
    pendingIdRef.current = null
  }, [transport, http])

  const clear = useCallback(() => {
    setMessages([{ id: "init", role: "system", content: readyMessage, timestamp: Date.now() }])
    setActiveSessionId(null)
    try { localStorage.removeItem("ring-messages") } catch { /* ignore */ }
  }, [readyMessage])

  const loadSession = useCallback(async (id: string) => {
    const detail = await http.fetchSession(id)
    if (!detail) return
    const converted: Message[] = detail.messages.map(m => ({
      id: crypto.randomUUID(),
      role: isRole(m.role) ? m.role : "system",
      content: m.content,
      timestamp: Date.now(),
      status: "complete" as const,
    }))
    setMessages(converted)
    setActiveSessionId(id)
  }, [http])

  const refreshSessions = useCallback(async () => {
    const list = await http.fetchSessions()
    setSessions(list.map(s => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      preview: `${s.messageCount} ${messagesLabel}`,
    })))
  }, [http, messagesLabel])

  // debounced persistence — save messages 500ms after the last change
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("ring-messages", JSON.stringify(messages))
      } catch { /* quota exceeded — ignore */ }
    }, 500)
    return () => clearTimeout(timer)
  }, [messages])

  return useMemo(
    () => ({ messages, status, loading, localError, models, serverProvider, sessions, activeSessionId, binaryPath: local.binaryPath, send, abort, connect, disconnect, clear, loadSession, refreshSessions, pushMessage }),
    [messages, status, loading, localError, models, serverProvider, sessions, activeSessionId, local.binaryPath, send, abort, connect, disconnect, clear, loadSession, refreshSessions, pushMessage],
  )
}
