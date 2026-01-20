# Setup Checklist ✓

Quick reference for setting up your GROOL Meme Machine bot.

---

## Pre-Flight Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Telegram account ready
- [ ] Text editor installed

---

## Step-by-Step Setup

### 1. Create Telegram Bot
- [ ] Open Telegram, search for `@BotFather`
- [ ] Send `/newbot` command
- [ ] Choose bot name (e.g., "GROOL Meme Machine")
- [ ] Choose username (e.g., "grool_meme_bot")
- [ ] **Copy bot token** (looks like `1234567890:ABC...`)

### 2. Install Dependencies
```bash
cd /Users/laney/meme-machine
npm install
```
- [ ] No errors during install

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env file and paste your bot token
```
- [ ] Created `.env` file
- [ ] Added `BOT_TOKEN=...` with your actual token
- [ ] (Optional) Set `WEBAPP_URL` for production

### 4. Start Server
```bash
npm start
```
- [ ] See "Server listening on 3000"
- [ ] See "Bot started (long polling)."
- [ ] No error messages

### 5. Test Basic Commands (Local)
Open Telegram and message your bot:
- [ ] `/start` - See welcome message
- [ ] `/help` - See command list
- [ ] `/stickers` - See sticker list

### 6. Setup Public URL (For Mini App)

**For testing with ngrok:**
```bash
# In new terminal
ngrok http 3000
# Copy https URL (e.g., https://abc123.ngrok.io)
```
- [ ] ngrok running
- [ ] Added `WEBAPP_URL=https://YOUR-URL.ngrok.io/app` to `.env`
- [ ] Restarted server (`npm start`)

**For production (Render/Railway):**
- [ ] Code pushed to GitHub
- [ ] Deployed to hosting service
- [ ] Set `BOT_TOKEN` environment variable
- [ ] Set `WEBAPP_URL` environment variable
- [ ] Service is running

### 7. Test Mini App
- [ ] Send `/meme` to bot
- [ ] Mini app opens
- [ ] Can see canvas editor
- [ ] Can select tools (Select, Text, Draw)
- [ ] Base images load
- [ ] Stickers load

### 8. Create Test Meme
- [ ] Click a base image
- [ ] Add text layer
- [ ] Add sticker
- [ ] Try drawing
- [ ] Click "Export & Send to Telegram"
- [ ] Enter destination (e.g., `@me`)
- [ ] Send `/send` command
- [ ] Meme appears in Telegram

---

## Verification Tests

### Server Health
```bash
curl http://localhost:3000/assets/manifest.json
# Should return JSON with baseImages, stickers, fonts
```
- [ ] Manifest loads successfully

### CSRF Token
```bash
curl http://localhost:3000/api/csrf-token
# Should return {"token":"..."}
```
- [ ] CSRF endpoint works

### Bot Commands (in Telegram)
- [ ] `/start` works
- [ ] `/help` works
- [ ] `/meme` opens mini app
- [ ] `/history` shows "No memes yet" or your history
- [ ] `/settings` shows settings

### Mini App Features
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Shift+Z)
- [ ] Delete layer (Delete key or button)
- [ ] Duplicate layer (Ctrl+D)
- [ ] Arrow keys move layer
- [ ] Layer visibility toggle
- [ ] Layer reordering (up/down buttons)
- [ ] Text editing
- [ ] Color pickers work
- [ ] Image upload works
- [ ] Export works

---

## Troubleshooting Quick Fixes

### Bot doesn't respond
```bash
# Check if server is running
# Look for errors in terminal
# Verify BOT_TOKEN is correct
```

### Mini app won't open
```bash
# Verify WEBAPP_URL is set
# Must be HTTPS for production
# Check server logs for errors
```

### Upload fails
```bash
# Check browser console (F12)
# Verify CSRF token is fetched
# Clear cookies and refresh
```

### Assets won't load
```bash
# Check files exist in public/assets/
# Verify manifest.json is valid JSON
# Check browser network tab (F12)
```

---

## Production Deployment Checklist

- [ ] Code in version control (git)
- [ ] `.env` file NOT committed (check `.gitignore`)
- [ ] Deployed to hosting service
- [ ] Environment variables set on host
- [ ] `WEBAPP_URL` uses HTTPS
- [ ] Bot responds to commands
- [ ] Mini app opens correctly
- [ ] Can create and send memes
- [ ] Checked server logs (no errors)
- [ ] Tested from mobile device
- [ ] Tested from desktop Telegram
- [ ] Set appropriate `UPLOAD_TTL_MS` if needed

---

## Post-Setup Tasks

- [ ] Add custom base images (optional)
- [ ] Add custom stickers (optional)
- [ ] Add custom fonts (optional)
- [ ] Customize colors in `styles.css` (optional)
- [ ] Share bot with friends
- [ ] Monitor server logs
- [ ] Set up error monitoring (optional)

---

## Quick Reference

**Start server:**
```bash
npm start
```

**Stop server:**
```
Ctrl+C
```

**Test locally with ngrok:**
```bash
ngrok http 3000
```

**View logs:**
```bash
# They appear in the terminal where you ran npm start
```

**Restart bot:**
```bash
# Stop with Ctrl+C, then npm start again
```

---

## Need Help?

- Check [QUICKSTART.md](QUICKSTART.md) for detailed instructions
- Check [README.md](README.md) for feature reference
- Look at server logs for error messages
- Verify all environment variables are set

---

**Status: [ ] Setup Complete! 🎉**

Once everything above is checked, your bot is ready to create memes!
