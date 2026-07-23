import { useState, useEffect, useCallback } from "react"

export type ThemeMode = "system" | "light" | "dark"

const STORAGE_KEY = "ring-theme"

function readStored(): ThemeMode {
  if (typeof localStorage === "undefined") return "system"
  const v = localStorage.getItem(STORAGE_KEY)
  return v === "light" || v === "dark" ? v : "system"
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
}

function applyClass(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", dark)
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStored)

  useEffect(() => {
    applyClass(mode)
  }, [mode])

  useEffect(() => {
    if (mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyClass("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [mode])

  const setTheme = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m)
    setMode(m)
  }, [])

  return { mode, setTheme }
}

export function initTheme() {
  applyClass(readStored())
}
