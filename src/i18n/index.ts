import { en } from "./en"
import { zh } from "./zh"
import { ja } from "./ja"
import { ko } from "./ko"

export type Lang = "en" | "zh-CN" | "zh-TW" | "ja" | "ko"
export type I18nKeys = typeof en

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "zh-CN", label: "简体中文" },
  { id: "zh-TW", label: "繁體中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
]

const locales: Record<string, I18nKeys> = {
  en,
  "zh-CN": zh,
  "zh-TW": zh,
  ja,
  ko,
}

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en"
  const langs = navigator.languages || [navigator.language]
  for (const l of langs) {
    const id = l.replace(/_/g, "-")
    if (id.startsWith("zh-TW") || id.startsWith("zh-HK")) return "zh-TW"
    if (id.startsWith("zh")) return "zh-CN"
    if (id.startsWith("ja")) return "ja"
    if (id.startsWith("ko")) return "ko"
    if (id.startsWith("en")) return "en"
  }
  return "en"
}

let currentLang: Lang = detectLang()
const listeners = new Set<() => void>()

export function getLang(): Lang {
  return currentLang
}

export function setLang(l: Lang) {
  currentLang = l
  listeners.forEach(fn => fn())
}

function getLocale(): I18nKeys {
  return (locales as any)[currentLang] ?? en
}

export function t<K extends keyof I18nKeys>(key: K): I18nKeys[K]
export function t<K extends keyof I18nKeys, S extends keyof I18nKeys[K]>(key: K, sub: S): I18nKeys[K][S]
export function t(key: string, sub?: string): unknown {
  const locale = getLocale()
  if (sub) return (locale as any)[key]?.[sub] ?? (en as any)[key]?.[sub] ?? sub
  return (locale as any)[key] ?? (en as any)[key] ?? key
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
