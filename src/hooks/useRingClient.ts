import { useState, useCallback, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export type LocalStatus = "idle" | "starting" | "ready" | "exited" | "error"

interface ProcessInfo {
  kind: string
  pid: number
  running: boolean
}

interface ProbeResult {
  found: boolean
  path: string | null
  error: string | null
}

interface StdoutLine {
  pid: number
  kind: string
  line: string
}

interface SdkMessage {
  id: string
  type: string
  payload: string
}

/**
 * Drives a local `ring sdk` subprocess via Tauri IPC.
 * stdout lines are streamed as `ring://line` events; stdin is written via `ring_send`.
 */
export function useRingClient(onMessage: (msg: SdkMessage) => void) {
  const [status, setStatus] = useState<LocalStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [binaryPath, setBinaryPath] = useState<string | null>(null)
  const pidRef = useRef<number | null>(null)

  const probe = useCallback(async (): Promise<boolean> => {
    try {
      const r = await invoke<ProbeResult>("probe_ring")
      setBinaryPath(r.path)
      return r.found
    } catch {
      return false
    }
  }, [])

  const start = useCallback(async () => {
    setStatus("starting")
    setError(null)

    const found = await probe()
    if (!found) {
      setError("not_found")
      setStatus("error")
      return
    }

    try {
      const info = await invoke<ProcessInfo>("start_ring")
      pidRef.current = info.pid
      setStatus("ready")
    } catch (e) {
      setError(String(e))
      setStatus("error")
    }
  }, [probe])

  const send = useCallback(async (text: string) => {
    const pid = pidRef.current
    if (pid == null) throw new Error("agent not started")
    await invoke("ring_send", { pid, text })
  }, [])

  const stop = useCallback(async () => {
    const pid = pidRef.current
    if (pid != null) {
      try {
        await invoke("stop_process", { pid })
      } catch {
        /* ignore */
      }
    }
    pidRef.current = null
    setStatus("idle")
  }, [])

  // Stream stdout events
  useEffect(() => {
    let cancelled = false
    let unlisten: UnlistenFn | undefined
    listen<StdoutLine>("ring://line", event => {
      const line = event.payload.line
      if (line.endsWith("<exit>")) {
        setStatus("exited")
        pidRef.current = null
        return
      }
      try {
        const msg = JSON.parse(line) as SdkMessage
        onMessage(msg)
      } catch {
        /* ignore non-JSON lines */
      }
    }).then(fn => {
      if (cancelled) fn()
      else unlisten = fn
    })
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [onMessage])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { status, error, binaryPath, start, send, stop, probe }
}
