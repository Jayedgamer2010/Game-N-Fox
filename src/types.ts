export type Role = string;

export interface Player {
  id: number;
  name: string;
  totalScore: number;
  currentRole: Role | null;
  roundPoints: number;
  color: string;
  isAi: boolean;
}

export enum GamePhase {
  HOME = 'HOME',
  SETUP = 'SETUP',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  POLICE_TASK = 'POLICE_TASK',
  POLICE_SELECTION = 'POLICE_SELECTION',
  PLAYING = 'PLAYING',
  REVEALING = 'REVEALING',
  VERDICT = 'VERDICT',
  ROUND_RESULTS = 'ROUND_RESULTS',
  LEADERBOARD = 'LEADERBOARD',
}

export enum GameId {
  THIEF_POLICE = 'THIEF_POLICE',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  SLIDING_PUZZLE = 'SLIDING_PUZZLE',
  SPACE_RACE = 'SPACE_RACE',
  CASTLE_SIEGE = 'CASTLE_SIEGE',
  COLOR_WAR = 'COLOR_WAR',
  QUAD_MATCH = 'QUAD_MATCH'
}

export interface GameDefinition {
  id: GameId;
  title: string;
  description: string;
  roles: string[];
  points: Record<string, number>;
  hasInteractionPhase: boolean;
  backgroundImage: string;
  cardImage?: string;
  themeColor: string;
  playerCount: number;
  isComingSoon?: boolean;
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
  board?: number[][];
  activePlayerId?: number;
  selectedCell?: {r: number, c: number} | null;
  xMoves?: number[];
  oMoves?: number[];
  tttTurn?: 'X' | 'O';
  tttWinner?: 'X' | 'O' | null;
  tttWinningLine?: number[] | null;
  puzzleGrid?: number[];
  puzzleSize?: number;
  puzzleMoves?: number;
  puzzleTime?: number;
  puzzleStatus?: 'playing' | 'won' | 'setup';
  puzzleBestScore?: number;
}
