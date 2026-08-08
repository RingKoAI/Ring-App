/**
 * ring-app config types — aligned with ring-cli's ring-core::config.
 * @see ring-cli/crates/ring-core/src/config/mod.rs
 */

/** Provider type — matches ring-cli ProviderKind. */
export type ProviderType =
  | "anthropic"
  | "openai"
  | "openai-responses"
  | "openai-compatible"
  | "gemini"
  | "ollama-native"

/**
 * A configured provider entry inside settings.jsonc `providers` map.
 * Keyed by provider id (e.g. "anthropic", "openai", "custom-foo").
 * Mirrors ring-cli's ProviderEntry (camelCase serialization).
 */
export interface ProviderEntry {
  name?: string
  /** "type" field in JSON, aliased as "kind" */
  type?: ProviderType
  baseUrl?: string
  /**
   * API key(s). ring-cli uses a custom serde that accepts string or string[].
   * We normalize to string[] internally, serialize as single string when len===1.
   */
  apiKey?: string[]
}

/**
 * The full settings.jsonc structure — matches ring-cli's RingUserConfig.
 * All fields optional; missing = use default.
 */
export interface RingUserConfig {
  model?: string
  providers?: Record<string, ProviderEntry>
  models?: Record<string, string[]>
  modelCaps?: Record<string, unknown>
  visionModel?: string
  imgModel?: string
  ocrModel?: string
  proxy?: string
  mcpServers?: Record<string, unknown>
  session?: Record<string, unknown>
  ui?: Record<string, unknown>
}

/** auth.json entry — keyed by provider id. */
export interface AuthEntry {
  type: "api" | "oauth"
  key?: string
  refresh?: string
  access?: string
  expires?: number
  accountId?: string
}

export type AuthStore = Record<string, AuthEntry>
