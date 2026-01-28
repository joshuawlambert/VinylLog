export function getEnv(name: string): string {
  const value = (import.meta.env as Record<string, unknown>)[name]
  return typeof value === 'string' ? value.trim() : ''
}

export const JSONBIN_BIN_ID = getEnv('VITE_JSONBIN_BIN_ID')
export const JSONBIN_MASTER_KEY = getEnv('VITE_JSONBIN_MASTER_KEY')

export function hasJsonbinConfig(): boolean {
  return Boolean(JSONBIN_BIN_ID) && Boolean(JSONBIN_MASTER_KEY)
}
