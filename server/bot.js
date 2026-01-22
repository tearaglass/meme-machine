import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.join(__dirname, '..', 'public', 'assets', 'manifest.json');

const readManifest = () => {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { baseImages: [], stickers: [], fonts: [] };
  }
};

const sanitizeDestinations = (input) => {
  return input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const sendPhotoWithRetry = async (ctx, chatId, photo, options, attempt = 1) => {
  try {
    return await ctx.telegram.sendPhoto(chatId, photo, options);
  } catch (error) {
    if (attempt >= 2) {
      throw error;
    }
    return await sendPhotoWithRetry(ctx, chatId, photo, options, attempt + 1);
  }
};

const postToPublicChannel = async (ctx, channelId, upload) => {
  if (!channelId) {
    return;
  }
  try {
    await sendPhotoWithRetry(
      ctx,
      channelId,
      { source: upload.buffer, filename: 'meme.png' },
      { caption: 'New meme.' }
    );
  } catch (error) {
    console.error('[ERROR] Failed to post to public channel:', error.message);
  }
};

export const createBot = ({ config, store }) => {
  const bot = new Telegraf(config.botToken);

  bot.start(async (ctx) => {
    await ctx.reply(
      [
        'GROOL Meme System ready.',
        'Use /meme to open the editor.',
        'Use /send to post your last meme to more chats.'
      ].join('\n')
    );
  });

  bot.command('meme', async (ctx) => {
    const session = store.getSession(ctx.from.id);
    session.activeSession = true;
    await ctx.reply(
      'Open the meme editor:',
      Markup.inlineKeyboard([
        Markup.button.webApp('Launch Meme Editor', config.webappUrl)
      ])
    );
  });

  bot.command('templates', async (ctx) => {
    await ctx.reply('No templates configured in V1.');
  });

  bot.command('stickers', async (ctx) => {
    const manifest = readManifest();
    if (!manifest.stickers.length) {
      await ctx.reply('No stickers available.');
      return;
    }
    const names = manifest.stickers.map((sticker) => `- ${sticker.name}`).join('\n');
    await ctx.reply(`Available stickers:\n${names}`);
  });

  bot.command('history', async (ctx) => {
    const session = store.getSession(ctx.from.id);
    if (!session.history.length) {
      await ctx.reply('No memes in this session yet.');
      return;
    }
    const lines = session.history.map((entry, index) => {
      const when = new Date(entry.createdAt).toLocaleString();
      return `${index + 1}. ${entry.fileId} (${when})`;
    });
    await ctx.reply(`Session history:\n${lines.join('\n')}`);
  });

  bot.command('send', async (ctx) => {
    const session = store.getSession(ctx.from.id);
    if (!session.lastMemeFileId) {
      await ctx.reply('No meme on file yet. Export one from the mini app first.');
      return;
    }
    session.pendingDestinations = {
      source: 'file-id',
      fileId: session.lastMemeFileId
    };
    await ctx.reply(
      'Send me one or more chat IDs or @channel usernames (space or comma separated).'
    );
  });

  bot.command('settings', async (ctx) => {
    await ctx.reply('Settings are reserved for future use.');
  });

  bot.on('message', async (ctx, next) => {
    if (!ctx.message?.web_app_data) {
      return next();
    }
    const session = store.getSession(ctx.from.id);
    let payload;
    try {
      payload = JSON.parse(ctx.message.web_app_data.data);
    } catch (error) {
      await ctx.reply('Received malformed data from the mini app.');
      return;
    }
    if (!payload.uploadId) {
      await ctx.reply('Mini app export did not include an upload ID.');
      return;
    }

    const upload = store.getUpload(payload.uploadId);
    if (!upload) {
      await ctx.reply('Upload expired or missing. Please export again.');
      return;
    }

    await postToPublicChannel(ctx, config.publicChannel, upload);

    session.pendingDestinations = {
      source: 'upload',
      uploadId: payload.uploadId,
      sourceChatId: upload.sourceChatId || ctx.chat.id
    };

    const previewChatId = ctx.from.id;
    try {
      await sendPhotoWithRetry(
        ctx,
        previewChatId,
        { source: upload.buffer, filename: 'meme.png' },
        {
          caption: 'Preview ready. Choose destinations:',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('Send to source chat', `send:source:${payload.uploadId}`),
              Markup.button.callback('Send to another chat', `send:other:${payload.uploadId}`)
            ]
          ]).reply_markup
        }
      );
    } catch (error) {
      await ctx.reply('Failed to send preview. Check bot permissions and try again.');
    }
  });

  bot.action(/send:(source|other):(.+)/, async (ctx) => {
    const action = ctx.match[1];
    const uploadId = ctx.match[2];
    const session = store.getSession(ctx.from.id);
    const upload = store.getUpload(uploadId);

    if (!upload) {
      await ctx.answerCbQuery('Upload expired. Export again.');
      return;
    }

    if (action === 'source') {
      try {
        const result = await sendPhotoWithRetry(
          ctx,
          upload.sourceChatId || ctx.chat.id,
          { source: upload.buffer, filename: 'meme.png' },
          { caption: 'Meme delivered.' }
        );
        session.lastMemeFileId = result.photo.at(-1)?.file_id || session.lastMemeFileId;
        store.addHistory(ctx.from.id, {
          fileId: session.lastMemeFileId || 'unknown',
          createdAt: Date.now()
        });
        store.deleteUpload(uploadId);
        session.pendingDestinations = null;
        await ctx.answerCbQuery('Sent.');
      } catch (error) {
        await ctx.answerCbQuery('Failed to send. Check permissions.');
      }
      return;
    }

    session.pendingDestinations = {
      source: 'upload',
      uploadId,
      sourceChatId: upload.sourceChatId || ctx.chat.id
    };
    await ctx.reply('Send me one or more chat IDs or @channel usernames.');
    await ctx.answerCbQuery('Waiting for destinations.');
  });

  bot.on('text', async (ctx) => {
    const session = store.getSession(ctx.from.id);
    if (!session.pendingDestinations) {
      return;
    }

    const destinations = sanitizeDestinations(ctx.message.text);
    if (!destinations.length) {
      await ctx.reply('No valid destinations found. Try again.');
      return;
    }

    const pending = session.pendingDestinations;
    session.pendingDestinations = null;

    const sendToDestination = async (destination) => {
      if (pending.source === 'file-id') {
        return await sendPhotoWithRetry(ctx, destination, pending.fileId, { caption: 'Meme delivered.' });
      }
      const upload = store.getUpload(pending.uploadId);
      if (!upload) {
        throw new Error('Upload expired');
      }
      const result = await sendPhotoWithRetry(
        ctx,
        destination,
        { source: upload.buffer, filename: 'meme.png' },
        { caption: 'Meme delivered.' }
      );
      session.lastMemeFileId = result.photo.at(-1)?.file_id || session.lastMemeFileId;
      store.addHistory(ctx.from.id, {
        fileId: session.lastMemeFileId || 'unknown',
        createdAt: Date.now()
      });
      return result;
    };

    const failures = [];
    for (const destination of destinations) {
      try {
        await sendToDestination(destination);
      } catch (error) {
        failures.push(destination);
      }
    }

    if (pending.source === 'upload') {
      store.deleteUpload(pending.uploadId);
    }

    if (failures.length) {
      await ctx.reply(
        `Failed to send to: ${failures.join(', ')}. Check permissions or IDs.`
      );
    } else {
      await ctx.reply('All destinations sent.');
    }
  });

  return bot;
};
