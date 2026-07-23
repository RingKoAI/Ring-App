import { Component, type ReactNode, type ErrorInfo } from "react"
import { t } from "../i18n"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
          <div className="text-2xl">😿</div>
          <h1 className="text-lg font-semibold">{t("error", "title")}</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error?.message || t("error", "default")}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t("error", "retry")}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
