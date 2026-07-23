import { useState, useEffect } from "react"
import { t, subscribe, getLang, setLang, type Lang } from "../i18n"

export function useI18n() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const unsub = subscribe(() => forceUpdate(n => n + 1))
    return () => unsub()
  }, [])

  return {
    t,
    lang: getLang(),
    setLang: (l: Lang) => setLang(l),
  }
}
