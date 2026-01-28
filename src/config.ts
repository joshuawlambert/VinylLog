function required(name: string): string {
  const value = import.meta.env[name] as string | undefined
  if (!value || !value.trim()) {
    throw new Error(`Missing env var: ${name}`)
  }
  return value.trim()
}

export const JSONBIN_BIN_ID = required('VITE_JSONBIN_BIN_ID')
export const JSONBIN_MASTER_KEY = required('VITE_JSONBIN_MASTER_KEY')
