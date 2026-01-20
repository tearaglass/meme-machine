# GROOL Meme Machine - Quickstart Guide

Get your Telegram meme bot up and running in 5 minutes.

---

## Prerequisites

- Node.js 18+ installed
- A Telegram account
- For production: A server with a public HTTPS URL (see Production Setup below)

---

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` to BotFather
3. Choose a name for your bot (e.g., "GROOL Meme Machine")
4. Choose a username (e.g., "grool_meme_bot")
5. **Copy the bot token** - looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

---

## Step 2: Install Dependencies

```bash
cd /Users/laney/meme-machine
npm install
```

---

## Step 3: Local Development Setup

### A. Set Your Bot Token

**Option 1: Using .env file (Recommended)**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your bot token
# BOT_TOKEN=YOUR_BOT_TOKEN_HERE
```

**Option 2: Using export command**

```bash
export BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
```

### B. Start the Server

```bash
npm start
```

You should see:
```
Server listening on 3000
Bot started (long polling).
```

### C. Test Basic Bot Commands

Open Telegram and message your bot:
- `/start` - See welcome message
- `/help` - See available commands

⚠️ **Note**: The `/meme` command won't work yet because it needs a public HTTPS URL for the mini app.

---

## Step 4: Production Setup (Required for Mini App)

Telegram mini apps require a **public HTTPS URL**. Here are your options:

### Option A: Deploy to a Cloud Service

#### Using Render.com (Free Tier Available)

1. Push your code to GitHub (if not already)

2. Go to [render.com](https://render.com) and sign up

3. Create a new "Web Service"

4. Connect your GitHub repo

5. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `BOT_TOKEN` = your bot token
     - `WEBAPP_URL` = `https://YOUR-APP-NAME.onrender.com/app`

6. Deploy and copy your app URL

#### Using Railway.app

1. Go to [railway.app](https://railway.app) and sign up

2. Create new project → Deploy from GitHub

3. Add environment variables:
   - `BOT_TOKEN` = your bot token
   - `WEBAPP_URL` = `https://YOUR-APP.railway.app/app`

4. Deploy

### Option B: Local Testing with ngrok

For quick local testing with HTTPS:

1. Install ngrok:
```bash
brew install ngrok
# or download from https://ngrok.com
```

2. In a new terminal, start ngrok:
```bash
ngrok http 3000
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Set environment variables:
```bash
export BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
export WEBAPP_URL="https://abc123.ngrok.io/app"
```

5. Start the server:
```bash
npm start
```

---

## Step 5: Test the Full Bot

1. Open Telegram and find your bot

2. Send `/start` to begin

3. Send `/meme` to open the meme editor

4. The mini app should open with:
   - Canvas editor
   - Tool buttons (Select, Text, Draw)
   - Base images and stickers
   - Layer controls

5. Create a meme:
   - Click a base image to start
   - Add text, stickers, or drawings
   - Click "Export & Send to Telegram"

6. Choose where to send:
   - Select chat or enter username
   - Send `/send` to post the meme

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | ✅ Yes | - | Telegram bot token from BotFather |
| `WEBAPP_URL` | ⚠️ Production | `http://localhost:3000/app` | Public HTTPS URL for mini app |
| `PORT` | No | `3000` | Server port |
| `UPLOAD_TTL_MS` | No | `3600000` (1 hour) | How long uploads are stored |

---

## Bot Commands Cheat Sheet

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and instructions |
| `/help` | Show all commands |
| `/meme` | Open the meme editor mini app |
| `/stickers` | List available stickers |
| `/templates` | List templates (none in V1) |
| `/history` | Show your last 5 memes |
| `/send <destinations>` | Send last meme to chats/users |
| `/settings` | View current settings |

---

## Keyboard Shortcuts (In Mini App)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+Y` / `Cmd+Y` | Redo (alternate) |
| `Delete` / `Backspace` | Delete selected layer |
| `Ctrl+D` / `Cmd+D` | Duplicate layer |
| `Arrow Keys` | Move layer 1px |
| `Shift + Arrow Keys` | Move layer 10px |

---

## Troubleshooting

### Bot doesn't respond
- Check bot token is correct
- Make sure server is running
- Look for errors in server logs

### Mini app doesn't open
- Verify `WEBAPP_URL` is set correctly
- Make sure URL is **HTTPS** (not HTTP)
- Check that `/app` endpoint is accessible

### Upload fails with "CSRF validation failed"
- Clear browser cookies and refresh
- Check browser console for errors
- Verify server is running latest code

### "Layer limit reached" message
- You've hit the 50-layer limit
- Delete some layers to continue
- This prevents memory issues

### Images won't load
- Check `public/assets/manifest.json` exists
- Verify image files are in `public/assets/`
- Check browser console for 404 errors

---

## Adding Your Own Assets

### Base Images
1. Add image to `public/assets/base-images/`
2. Update `public/assets/manifest.json`:
```json
{
  "baseImages": [
    {
      "id": "my-image",
      "name": "My Cool Image",
      "src": "/assets/base-images/my-image.png",
      "defaultCanvas": { "width": 1080, "height": 1080 }
    }
  ]
}
```

### Stickers
1. Add PNG to `public/assets/stickers/`
2. Update manifest:
```json
{
  "stickers": [
    {
      "id": "my-sticker",
      "name": "My Sticker",
      "src": "/assets/stickers/my-sticker.png"
    }
  ]
}
```

### Fonts
1. Add font file to `public/fonts/`
2. Update `public/fonts/fonts.css`
3. Update manifest:
```json
{
  "fonts": [
    {
      "id": "my-font",
      "name": "My Font",
      "family": "MyFont"
    }
  ]
}
```

---

## Production Checklist

Before going live:

- [ ] Set strong `BOT_TOKEN` environment variable
- [ ] Use HTTPS URL for `WEBAPP_URL`
- [ ] Test all bot commands
- [ ] Test meme creation and export
- [ ] Verify CSRF protection is working
- [ ] Check server logs for errors
- [ ] Set appropriate `UPLOAD_TTL_MS` (default 1 hour)
- [ ] Monitor server memory usage
- [ ] Set up error monitoring (optional)

---

## Support

- **Issues**: Check the code for errors in server logs
- **Bot Commands**: Type `/help` in Telegram
- **Spec**: See `Project 002 - Meme Machine 2eb74eb6d4758067b7b4e87bc04bc228.html`
- **Code**: Check `server/` and `public/` directories

---

## Quick Deploy Commands

### Render.com (via CLI)
```bash
# Install Render CLI
npm install -g render

# Deploy
render deploy
```

### Railway.app (via CLI)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

### Docker (if you want to containerize)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t meme-machine .
docker run -p 3000:3000 -e BOT_TOKEN=your_token meme-machine
```

---

## What's Next?

- Add more base images and stickers
- Customize the UI colors in `public/styles.css`
- Add custom fonts
- Monitor usage and performance
- Share your bot with friends!

---

**Ready to create some memes! 🎨**
