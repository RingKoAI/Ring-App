import { useState, useCallback, useEffect, useRef } from "react"

export type RcaStatus = "disconnected" | "connecting" | "connected" | "error"

interface RcaEnvelope {
  id: string
  type: string
  payload: Record<string, unknown>
  timestamp: number
  direction: "upstream" | "downstream"
}

interface UseRingRcaOptions {
  url: string
  token: string
  model: string
  onResult: (taskId: string, text: string) => void
  onError: (msg: string) => void
  onStatusChange?: (s: RcaStatus) => void
}

/**
 * Remote transport: connects to a RingRCA server's `/app/ws` endpoint.
 *
 * The app acts as a platform client: it submits tasks and receives results
 * over a persistent WebSocket. The server routes tasks to connected CLI
 * workers and relays results back.
 */
export function useRingRca({ url, token, model, onResult, onError, onStatusChange }: UseRingRcaOptions) {
  const [status, setStatus] = useState<RcaStatus>("disconnected")
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatSeqRef = useRef(0)
  const conversationIdRef = useRef<string>("")
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const manualDisconnectRef = useRef(false)

  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const onStatusRef = useRef(onStatusChange)

  onResultRef.current = onResult
  onErrorRef.current = onError
  onStatusRef.current = onStatusChange

  const update = useCallback((s: RcaStatus) => {
    setStatus(s)
    onStatusRef.current?.(s)
  }, [])

  /** Normalize the URL to end with /app/ws */
  const buildWsUrl = useCallback((raw: string): string => {
    const base = raw.replace(/\/+$/, "")
    if (base.endsWith("/app/ws")) return base
    if (base.endsWith("/cli/ws")) return base.replace("/cli/ws", "/app/ws")
    return `${base}/app/ws`
  }, [])

  const connect = useCallback(() => {
    if (!url) return
    manualDisconnectRef.current = false
    update("connecting")
    wsRef.current?.close()

    // Generate a stable conversation ID for this session
    conversationIdRef.current = crypto.randomUUID()

    try {
      const wsUrl = buildWsUrl(url)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        const reg: RcaEnvelope = {
          id: crypto.randomUUID(),
          type: "register",
          payload: {
            client_id: "ringapp",
            version: "0.1.0",
            capabilities: ["chat"],
            labels: [],
            auth_token: token || undefined,
          },
          timestamp: Date.now(),
          direction: "upstream",
        }
        ws.send(JSON.stringify(reg))
      }

      ws.onmessage = event => {
        try {
          const env: RcaEnvelope = JSON.parse(event.data)
          switch (env.type) {
            case "register_ack": {
              attemptRef.current = 0
              update("connected")
              break
            }
            case "task_result": {
              const taskId = String(env.payload.task_id ?? "")
              const statusVal = String(env.payload.status ?? "completed")
              const output = env.payload.output as { text?: string } | null
              const errorVal = env.payload.error as string | null

              if (statusVal === "failed" || statusVal === "cancelled") {
                onErrorRef.current(errorVal || `task ${statusVal}`)
              } else {
                const text = output?.text ?? ""
                onResultRef.current(taskId, text)
              }
              break
            }
            case "error": {
              const code = String(env.payload.code ?? "")
              const msg = String(env.payload.message ?? env.payload.code ?? "unknown error")
              if (code === "auth_failed") {
                manualDisconnectRef.current = true
              }
              onErrorRef.current(`RCA: ${msg}`)
              break
            }
            case "heartbeat_ack":
              break
          }
        } catch {
          /* ignore malformed frames */
        }
      }

      ws.onerror = () => update("error")
      ws.onclose = () => {
        if (manualDisconnectRef.current) {
          update("disconnected")
          return
        }
        if (attemptRef.current >= 10) {
          update("error")
          return
        }
        attemptRef.current += 1
        const backoff = Math.min(1000 * 2 ** (attemptRef.current - 1), 30000)
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), backoff)
        update("connecting")
      }
    } catch (e) {
      onErrorRef.current(`RCA: ${e}`)
      update("error")
    }
  }, [url, token, update, buildWsUrl])

  const connectRef = useRef(connect)
  connectRef.current = connect

  const send = useCallback(
    (text: string, mode: string): string | null => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return null

      const taskId = crypto.randomUUID()
      const task: RcaEnvelope = {
        id: crypto.randomUUID(),
        type: "assign_task",
        payload: {
          task_id: taskId,
          platform: "ringapp",
          platform_user_id: "local",
          conversation_id: conversationIdRef.current,
          message: { text, attachments: null },
          context: { metadata: { mode, model } },
        },
        timestamp: Date.now(),
        direction: "upstream",
      }
      ws.send(JSON.stringify(task))
      return taskId
    },
    [model],
  )

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  // Heartbeat with monotonic sequence counter
  useEffect(() => {
    if (status !== "connected") return
    heartbeatSeqRef.current = 0
    const interval = setInterval(() => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      heartbeatSeqRef.current += 1
      const hb: RcaEnvelope = {
        id: crypto.randomUUID(),
        type: "heartbeat",
        payload: { seq: heartbeatSeqRef.current },
        timestamp: Date.now(),
        direction: "upstream",
      }
      ws.send(JSON.stringify(hb))
    }, 30000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [])

  return { status, connect, disconnect, send }
}
