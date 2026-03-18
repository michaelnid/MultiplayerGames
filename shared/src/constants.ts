export const CORE_VERSION = '1.0.0';

export const LOBBY_CODE_LENGTH = 4;
export const LOBBY_CODE_MIN = 0;
export const LOBBY_CODE_MAX = 9999;

export const LOBBY_TIMEOUT_MS = 30 * 60 * 1000;

export const MAX_PLUGIN_SIZE_BYTES = 50 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

export const RATE_LIMIT_LOGIN_MAX = 5;
export const RATE_LIMIT_LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const USER_ROLES = ['admin', 'gamemaster', 'spieler'] as const;

export const LOBBY_STATUSES = ['wartend', 'laeuft', 'beendet', 'geschlossen'] as const;

export const WS_EVENTS = {
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_UPDATE: 'lobby:update',
  LOBBY_PLAYER_JOINED: 'lobby:player-joined',
  LOBBY_PLAYER_LEFT: 'lobby:player-left',
  LOBBY_STATUS_CHANGED: 'lobby:status-changed',
  GAME_START: 'game:start',
  GAME_END: 'game:end',
  GAME_EVENT: 'game:event',
  CHAT_MESSAGE: 'chat:message',
  CHAT_SYSTEM: 'chat:system',
} as const;
