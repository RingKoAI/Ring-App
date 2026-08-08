import { useState, useEffect, useCallback } from "react"

export type ThemeMode = "system" | "light" | "dark"

/** Available accent colors — each maps to a `data-accent` attribute on <html>. */
export type AccentColor = "blue" | "green" | "violet" | "rose" | "orange" | "cyan"

const MODE_KEY = "ring-theme"
const ACCENT_KEY = "ring-accent"

function readStoredMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system"
  const v = localStorage.getItem(MODE_KEY)
  return v === "light" || v === "dark" ? v : "system"
}

function readStoredAccent(): AccentColor {
  if (typeof localStorage === "undefined") return "blue"
  const v = localStorage.getItem(ACCENT_KEY)
  const valid: AccentColor[] = ["blue", "green", "violet", "rose", "orange", "cyan"]
  return valid.includes(v as AccentColor) ? (v as AccentColor) : "blue"
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
}

function applyClass(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", dark)
}

function applyAccent(accent: AccentColor) {
  document.documentElement.setAttribute("data-accent", accent)
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode)
  const [accent, setAccentState] = useState<AccentColor>(readStoredAccent)

  useEffect(() => {
    applyClass(mode)
  }, [mode])

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  useEffect(() => {
    if (mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyClass("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [mode])

  const setTheme = useCallback((m: ThemeMode) => {
    localStorage.setItem(MODE_KEY, m)
    setMode(m)
  }, [])

  const setAccent = useCallback((a: AccentColor) => {
    localStorage.setItem(ACCENT_KEY, a)
    setAccentState(a)
  }, [])

  return { mode, setTheme, accent, setAccent }
}

export function initTheme() {
  applyClass(readStoredMode())
  applyAccent(readStoredAccent())
}
