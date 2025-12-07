
export type Role = string; // Made generic string to support multiple games

export interface Player {
  id: number; // 1-4
  name: string;
  totalScore: number;
  currentRole: Role | null;
  roundPoints: number;
  color: string;
  isAi: boolean; // New property
}

export enum GamePhase {
  HOME = 'HOME',
  SETUP = 'SETUP',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  POLICE_TASK = 'POLICE_TASK',
  POLICE_SELECTION = 'POLICE_SELECTION',
  PLAYING = 'PLAYING', // New phase for Board Games
  REVEALING = 'REVEALING',
  VERDICT = 'VERDICT',
  ROUND_RESULTS = 'ROUND_RESULTS',
  LEADERBOARD = 'LEADERBOARD',
}

export enum GameId {
  THIEF_POLICE = 'THIEF_POLICE',
  TIC_TAC_TOE = 'TIC_TAC_TOE', // Replaces KINGS_COURT
  SLIDING_PUZZLE = 'SLIDING_PUZZLE', // Replaces TREASURE_HUNT
  SPACE_RACE = 'SPACE_RACE',
  CASTLE_SIEGE = 'CASTLE_SIEGE',
  COLOR_WAR = 'COLOR_WAR'
}

export interface GameDefinition {
  id: GameId;
  title: string;
  description: string;
  roles: string[];
  points: Record<string, number>;
  hasInteractionPhase: boolean;
  backgroundImage: string; 
  themeColor: string;
  playerCount: number;
  isComingSoon?: boolean; // New flag for unplayable games
}

export interface GameState {
  gameId: GameId;
  players: Player[];
  currentRound: number;
  maxRounds: number;
  phase: GamePhase;
  policeTask: string | null;
  policePlayerIndex: number;
  policeSelection: number;
  policeGuessWasCorrect: boolean | null;
  
  // Board Game State (Color War)
  board?: number[][]; // 0=empty, 1-4=playerId
  activePlayerId?: number; // 1-4
  selectedCell?: {r: number, c: number} | null;

  // Tic Tac Toe State
  xMoves?: number[];
  oMoves?: number[];
  tttTurn?: 'X' | 'O';
  tttWinner?: 'X' | 'O' | null;
  tttWinningLine?: number[] | null;

  // Sliding Puzzle State
  puzzleGrid?: number[]; // 1D array of numbers, 0 is empty
  puzzleSize?: number; // 3, 4, 5
  puzzleMoves?: number;
  puzzleTime?: number; // seconds
  puzzleStatus?: 'playing' | 'won' | 'setup';
  puzzleBestScore?: number;
}
