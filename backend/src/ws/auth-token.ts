import crypto from 'node:crypto';

interface SocketAuthTokenData {
  userId: string;
  username: string;
  expiresAt: number;
}

const TOKEN_TTL_MS = 2 * 60 * 1000;
const tokenStore = new Map<string, SocketAuthTokenData>();

function pruneExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt <= now) {
      tokenStore.delete(token);
    }
  }
}

export function issueSocketAuthToken(userId: string, username: string): string {
  pruneExpiredTokens();

  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, {
    userId,
    username,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
}

export function consumeSocketAuthToken(token: string): { userId: string; username: string } | null {
  pruneExpiredTokens();

  const data = tokenStore.get(token);
  if (!data) {
    return null;
  }

  tokenStore.delete(token);

  if (data.expiresAt <= Date.now()) {
    return null;
  }

  return {
    userId: data.userId,
    username: data.username,
  };
}

