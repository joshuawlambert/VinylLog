export type Playlist = {
  url: string
  provider?: 'youtube' | 'spotify' | 'apple' | 'link'
  title?: string
  thumbUrl?: string
  videoId?: string
  embedUrl?: string
  embedHeight?: number
  note?: string
  addedAt: string
}

export type User = {
  username: string
  pin: string
  playlists: Playlist[]
}

export type Doc = {
  users: User[]
  updatedAt: string
}
