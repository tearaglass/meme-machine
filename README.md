# GROOL Telegram Meme System 🎨

A Telegram bot with a powerful web-based meme editor. Create memes with layers, text, stickers, and drawings - then share directly to Telegram chats.

## ⚡ Quick Start

**New here?** → See **[QUICKSTART.md](QUICKSTART.md)** for step-by-step setup instructions.

```bash
# 1. Install dependencies
npm install

# 2. Set your bot token
export BOT_TOKEN="your-telegram-bot-token"

# 3. Start the server
npm start
```

## ✨ Features

- 🖼️ **Layer System**: Full layer management with visibility, locking, and reordering
- ✏️ **Text Tool**: Add custom text with fonts, colors, strokes, and alignment
- 🎨 **Drawing Tool**: Freehand drawing with brush size and color controls
- 🖼️ **Image Support**: Upload your own images or use built-in base images
- 🏷️ **Stickers**: Pre-loaded sticker library
- ↩️ **Undo/Redo**: Full history with 30-step memory
- ⌨️ **Keyboard Shortcuts**: Ctrl+Z, Ctrl+D, arrow keys, and more
- 📐 **Aspect Ratios**: 1:1, 9:16, and 16:9 formats
- 🔒 **Security**: CSRF protection and file validation
- 🚀 **Performance**: Optimized rendering and hit testing

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete layer |
| `Ctrl+D` / `Cmd+D` | Duplicate layer |
| `Arrow Keys` | Move layer (Shift for 10px) |

## 📋 Bot Commands

- `/start` - Welcome message
- `/meme` - Open meme editor
- `/stickers` - List available stickers
- `/history` - Show last 5 memes
- `/send <destinations>` - Send meme to chats
- `/help` - Show all commands

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Telegraf
- **Frontend**: Vanilla JS, HTML5 Canvas
- **Storage**: In-memory (sessions & uploads)
- **Security**: CSRF tokens, MIME validation

## 📦 Project Structure

```
meme-machine/
├── server/
│   ├── index.js      # Express server & routes
│   ├── bot.js        # Telegram bot handlers
│   ├── store.js      # In-memory storage
│   └── config.js     # Environment config
├── public/
│   ├── index.html    # Mini app UI
│   ├── app.js        # Canvas editor logic
│   ├── styles.css    # Dark theme styles
│   └── assets/       # Images, stickers, fonts
├── QUICKSTART.md     # Setup guide
└── package.json
```

## 🌐 Deployment

See [QUICKSTART.md](QUICKSTART.md) for detailed deployment instructions for:
- Render.com
- Railway.app
- Docker
- ngrok (local testing)

**Requirements:**
- Node.js 18+
- Telegram bot token (get from [@BotFather](https://t.me/botfather))
- Public HTTPS URL for production

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | ✅ | - | Telegram bot token |
| `WEBAPP_URL` | Production | `http://localhost:3000/app` | Public mini app URL |
| `PORT` | No | `3000` | Server port |
| `UPLOAD_TTL_MS` | No | `3600000` | Upload expiry (1 hour) |

## 📝 Notes

- Uploads and sessions are stored **in-memory** and reset on server restart
- Maximum 50 layers per canvas (prevents memory exhaustion)
- CSRF protection enabled on all uploads
- Image uploads limited to PNG, JPEG, GIF, WebP (10MB max)
- Authoritative spec: `Project 002 - Meme Machine 2eb74eb6d4758067b7b4e87bc04bc228.html`

## 🎨 Customization

**Add your own assets:**
1. Place images in `public/assets/base-images/` or `public/assets/stickers/`
2. Update `public/assets/manifest.json`
3. Restart server

**Custom fonts:**
1. Add font files to `public/fonts/`
2. Update `public/fonts/fonts.css`
3. Update manifest

## 🐛 Troubleshooting

See [QUICKSTART.md](QUICKSTART.md#troubleshooting) for common issues.

## 📄 License

Private project - see spec document for details.

---

**Ready to create memes?** Get started with [QUICKSTART.md](QUICKSTART.md)! 🚀
