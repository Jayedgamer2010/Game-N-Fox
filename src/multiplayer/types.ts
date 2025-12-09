export type GamePosition = 'south' | 'west' | 'north' | 'east';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  position?: GamePosition;
}

export interface RoomInfo {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  players: MultiplayerPlayer[];
  maxPlayers: number;
  isPublic: boolean;
  aiCount: number;
  gameMode: string;
  deckTheme: string;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  playerCount: number;
  playerPositions?: Record<string, GamePosition>;
}

export type MultiplayerMode = 'offline' | 'online';
export type MultiplayerOption = 'host' | 'join' | 'browse';

export interface MultiplayerState {
  mode: MultiplayerMode | null;
  option: MultiplayerOption | null;
  room: RoomInfo | null;
  playerId: string | null;
  playerName: string;
  isConnected: boolean;
  error: string | null;
}

export type ServerMessageType =
  | 'connected'
  | 'room_created'
  | 'joined_room'
  | 'left_room'
  | 'player_joined'
  | 'player_left'
  | 'player_ready_changed'
  | 'game_started'
  | 'game_action'
  | 'game_state_updated'
  | 'game_ended'
  | 'public_rooms'
  | 'settings_updated'
  | 'chat'
  | 'error';

export interface ServerMessage {
  type: ServerMessageType;
  [key: string]: any;
}

export type ClientMessageType =
  | 'create_room'
  | 'join_room'
  | 'leave_room'
  | 'get_public_rooms'
  | 'toggle_ready'
  | 'start_game'
  | 'game_action'
  | 'update_game_state'
  | 'end_game'
  | 'update_settings'
  | 'chat';

export interface ClientMessage {
  type: ClientMessageType;
  [key: string]: any;
}
