# VinlyLog

Tiny vinyl social app (GitHub Pages) backed by JSONBin.

Users sign in with a username + 4-digit pin, then add/edit a list of YouTube playlist links.

## Dev

Prereqs: Bun.

```bash
bun install
bun run dev
```

## Configure

This app expects a single JSONBin document shaped like:

```json
{
  "users": [
    {
      "username": "josh",
      "pin": "1234",
      "playlists": [
        {
          "url": "https://www.youtube.com/watch?v=rUyqCXlfWaE&list=RDrUyqCXlfWaE&start_radio=1",
          "note": "",
          "addedAt": "2026-01-28T00:00:00.000Z"
        }
      ]
    }
  ],
  "updatedAt": "2026-01-28T00:00:00.000Z"
}
```

Environment variables (build-time):

- `VITE_JSONBIN_BIN_ID`
- `VITE_JSONBIN_MASTER_KEY`

Create a local `.env` (see `.env.example`).

## Deploy (GitHub Pages)

This repo includes a Pages workflow that builds with Vite and deploys `dist/`.
