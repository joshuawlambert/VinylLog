import './style.css'
import type { Doc, Playlist, User } from './types'
import { getDoc, putDoc, emptyDoc } from './jsonbin'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app')
const appEl: HTMLDivElement = app

type Session = {
  username: string
  pin: string
}

const state: {
  doc: Doc | null
  loading: boolean
  error: string | null
  session: Session | null
  toast: string | null
  expandedKey: string | null
  confirmDeleteKey: string | null
  searchQuery: string
} = {
  doc: null,
  loading: false,
  error: null,
  session: null,
  toast: null,
  expandedKey: null,
  confirmDeleteKey: null,
  searchQuery: ''
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function showToast(msg: string): void {
  state.toast = msg
  render()
  void (async () => {
    await sleep(2200)
    if (state.toast === msg) {
      state.toast = null
      render()
    }
  })()
}

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function validPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

function cleanUsername(u: string): string {
  return u.trim()
}

function parseYouTubeLabel(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return `YouTube: ${u.pathname.replace('/', '')}`
    }
    if (host.endsWith('youtube.com')) {
      const list = u.searchParams.get('list')
      const v = u.searchParams.get('v')
      if (list && v) return `YouTube mix: ${v}`
      if (list) return `YouTube playlist: ${list}`
      if (v) return `YouTube video: ${v}`
    }
    return host
  } catch {
    return 'Link'
  }
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '')
      return id || null
    }
    if (host.endsWith('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      // Shorts: /shorts/<id>
      const m = u.pathname.match(/^\/shorts\/([^/?#]+)/)
      if (m?.[1]) return m[1]
    }
    return null
  } catch {
    return null
  }
}

type YouTubeOEmbed = {
  title: string
  thumbnail_url: string
}

async function fetchYouTubeMeta(url: string): Promise<{ title?: string; thumbUrl?: string; videoId?: string }> {
  const videoId = extractYouTubeVideoId(url)
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : url

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`
    )
    if (!res.ok) return { videoId: videoId || undefined }
    const data = (await res.json()) as Partial<YouTubeOEmbed>
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    const thumbUrl = typeof data.thumbnail_url === 'string' ? data.thumbnail_url.trim() : ''
    return {
      title: title || undefined,
      thumbUrl: thumbUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined),
      videoId: videoId || undefined
    }
  } catch {
    return {
      thumbUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined,
      videoId: videoId || undefined
    }
  }
}

function findUser(doc: Doc, username: string): User | undefined {
  const lowerUsername = username.toLowerCase()
  return doc.users.find((u) => u.username.toLowerCase() === lowerUsername)
}

function playlistKey(p: { url: string; addedAt: string }): string {
  return `${p.addedAt}|${p.url}`
}

async function refreshDoc(): Promise<void> {
  state.loading = true
  state.error = null
  render()

  try {
    state.doc = await getDoc()
  } catch (e) {
    state.doc = null
    state.error = e instanceof Error ? e.message : String(e)
  } finally {
    state.loading = false
    render()
  }
}

async function saveWithMerge(mutator: (doc: Doc) => void): Promise<void> {
  state.loading = true
  state.error = null
  render()

  try {
    const latest = await getDoc().catch(() => emptyDoc())
    mutator(latest)
    latest.updatedAt = new Date().toISOString()
    await putDoc(latest)
    state.doc = latest
    showToast('Saved')
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
  } finally {
    state.loading = false
    render()
  }
}

function logout(): void {
  state.session = null
  showToast('Signed out')
  render()
}

function render(): void {
  const doc = state.doc
  const session = state.session

  const signedInUser =
    doc && session ? findUser(doc, session.username) : undefined

  appEl.innerHTML = `
    <div class="wrap">
      <div class="top">
        <div class="brand">
          <div class="logo">VinlyLog</div>
          <div class="tag">vinyl shelves + YouTube links</div>
        </div>
        <div class="row topActions">
          ${session ? `<span class="pill">Signed in as <strong>${esc(session.username)}</strong></span>` : ''}
          <button class="btn" data-action="refresh" ${state.loading ? 'disabled' : ''}>Refresh</button>
          ${session ? `<button class="btn" data-action="logout">Sign out</button>` : ''}
        </div>
      </div>

      <div class="panel">
        <div class="panelInner">
          <div class="grid">
            <div>
              <div class="kicker">Data lives in JSONBin. This app just reads/writes one JSON document.</div>
              <div class="h2">Your Playlists</div>

              ${state.error ? `<div class="err">${esc(state.error)}</div><div class="hr"></div>` : ''}

              ${!doc && state.loading ? `<div class="muted">Loading…</div>` : ''}

              ${doc && !session ? `
                <div class="muted">Sign in to view and edit your list.</div>
              ` : ''}

              ${doc && session && signedInUser ? `
                <div class="searchWrap">
                  <input
                    class="searchInput"
                    data-field="search"
                    type="text"
                    placeholder="Search your collection..."
                    value="${esc(state.searchQuery)}"
                  />
                  ${state.searchQuery ? `<button class="searchClear" data-action="clear-search" title="Clear search">&times;</button>` : ''}
                </div>
                <div class="list">
                  ${signedInUser.playlists.length === 0 ? `<div class="muted">No playlists yet. Add your first link.</div>` : ''}
                  ${(() => {
                    const query = state.searchQuery.toLowerCase().trim()
                    const filtered = signedInUser.playlists
                      .slice()
                      .filter((p) => {
                        if (!query) return true
                        const title = (p.title || '').toLowerCase()
                        const note = (p.note || '').toLowerCase()
                        const url = p.url.toLowerCase()
                        return title.includes(query) || note.includes(query) || url.includes(query)
                      })
                      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
                    
                    if (query && filtered.length === 0) {
                      return `<div class="muted">No results for "${esc(state.searchQuery)}"</div>`
                    }
                    
                    return filtered.map(
                      (p) => {
                        const key = playlistKey(p)
                        const videoId = p.videoId || extractYouTubeVideoId(p.url) || ''
                        const expanded = state.expandedKey === key
                        return `
                        <div class="item">
                          ${p.thumbUrl ? `<img class="thumb" src="${esc(p.thumbUrl)}" alt="" loading="lazy" />` : `<div class="thumb thumbFallback"></div>`}
                          <div class="itemMain">
                            <div class="itemTitle">${esc(p.title || parseYouTubeLabel(p.url))}</div>
                            <div class="itemMeta">
                              <a href="${esc(p.url)}" target="_blank" rel="noreferrer">${esc(p.url)}</a>
                            </div>
                            ${p.note ? `<div class="itemMeta">${esc(p.note)}</div>` : ''}
                            ${expanded && videoId ? `
                              <div class="embedWrap">
                                <iframe
                                  src="https://www.youtube-nocookie.com/embed/${esc(videoId)}?rel=0&modestbranding=1"
                                  title="YouTube video player"
                                  loading="lazy"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowfullscreen
                                ></iframe>
                              </div>
                            ` : ''}
                            <div class="itemMeta">Added ${esc(new Date(p.addedAt).toLocaleString())}</div>
                          </div>
                          <div class="row itemActions">
                            ${videoId ? `<button class="btn" data-action="toggle-embed" data-added-at="${esc(p.addedAt)}" data-url="${esc(p.url)}" ${state.loading ? 'disabled' : ''}>${expanded ? 'Hide' : 'Watch'}</button>` : ''}
                            ${state.confirmDeleteKey === key ? `
                              <button class="btn btnDanger" data-action="confirm-remove" data-added-at="${esc(p.addedAt)}" data-url="${esc(p.url)}" ${state.loading ? 'disabled' : ''}>Confirm</button>
                              <button class="btn" data-action="cancel-remove" ${state.loading ? 'disabled' : ''}>Cancel</button>
                            ` : `
                              <button class="btn btnDanger" data-action="remove" data-added-at="${esc(p.addedAt)}" data-url="${esc(p.url)}" ${state.loading ? 'disabled' : ''}>Remove</button>
                            `}
                          </div>
                        </div>
                      `
                      }
                    ).join('')
                  })()}
                </div>
              ` : ''}

              ${doc && session && !signedInUser ? `
                <div class="err">Signed-in user not found in the document. Try refresh.</div>
              ` : ''}
            </div>

            <div>
              <div class="h2">Sign in / Add</div>

              ${!doc && !state.loading ? `
                <div class="muted">Couldn’t load JSONBin yet. Check your ` + '`VITE_JSONBIN_BIN_ID`' + ` / ` + '`VITE_JSONBIN_MASTER_KEY`' + ` and try Refresh.</div>
              ` : ''}

              ${!session ? `
                <div>
                  <label>Username</label>
                  <input data-field="username" placeholder="e.g. josh" autocomplete="username" />
                  <div style="height: 10px"></div>
                  <label>4-digit pin</label>
                  <input data-field="pin" placeholder="1234" inputmode="numeric" maxlength="4" autocomplete="current-password" />
                  <div style="height: 12px"></div>
                  <button class="btn btnPrimary" data-action="signin" ${state.loading ? 'disabled' : ''}>Sign in / Create</button>
                  <div style="height: 10px"></div>
                  <div class="muted">If the username doesn’t exist yet, it will be created.</div>
                </div>
              ` : ''}

              ${session ? `
                <div>
                  <label>YouTube playlist link</label>
                  <input data-field="url" placeholder="https://www.youtube.com/watch?...&list=..." />
                  <div style="height: 10px"></div>
                  <label>Note (optional)</label>
                  <input data-field="note" placeholder="Pressing from 1977, thrift find…" />
                  <div style="height: 12px"></div>
                  <div class="row formActions">
                    <button class="btn btnPrimary" data-action="add" ${state.loading ? 'disabled' : ''}>Add to my list</button>
                    <button class="btn" data-action="export" ${state.loading ? 'disabled' : ''}>Export JSON</button>
                  </div>
                  <div style="height: 10px"></div>
                  <div class="muted">Adds/edits write back to JSONBin using the same pin you signed in with.</div>
                </div>
              ` : ''}

              <div class="hr"></div>
              <div class="kicker">About</div>
              <div class="muted">
                This is intentionally simple: username + 4-digit pin stored in the JSON document.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ''}
  `
}

appEl.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]')
  if (!el) return
  const action = el.getAttribute('data-action')
  if (!action) return

  if (action === 'refresh') {
    void refreshDoc()
    return
  }

  if (action === 'logout') {
    logout()
    return
  }

  if (action === 'signin') {
    const usernameInput = appEl.querySelector<HTMLInputElement>('input[data-field="username"]')
    const pinInput = appEl.querySelector<HTMLInputElement>('input[data-field="pin"]')
    const username = cleanUsername(usernameInput?.value ?? '')
    const pin = (pinInput?.value ?? '').trim()

    if (!username) {
      showToast('Enter a username')
      return
    }
    if (!validPin(pin)) {
      showToast('Pin must be 4 digits')
      return
    }

    if (!state.doc) {
      showToast('Load JSONBin first (Refresh)')
      return
    }

    const existing = findUser(state.doc, username)
    if (existing && existing.pin !== pin) {
      showToast('Wrong pin')
      return
    }

    if (!existing) {
      void saveWithMerge((doc) => {
        if (findUser(doc, username)) return
        doc.users.push({ username, pin, playlists: [] })
      }).then(() => {
        state.session = { username, pin }
        showToast('User created')
        render()
      })
      return
    }

    state.session = { username, pin }
    showToast('Signed in')
    render()
    return
  }

  if (action === 'add') {
    const urlInput = appEl.querySelector<HTMLInputElement>('input[data-field="url"]')
    const noteInput = appEl.querySelector<HTMLInputElement>('input[data-field="note"]')
    const url = (urlInput?.value ?? '').trim()
    const note = (noteInput?.value ?? '').trim()

    if (!state.session) return
    if (!url) {
      showToast('Paste a YouTube link')
      return
    }

    state.loading = true
    render()

    void fetchYouTubeMeta(url)
      .then((meta) => {
        const playlist: Playlist = {
          url,
          title: meta.title,
          thumbUrl: meta.thumbUrl,
          videoId: meta.videoId,
          note: note || undefined,
          addedAt: new Date().toISOString()
        }

        return saveWithMerge((doc) => {
          const u = findUser(doc, state.session!.username)
          if (!u) {
            doc.users.push({ username: state.session!.username, pin: state.session!.pin, playlists: [playlist] })
            return
          }
          if (u.pin !== state.session!.pin) {
            throw new Error('Pin mismatch for this user')
          }
          u.playlists.push(playlist)
        })
      })
      .then(() => {
        if (urlInput) urlInput.value = ''
        if (noteInput) noteInput.value = ''
      })
      .finally(() => {
        state.loading = false
        render()
      })
    return
  }

  if (action === 'toggle-embed') {
    const addedAt = el.getAttribute('data-added-at') || ''
    const url = el.getAttribute('data-url') || ''
    if (!addedAt || !url) return

    const key = `${addedAt}|${url}`
    state.expandedKey = state.expandedKey === key ? null : key
    render()
    return
  }

  if (action === 'remove') {
    const addedAt = el.getAttribute('data-added-at') || ''
    const url = el.getAttribute('data-url') || ''
    if (!addedAt || !url) return

    const key = `${addedAt}|${url}`
    state.confirmDeleteKey = key
    render()
    return
  }

  if (action === 'cancel-remove') {
    state.confirmDeleteKey = null
    render()
    return
  }

  if (action === 'confirm-remove') {
    const addedAt = el.getAttribute('data-added-at') || ''
    const url = el.getAttribute('data-url') || ''
    if (!addedAt || !url) return
    if (!state.session) return

    state.confirmDeleteKey = null

    void saveWithMerge((doc) => {
      const u = findUser(doc, state.session!.username)
      if (!u) return
      if (u.pin !== state.session!.pin) {
        throw new Error('Pin mismatch for this user')
      }
      const idx = u.playlists.findIndex((p) => p.addedAt === addedAt && p.url === url)
      if (idx < 0) return
      u.playlists.splice(idx, 1)
    })
      .then(() => {
        const key = `${addedAt}|${url}`
        if (state.expandedKey === key) state.expandedKey = null
      })
    return
  }

  if (action === 'export') {
    if (!state.doc) return
    const json = JSON.stringify(state.doc, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vinlylog-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('Exported')
    return
  }

  if (action === 'clear-search') {
    state.searchQuery = ''
    render()
    return
  }
})

// Search input handler
appEl.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement | null
  if (target?.getAttribute('data-field') === 'search') {
    const cursorPos = target.selectionStart
    state.searchQuery = target.value
    render()
    // Restore focus and cursor position after render
    const searchInput = appEl.querySelector<HTMLInputElement>('input[data-field="search"]')
    if (searchInput) {
      searchInput.focus()
      searchInput.setSelectionRange(cursorPos, cursorPos)
    }
  }
})

render()
void refreshDoc()
