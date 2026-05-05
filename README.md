# MeowPass Web App

Web-based vault manager for MeowPass. E2E encrypted — secrets decrypted in the browser, never on the server.

**Live at**: [app.meowpass.dev](https://app.meowpass.dev)

## Features

- Login/Register with your MeowPass account
- Master password unlock (Argon2id, 64MB, runs in-browser via WASM)
- Create, browse, and delete vaults
- Add, edit, copy, and delete secrets
- AES-256-GCM encryption — byte-compatible with CLI and Chrome extension
- Zero-knowledge — plaintext secrets never leave the browser

## Deploy to Netlify

### 1. Import the repo

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect to GitHub and select `meowrithm/meowpass-app`

### 2. Build settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `.next` |

### 3. Custom domain

1. Go to **Domain management** → **Add custom domain**
2. Enter `app.meowpass.dev`
3. Add a CNAME record in your DNS:
   - Type: `CNAME`
   - Name: `app`
   - Value: `<your-netlify-site>.netlify.app`

### 4. Done

Netlify auto-deploys on every push to `main`.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- hash-wasm (Argon2id WASM)
- WebCrypto API (AES-256-GCM)

## License

MIT
