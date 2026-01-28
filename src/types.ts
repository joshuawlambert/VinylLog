export type Playlist = {
  url: string
  title?: string
  thumbUrl?: string
  videoId?: string
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
