import { randomUUID } from 'crypto';

const HISTORY_LIMIT = 5;

export const createStore = ({ uploadTtlMs }) => {
  const uploads = new Map();
  const sessions = new Map();
  let isCleaningUp = false;

  const getSession = (userId) => {
    if (!sessions.has(userId)) {
      sessions.set(userId, {
        userId,
        activeSession: false,
        lastMemeFileId: null,
        pendingDestinations: null,
        history: []
      });
    }
    return sessions.get(userId);
  };

  const saveUpload = ({ buffer, mimeType, userId, sourceChatId }) => {
    const id = randomUUID();
    uploads.set(id, {
      id,
      buffer,
      mimeType,
      userId,
      sourceChatId,
      createdAt: Date.now()
    });
    return id;
  };

  const getUpload = (id) => {
    // Don't return uploads that are being cleaned up
    const upload = uploads.get(id);
    if (!upload) return null;

    const now = Date.now();
    if (now - upload.createdAt > uploadTtlMs) {
      return null; // Expired
    }
    return upload;
  };

  const deleteUpload = (id) => uploads.delete(id);

  const addHistory = (userId, entry) => {
    const session = getSession(userId);
    session.history.unshift(entry);
    session.history = session.history.slice(0, HISTORY_LIMIT);
  };

  const cleanupUploads = () => {
    // Prevent concurrent cleanup
    if (isCleaningUp) return;
    isCleaningUp = true;

    try {
      const now = Date.now();
      const toDelete = [];

      for (const [id, upload] of uploads.entries()) {
        if (now - upload.createdAt > uploadTtlMs) {
          toDelete.push(id);
        }
      }

      for (const id of toDelete) {
        uploads.delete(id);
      }

      if (toDelete.length > 0) {
        console.log(`[CLEANUP] Deleted ${toDelete.length} expired uploads`);
      }
    } finally {
      isCleaningUp = false;
    }
  };

  return {
    getSession,
    saveUpload,
    getUpload,
    deleteUpload,
    addHistory,
    cleanupUploads
  };
};
