export type UserRole = 'admin' | 'gamemaster' | 'spieler';

export type LobbyStatus = 'wartend' | 'laeuft' | 'beendet' | 'geschlossen';

export type LeaderboardPeriod = 'allzeit' | 'monat' | 'woche';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface Session {
  sid: string;
  userId: string;
  data: Record<string, unknown>;
  expiresAt: string;
}

export interface PluginManifest {
  slug: string;
  name: string;
  version: string;
  author: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  coreVersion: string;
  icon: string;
  frontend: {
    entry: string;
    bibliothek: {
      title: string;
      description: string;
      coverImage: string;
    };
    adminSettings?: string;
  };
  backend: {
    entry: string;
  };
}

export interface Plugin {
  id: string;
  slug: string;
  name: string;
  version: string;
  author: string;
  manifest: PluginManifest;
  effectiveMinPlayers?: number;
  effectiveMaxPlayers?: number;
  enabled: boolean;
  installedAt: string;
}

export interface Lobby {
  id: string;
  pluginId: string;
  createdBy: string;
  code: string;
  status: LobbyStatus;
  maxPlayers: number;
  minPlayers: number;
  createdAt: string;
  closedAt: string | null;
}

export interface LobbyWithDetails extends Lobby {
  pluginName: string;
  pluginSlug: string;
  creatorName: string;
  playerCount: number;
}

export interface LobbyPlayer {
  lobbyId: string;
  userId: string;
  username: string;
  joinedAt: string;
}

export interface GameSession {
  id: string;
  lobbyId: string;
  pluginId: string;
  startedAt: string;
  endedAt: string | null;
  resultData: Record<string, unknown>;
}

export interface PlayerStats {
  id: string;
  userId: string;
  pluginId: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  gamesPlayed: number;
  lastPlayed: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  gamesPlayed: number;
}

export interface PluginSetting {
  id: string;
  pluginId: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  lobbyId: string;
  userId: string | null;
  username: string;
  message: string;
  system: boolean;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  totpCode?: string;
}

export interface CreateLobbyRequest {
  pluginSlug: string;
  maxPlayers?: number;
}

export interface JoinLobbyRequest {
  code: string;
}

export interface RecordResultRequest {
  userId: string;
  win?: boolean;
  draw?: boolean;
  score?: number;
}
