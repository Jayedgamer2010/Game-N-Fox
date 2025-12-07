
import { Player, GameId, GameDefinition } from "./types";

export const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: '', totalScore: 0, currentRole: null, roundPoints: 0, color: '#34C759', isAi: false }, // South (Green)
  { id: 2, name: '', totalScore: 0, currentRole: null, roundPoints: 0, color: '#007AFF', isAi: false }, // West (Blue)
  { id: 3, name: '', totalScore: 0, currentRole: null, roundPoints: 0, color: '#FF3B30', isAi: false }, // North (Red)
  { id: 4, name: '', totalScore: 0, currentRole: null, roundPoints: 0, color: '#FFCC00', isAi: false }, // East (Yellow)
];

export const MAX_ROUNDS = 16;

export const ROTATIONS = [
  '-rotate-6', // Player 1
  'rotate-3',  // Player 2
  'rotate-4',  // Player 3
  '-rotate-2'  // Player 4
];

export const GAMES: Record<GameId, GameDefinition> = {
  [GameId.THIEF_POLICE]: {
    id: GameId.THIEF_POLICE,
    title: "Thief and Police",
    description: "Who can you trust? A game of deception.",
    roles: ['Owner', 'Police', 'Robber', 'Thief'],
    playerCount: 4,
    points: {
      OWNER: 1000,
      POLICE_SUCCESS: 800,
      POLICE_FAIL: 0,
      ROBBER_SUCCESS: 600,
      THIEF_SUCCESS: 400,
      CAUGHT: 0
    },
    hasInteractionPhase: true,
    backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuChydtdEEmFRREs1MJ00Q1MlW0mP4iaQx82VhOM-T8VUvVXnGoL7Oipy-7BTJnDpcqzyv0Ay0uRNvHEx13-Gvr6OWxlKt_V7aH9-bcxUg39gM2MM_oIkM9B4wwueTwJH0pxSx_e1ouzPHjDfcjShwHXji_HKTcW8GrNNiTMMXrGNZGvwBtpItFfluTXRXYHd3LXCCbE5I6ydt6DXw3XKA7-cPZTe6GA--oXNm4xdzO-1_e0kR4mh19TlXsbc0JqsmYOQGcWVZceD_Q",
    themeColor: "#1e94f6"
  },
  [GameId.COLOR_WAR]: {
    id: GameId.COLOR_WAR,
    title: "Color War",
    description: "Conquer the grid! Convert enemies.",
    roles: ['Red', 'Blue', 'Green', 'Yellow'],
    playerCount: 4,
    points: { WINNER: 1000 },
    hasInteractionPhase: true,
    backgroundImage: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=2070&auto=format&fit=crop", 
    themeColor: "#FF9500"
  },
  [GameId.TIC_TAC_TOE]: {
    id: GameId.TIC_TAC_TOE,
    title: "Infinity Tic-Tac-Toe",
    description: "3-piece limit. Oldest disappears!",
    roles: ['Player X', 'Player O'],
    playerCount: 2,
    points: {
      WIN: 500,
      LOSE: 0,
      DRAW: 100
    },
    hasInteractionPhase: true, 
    backgroundImage: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?q=80&w=2074&auto=format&fit=crop",
    themeColor: "#00FFFF"
  },
  [GameId.SLIDING_PUZZLE]: {
    id: GameId.SLIDING_PUZZLE,
    title: "Sliding Puzzle",
    description: "Order the numbers. Slide to solve.",
    roles: ['Solver'],
    playerCount: 1,
    points: {
      WIN: 1000
    },
    hasInteractionPhase: true,
    backgroundImage: "https://images.unsplash.com/photo-1623942358987-a29777328dd3?q=80&w=2070&auto=format&fit=crop",
    themeColor: "#30CDFF"
  },
  [GameId.SPACE_RACE]: {
    id: GameId.SPACE_RACE,
    title: "Space Race",
    description: "Blast off! Race to the moon.",
    roles: ['1st Place', '2nd Place', '3rd Place', 'Crashed'],
    playerCount: 4,
    points: {
      '1st Place': 1000,
      '2nd Place': 600,
      '3rd Place': 300,
      'Crashed': 0
    },
    hasInteractionPhase: false,
    backgroundImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
    themeColor: "#8E44AD",
    isComingSoon: true
  },
  [GameId.CASTLE_SIEGE]: {
    id: GameId.CASTLE_SIEGE,
    title: "Castle Siege",
    description: "Attackers vs Defenders.",
    roles: ['Attacker', 'Attacker', 'Defender', 'Defender'],
    playerCount: 4,
    points: {
      Attacker: 500,
      Defender: 500
    },
    hasInteractionPhase: false,
    backgroundImage: "https://images.unsplash.com/photo-1599553733229-359f2d0496be?q=80&w=2070&auto=format&fit=crop",
    themeColor: "#C0392B",
    isComingSoon: true
  }
};
