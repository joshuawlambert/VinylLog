import type { Doc } from './types'
import { JSONBIN_BIN_ID, JSONBIN_MASTER_KEY } from './config'

const API_BASE = 'https://api.jsonbin.io/v3'

type JsonBinGetResponse = {
  record: unknown
}

function isDoc(value: unknown): value is Doc {
  if (!value || typeof value !== 'object') return false
  const v = value as { users?: unknown; updatedAt?: unknown }
  return Array.isArray(v.users) && typeof v.updatedAt === 'string'
}

export function emptyDoc(): Doc {
  return { users: [], updatedAt: new Date().toISOString() }
}

export async function getDoc(): Promise<Doc> {
  const res = await fetch(`${API_BASE}/b/${JSONBIN_BIN_ID}/latest`, {
    headers: {
      'X-Master-Key': JSONBIN_MASTER_KEY
    }
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`JSONBin GET failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as JsonBinGetResponse
  if (!isDoc(data.record)) return emptyDoc()
  return data.record
}

export async function putDoc(doc: Doc): Promise<void> {
  const res = await fetch(`${API_BASE}/b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_MASTER_KEY
    },
    body: JSON.stringify(doc)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`JSONBin PUT failed (${res.status}): ${text}`)
  }
}
