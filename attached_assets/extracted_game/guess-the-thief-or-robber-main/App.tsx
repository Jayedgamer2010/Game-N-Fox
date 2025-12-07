import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, Player, Role, GameState, GameId } from './types';
import { INITIAL_PLAYERS, MAX_ROUNDS, GAMES, ROTATIONS } from './constants';

// --- Assets ---
const BGM_URL = "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=fun-life-112188.mp3"; 
const START_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3"; 
const ROLE_REVEAL_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-card-flip-2767.mp3";
const SELECT_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3";
const ROUND_END_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-game-level-completed-2059.mp3";
const VERDICT_REVEAL_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3"; 

// Purple Synthwave Grid Background
const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=2069&auto=format&fit=crop";

// --- Utility Components ---

const QuitButton: React.FC<{ onQuit: () => void }> = ({ onQuit }) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const DURATION = 3000; // 3 seconds

  const startHold = useCallback(() => {
    setHolding(true);
    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const p = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(p);

      if (p < 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Complete
        onQuit();
        setHolding(false);
        setProgress(0);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [onQuit]);

  const endHold = useCallback(() => {
    setHolding(false);
    setProgress(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      className="relative flex size-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors select-none group z-50 backdrop-blur-sm border border-white/10"
      title="Hold 3s to Quit"
    >
      <svg className="absolute inset-0 size-full -rotate-90 transform p-1 pointer-events-none">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={88} strokeDashoffset={88 - (88 * progress) / 100} className={`text-alert-red transition-all duration-75 ease-linear ${holding ? 'opacity-100' : 'opacity-0'}`} />
      </svg>
      <span className={`material-symbols-outlined text-white text-xl transition-opacity ${holding ? 'text-alert-red' : ''}`}>
        {holding ? 'close' : 'logout'}
      </span>
    </button>
  );
};

const MuteButton: React.FC<{ isMuted: boolean; onToggle: () => void }> = ({ isMuted, onToggle }) => {
  return (
    <button onClick={onToggle} className="flex size-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white z-50 backdrop-blur-sm border border-white/10">
      <span className="material-symbols-outlined text-xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
    </button>
  );
};

const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button onClick={onClick} className="flex size-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white z-50 backdrop-blur-sm border border-white/10">
      <span className="material-symbols-outlined text-xl">help</span>
    </button>
  );
};

const TutorialOverlay: React.FC<{ gameId: GameId; onDismiss: () => void }> = ({ gameId, onDismiss }) => {
  const game = GAMES[gameId];
  
  const getInstructions = () => {
    switch(gameId) {
      case GameId.THIEF_POLICE:
        return (
          <ul className="list-disc pl-5 space-y-2 text-left text-sm text-paper-text/80">
            <li><strong>Owner</strong> gets +1000 pts instantly.</li>
            <li><strong>Police</strong> must find the criminal based on the task (Thief or Robber).</li>
            <li><strong>Thief/Robber</strong> gain points if they hide successfully.</li>
            <li>Pass the device to the Police to see the secret task!</li>
          </ul>
        );
      case GameId.COLOR_WAR:
        return (
          <ul className="list-disc pl-5 space-y-2 text-left text-sm text-paper-text/80">
            <li><strong>Goal:</strong> Have the most tokens of your color.</li>
            <li><strong>Clone:</strong> Move to an adjacent space (1 tile) to spawn a new token.</li>
            <li><strong>Jump:</strong> Move 2 spaces to jump (leaves original spot empty).</li>
            <li><strong>Capture:</strong> Land next to enemy tokens to convert them to your color!</li>
          </ul>
        );
      case GameId.TIC_TAC_TOE:
        return (
          <ul className="list-disc pl-5 space-y-2 text-left text-sm text-paper-text/80">
            <li><strong>Infinity Rule:</strong> Each player can only have 3 pieces on the board.</li>
            <li><strong>Disappearing Act:</strong> Placing a 4th piece removes your oldest piece!</li>
            <li><strong>Win:</strong> Get 3 in a row (horizontal, vertical, or diagonal).</li>
            <li>Player X goes first. Watch out for your oldest piece (marked with !).</li>
          </ul>
        );
      case GameId.SLIDING_PUZZLE:
        return (
          <ul className="list-disc pl-5 space-y-2 text-left text-sm text-paper-text/80">
            <li><strong>Goal:</strong> Order the tiles from 1 to 15.</li>
            <li><strong>Move:</strong> Click tiles adjacent to the empty space to slide them.</li>
            <li><strong>Win:</strong> The numbers must be in order with the empty space at the end.</li>
            <li>Challenge yourself to solve it in the fewest moves!</li>
          </ul>
        );
      default:
        return <p className="text-sm text-paper-text/80">Follow the on-screen instructions. Good luck!</p>;
    }
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in-up">
      <div className="bg-paper rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-3xl text-primary">school</span>
          <h2 className="text-2xl font-bold text-paper-text">How to Play</h2>
        </div>
        <h3 className="text-lg font-bold text-primary mb-2">{game.title}</h3>
        {getInstructions()}
        <button 
          onClick={onDismiss}
          className="mt-6 w-full bg-primary text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState & { turnCount?: number }>({
    gameId: GameId.THIEF_POLICE, 
    players: JSON.parse(JSON.stringify(INITIAL_PLAYERS)),
    currentRound: 1,
    maxRounds: MAX_ROUNDS,
    phase: GamePhase.HOME,
    policeTask: null,
    policePlayerIndex: -1,
    policeSelection: -1,
    policeGuessWasCorrect: null,
    board: [],
    activePlayerId: 1,
    selectedCell: null,
    turnCount: 0,
    xMoves: [],
    oMoves: [],
    tttTurn: 'X',
    tttWinner: null,
    tttWinningLine: null,
    puzzleGrid: [],
    puzzleSize: 4,
    puzzleMoves: 0,
    puzzleTime: 0,
    puzzleStatus: 'playing',
    puzzleBestScore: 0
  });

  // --- UI/Audio State ---
  const [isMuted, setIsMuted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [isTaskRevealed, setIsTaskRevealed] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  const currentGame = GAMES[gameState.gameId];

  // --- Audio Logic ---
  useEffect(() => {
    bgmRef.current = new Audio(BGM_URL);
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.08; 
    return () => {
      if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!bgmRef.current) return;
    const shouldPlay = !isMuted && gameState.phase !== GamePhase.HOME && gameState.phase !== GamePhase.SETUP && gameState.phase !== GamePhase.LEADERBOARD;
    if (shouldPlay) {
      if (bgmRef.current.paused) bgmRef.current.play().catch(e => console.log("Audio play failed:", e));
    } else {
      bgmRef.current.pause();
    }
  }, [gameState.phase, isMuted]);

  const playSfx = useCallback((url: string) => {
    if (isMuted) return;
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(e => console.log(e));
  }, [isMuted]);

  // --- Timer Logic for Sliding Puzzle ---
  useEffect(() => {
    if (gameState.gameId === GameId.SLIDING_PUZZLE && gameState.phase === GamePhase.PLAYING && gameState.puzzleStatus === 'playing') {
        timerIntervalRef.current = window.setInterval(() => {
            setGameState(prev => ({ ...prev, puzzleTime: (prev.puzzleTime || 0) + 1 }));
        }, 1000);
    } else {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState.gameId, gameState.phase, gameState.puzzleStatus]);

  // --- Logic: Initialize Game ---
  const initGame = (names: string[], aiConfig: { enabled: boolean, count: number }) => {
    playSfx(START_SFX_URL);
    
    // Show tutorial on first play
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      setHasSeenTutorial(true);
    }

    setGameState(prev => {
        const gameDef = GAMES[prev.gameId];
        const count = gameDef.playerCount; // 1, 2, or 4
        
        // Slice INITIAL_PLAYERS to match game player count
        const activeInitialPlayers = INITIAL_PLAYERS.slice(0, count);

        const newPlayers = activeInitialPlayers.map((p, i) => {
            // Determine AI status based on total players and AI config
            // For 2 players (TTT): if AI enabled, Player 2 is AI
            // For 4 players: Same logic as before
            let isAi = false;
            if (aiConfig.enabled) {
                if (count === 2 && i === 1) isAi = true;
                else if (count === 4 && i >= (4 - aiConfig.count)) isAi = true;
            }

            let finalName = names[i];
            if (isAi && !finalName) finalName = `Bot ${i + 1}`;
            else if (!finalName) finalName = `Player ${i + 1}`;
            return { ...p, name: finalName, isAi: isAi };
        });
        
        return { ...prev, players: newPlayers, phase: GamePhase.ASSIGN_ROLES, currentRound: 1 };
    });
  };

  const getSecureRandom = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / (0xFFFFFFFF + 1);
    }
    return Math.random();
  };

  const initColorWarBoard = (players: Player[]) => {
    const size = 7;
    const board = Array(size).fill(0).map(() => Array(size).fill(0));
    board[0][0] = 1; board[0][size-1] = 2; board[size-1][0] = 3; board[size-1][size-1] = 4;
    return board;
  };

  // --- SLIDING PUZZLE LOGIC ---
  const createSolvableBoard = (size: number) => {
      const totalTiles = size * size;
      let grid = Array.from({ length: totalTiles }, (_, i) => (i + 1) % totalTiles); 
      let emptyIdx = totalTiles - 1;
      const shuffleMoves = 1000;
      for (let i = 0; i < shuffleMoves; i++) {
          const neighbors = [];
          const row = Math.floor(emptyIdx / size);
          const col = emptyIdx % size;
          if (row > 0) neighbors.push(emptyIdx - size);
          if (row < size - 1) neighbors.push(emptyIdx + size);
          if (col > 0) neighbors.push(emptyIdx - 1);
          if (col < size - 1) neighbors.push(emptyIdx + 1);
          const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
          [grid[emptyIdx], grid[randomNeighbor]] = [grid[randomNeighbor], grid[emptyIdx]];
          emptyIdx = randomNeighbor;
      }
      return grid;
  };

  const checkPuzzleWin = (grid: number[]) => {
      const total = grid.length;
      for (let i = 0; i < total - 1; i++) {
          if (grid[i] !== i + 1) return false;
      }
      return grid[total - 1] === 0;
  };

  const handleTileClick = (index: number) => {
      if (gameState.puzzleStatus !== 'playing') return;
      const size = gameState.puzzleSize || 4;
      const grid = [...(gameState.puzzleGrid || [])];
      const emptyIdx = grid.indexOf(0);
      const row = Math.floor(index / size);
      const col = index % size;
      const emptyRow = Math.floor(emptyIdx / size);
      const emptyCol = emptyIdx % size;
      const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;
      if (isAdjacent) {
          playSfx(SELECT_SFX_URL);
          [grid[index], grid[emptyIdx]] = [grid[emptyIdx], grid[index]];
          const isWin = checkPuzzleWin(grid);
          let newStatus: 'playing' | 'won' = 'playing';
          let newPhase = GamePhase.PLAYING;
          if (isWin) {
              playSfx(ROUND_END_SFX_URL);
              newStatus = 'won';
              newPhase = GamePhase.LEADERBOARD;
          }
          setGameState(prev => ({
              ...prev,
              puzzleGrid: grid,
              puzzleMoves: (prev.puzzleMoves || 0) + 1,
              puzzleStatus: newStatus,
              phase: isWin ? newPhase : prev.phase,
              players: isWin ? prev.players.map((p, i) => i === 0 ? { ...p, totalScore: 1000 } : p) : prev.players
          }));
      }
  };

  const resetPuzzle = (size: number) => {
      setGameState(prev => ({
          ...prev,
          puzzleGrid: createSolvableBoard(size),
          puzzleSize: size,
          puzzleMoves: 0,
          puzzleTime: 0,
          puzzleStatus: 'playing'
      }));
  };

  const startRound = useCallback(() => {
    playSfx(ROLE_REVEAL_SFX_URL);

    if (gameState.gameId === GameId.COLOR_WAR) {
        setGameState(prev => ({
            ...prev,
            board: initColorWarBoard(prev.players),
            activePlayerId: 1, 
            selectedCell: null,
            phase: GamePhase.PLAYING,
            maxRounds: 1,
            turnCount: 0
        }));
        return;
    }

    if (gameState.gameId === GameId.TIC_TAC_TOE) {
        setGameState(prev => ({
            ...prev,
            xMoves: [],
            oMoves: [],
            tttTurn: 'X',
            tttWinner: null,
            tttWinningLine: null,
            phase: GamePhase.PLAYING,
            maxRounds: 1
        }));
        return;
    }

    if (gameState.gameId === GameId.SLIDING_PUZZLE) {
        setGameState(prev => ({
            ...prev,
            puzzleGrid: createSolvableBoard(4),
            puzzleSize: 4,
            puzzleMoves: 0,
            puzzleTime: 0,
            puzzleStatus: 'playing',
            phase: GamePhase.PLAYING,
            maxRounds: 1
        }));
        return;
    }

    const gameDef = GAMES[gameState.gameId];
    const roles: Role[] = [...gameDef.roles]; 
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(getSecureRandom() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    setGameState(prev => {
      let task = null;
      if (prev.gameId === GameId.THIEF_POLICE) {
          task = prev.currentRound % 2 !== 0 ? 'Thief' : 'Robber';
      }

      const newPlayers = prev.players.map((p, i) => {
        const role = roles[i];
        let roundPoints = 0;
        let totalScore = p.totalScore;
        if (prev.gameId === GameId.THIEF_POLICE && role === 'Owner') {
            roundPoints = gameDef.points['OWNER'];
            totalScore += gameDef.points['OWNER'];
        } 
        return { ...p, currentRole: role, roundPoints: roundPoints, totalScore: totalScore };
      });

      let policeIndex = -1;
      if (prev.gameId === GameId.THIEF_POLICE) {
          policeIndex = newPlayers.findIndex(p => p.currentRole === 'Police');
      }

      const nextPhase = gameDef.hasInteractionPhase ? GamePhase.POLICE_TASK : GamePhase.ROUND_RESULTS;
      return {
        ...prev,
        players: newPlayers,
        policeTask: task,
        policePlayerIndex: policeIndex,
        policeSelection: -1,
        policeGuessWasCorrect: null,
        phase: nextPhase
      };
    });
    
    setIsTaskRevealed(false);
  }, [gameState.gameId, playSfx]);

  useEffect(() => {
    if (gameState.phase === GamePhase.ASSIGN_ROLES) {
      const timer = setTimeout(() => { startRound(); }, 2500); 
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, startRound]);

  useEffect(() => {
    if (gameState.phase === GamePhase.ROUND_RESULTS && !GAMES[gameState.gameId].hasInteractionPhase) {
        playSfx(ROUND_END_SFX_URL);
        setGameState(prev => {
            const gameDef = GAMES[prev.gameId];
            const updatedPlayers = prev.players.map(p => {
                const points = gameDef.points[p.currentRole!] || 0;
                if (p.roundPoints === 0 && points !== 0) {
                   return { ...p, roundPoints: points, totalScore: p.totalScore + points };
                }
                return p;
            });
            return { ...prev, players: updatedPlayers };
        });
    }
  }, [gameState.phase, gameState.gameId, playSfx]);

  const handlePoliceSelection = useCallback((targetIndex: number) => {
    playSfx(SELECT_SFX_URL);

    setGameState(prev => {
        if (prev.phase !== GamePhase.POLICE_SELECTION) return prev;
        const targetRole = prev.players[targetIndex].currentRole;
        if (targetIndex === prev.policePlayerIndex || targetRole === 'Owner') return prev;
        return { ...prev, phase: GamePhase.REVEALING, policeSelection: targetIndex };
    });

    setTimeout(() => {
      playSfx(VERDICT_REVEAL_SFX_URL);
      setGameState(prev => {
        if (prev.phase !== GamePhase.REVEALING) return prev;
        const gameDef = GAMES[GameId.THIEF_POLICE];
        const policeIndex = prev.policePlayerIndex;
        const targetPlayer = prev.players[targetIndex];
        const task = prev.policeTask;
        const isCorrect = targetPlayer.currentRole === task;
        
        const updatedPlayers = prev.players.map((p, idx) => {
          if (idx === policeIndex) {
            const pointsEarned = isCorrect ? gameDef.points['POLICE_SUCCESS'] : gameDef.points['POLICE_FAIL'];
            return { ...p, roundPoints: pointsEarned, totalScore: p.totalScore + pointsEarned };
          }
          if (idx === targetIndex) {
            if (isCorrect) return { ...p, roundPoints: 0 }; 
            else {
               if (p.currentRole === 'Robber') { const pts = gameDef.points['ROBBER_SUCCESS']; return { ...p, roundPoints: pts, totalScore: p.totalScore + pts }; }
               if (p.currentRole === 'Thief') { const pts = gameDef.points['THIEF_SUCCESS']; return { ...p, roundPoints: pts, totalScore: p.totalScore + pts }; }
               return p; 
            }
          }
          if (idx !== policeIndex && idx !== targetIndex) {
             if (p.currentRole === 'Robber') { const pts = gameDef.points['ROBBER_SUCCESS']; return { ...p, roundPoints: pts, totalScore: p.totalScore + pts }; }
             if (p.currentRole === 'Thief') { const pts = gameDef.points['THIEF_SUCCESS']; return { ...p, roundPoints: pts, totalScore: p.totalScore + pts }; }
          }
          return p;
        });
  
        return { ...prev, players: updatedPlayers, policeGuessWasCorrect: isCorrect, phase: GamePhase.VERDICT };
      });

      setTimeout(() => {
        playSfx(ROUND_END_SFX_URL);
        setGameState(prev => ({ ...prev, phase: GamePhase.ROUND_RESULTS }));
      }, 3500); 
    }, 2000);
  }, [playSfx]); 

  // --- TIC TAC TOE LOGIC ---
  const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  const checkTicTacToeWin = (moves: number[]) => {
    if (moves.length < 3) return null;
    for (const line of WINNING_LINES) {
      if (line.every(index => moves.includes(index))) {
        return line;
      }
    }
    return null;
  };

  const handleTicTacToeCellClick = (index: number) => {
    if (gameState.tttWinner || gameState.phase !== GamePhase.PLAYING) return;
    if (gameState.xMoves?.includes(index) || gameState.oMoves?.includes(index)) return;
    if (gameState.tttTurn === 'O' && gameState.players[1].isAi) return;

    playSfx(SELECT_SFX_URL);

    setGameState(prev => {
        const isX = prev.tttTurn === 'X';
        const currentMoves = isX ? [...(prev.xMoves || [])] : [...(prev.oMoves || [])];
        const nextMoves = [...currentMoves, index];
        
        if (nextMoves.length > 3) nextMoves.shift();

        const winLine = checkTicTacToeWin(nextMoves);
        const nextTurn = isX ? 'O' : 'X';
        const nextX = isX ? nextMoves : prev.xMoves;
        const nextO = isX ? prev.oMoves : nextMoves;

        let newState = {
            ...prev,
            xMoves: nextX,
            oMoves: nextO,
            tttTurn: nextTurn,
            tttWinningLine: winLine || null,
            tttWinner: winLine ? (isX ? 'X' : 'O') : null
        };

        if (winLine) {
            playSfx(ROUND_END_SFX_URL);
            const points = GAMES[GameId.TIC_TAC_TOE].points;
            const updatedPlayers = prev.players.map((p, i) => {
                let pts = 0;
                if (isX && i === 0) pts = points.WIN;
                if (!isX && i === 1) pts = points.WIN;
                return { ...p, totalScore: p.totalScore + pts, roundPoints: pts };
            });
            newState = { ...newState, players: updatedPlayers, phase: GamePhase.LEADERBOARD };
        }

        return newState;
    });
  };

  // --- SMART AI: TIC TAC TOE ---
  useEffect(() => {
      if (gameState.gameId === GameId.TIC_TAC_TOE && gameState.phase === GamePhase.PLAYING && !gameState.tttWinner) {
          if (gameState.players.length > 1 && gameState.tttTurn === 'O' && gameState.players[1].isAi) {
              const timer = setTimeout(() => {
                  playSfx(SELECT_SFX_URL);
                  
                  // Minimax-style Heuristic
                  const occupied = [...(gameState.xMoves || []), ...(gameState.oMoves || [])];
                  const available = [0,1,2,3,4,5,6,7,8].filter(i => !occupied.includes(i));
                  
                  // 1. Check for Winning Move
                  for (const move of available) {
                      const potentialMoves = [...(gameState.oMoves || []), move];
                      if (potentialMoves.length > 3) potentialMoves.shift(); // Simulate disappearing
                      if (checkTicTacToeWin(potentialMoves)) {
                          makeTicTacToeAiMove(move);
                          return;
                      }
                  }

                  // 2. Check for Blocking Move
                  for (const move of available) {
                      const potentialEnemyMoves = [...(gameState.xMoves || []), move];
                      // Note: Opponent doesn't lose a piece on MY turn, but we check if they *would* win if they played here
                      // However, in Infinity TTT, placing a piece might remove their old piece. 
                      // Simple blocking: If they have 2 in a row, block the 3rd.
                      if (checkTicTacToeWin(potentialEnemyMoves)) {
                          makeTicTacToeAiMove(move);
                          return;
                      }
                  }

                  // 3. Center
                  if (available.includes(4)) {
                      makeTicTacToeAiMove(4);
                      return;
                  }

                  // 4. Random Valid
                  if (available.length > 0) {
                      const randomMove = available[Math.floor(Math.random() * available.length)];
                      makeTicTacToeAiMove(randomMove);
                  }
              }, 1000);
              return () => clearTimeout(timer);
          }
      }
  }, [gameState.tttTurn, gameState.phase, gameState.gameId, gameState.tttWinner]);

  const makeTicTacToeAiMove = (index: number) => {
      setGameState(prev => {
          const nextMoves = [...(prev.oMoves || []), index];
          if (nextMoves.length > 3) nextMoves.shift();
          
          const winLine = checkTicTacToeWin(nextMoves);
          let newState = {
              ...prev,
              oMoves: nextMoves,
              tttTurn: 'X',
              tttWinningLine: winLine || null,
              tttWinner: winLine ? 'O' : null
          };

          if (winLine) {
              playSfx(ROUND_END_SFX_URL);
              const points = GAMES[GameId.TIC_TAC_TOE].points;
              const updatedPlayers = prev.players.map((p, i) => {
                  let pts = (i === 1) ? points.WIN : 0;
                  return { ...p, totalScore: p.totalScore + pts, roundPoints: pts };
              });
              newState = { ...newState, players: updatedPlayers, phase: GamePhase.LEADERBOARD };
          }
          return newState;
      });
  };

  useEffect(() => {
      if (gameState.gameId === GameId.THIEF_POLICE && gameState.phase === GamePhase.POLICE_TASK) {
          const police = gameState.players[gameState.policePlayerIndex];
          if (police && police.isAi) {
              const timer = setTimeout(() => { setGameState(prev => ({ ...prev, phase: GamePhase.POLICE_SELECTION })); }, 1500);
              return () => clearTimeout(timer);
          }
      }
  }, [gameState.phase, gameState.gameId, gameState.policePlayerIndex, gameState.players]);

  useEffect(() => {
    if (gameState.gameId === GameId.THIEF_POLICE && gameState.phase === GamePhase.POLICE_SELECTION) {
        const police = gameState.players[gameState.policePlayerIndex];
        if (police && police.isAi) {
            const timer = setTimeout(() => {
                const validTargets = gameState.players
                    .map((p, idx) => ({ idx, role: p.currentRole }))
                    .filter(p => p.idx !== gameState.policePlayerIndex && p.role !== 'Owner')
                    .map(p => p.idx);
                if (validTargets.length > 0) {
                    const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                    handlePoliceSelection(randomTarget);
                }
            }, 3000); 
            return () => clearTimeout(timer);
        }
    }
  }, [gameState.phase, gameState.gameId, gameState.policePlayerIndex, gameState.players, handlePoliceSelection]);

  useEffect(() => {
      if (gameState.gameId === GameId.COLOR_WAR && gameState.phase === GamePhase.PLAYING && gameState.board) {
          const activePlayer = gameState.players[gameState.activePlayerId! - 1];
          if (activePlayer.isAi) {
              const timer = setTimeout(() => { makeColorWarAiMove(); }, 1500); 
              return () => clearTimeout(timer);
          }
      }
  }, [gameState.activePlayerId, gameState.phase, gameState.gameId]);

  // --- SMART AI: COLOR WAR ---
  const makeColorWarAiMove = () => {
      setGameState(prev => {
          if (!prev.board) return prev;
          const board = prev.board;
          const aiId = prev.activePlayerId!;
          
          let bestMove = null;
          let maxScore = -9999;

          for (let r = 0; r < 7; r++) {
              for (let c = 0; c < 7; c++) {
                  if (board[r][c] === aiId) {
                      for (let i = r - 2; i <= r + 2; i++) {
                          for (let j = c - 2; j <= c + 2; j++) {
                              if (i >= 0 && i < 7 && j >= 0 && j < 7 && board[i][j] === 0) {
                                  // Evaluate Move
                                  let myGain = 0;
                                  let enemyLoss = 0;
                                  
                                  const dist = Math.max(Math.abs(r - i), Math.abs(c - j));
                                  if (dist === 1) myGain += 1; // Clone adds 1 piece
                                  
                                  // Captures
                                  for (let nr = i - 1; nr <= i + 1; nr++) {
                                      for (let nc = j - 1; nc <= j + 1; nc++) {
                                          if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) {
                                              const val = board[nr][nc];
                                              if (val > 0 && val !== aiId) {
                                                  myGain++;
                                                  enemyLoss++;
                                              }
                                          }
                                      }
                                  }
                                  
                                  let score = (myGain + enemyLoss) * 10; // Prioritize captures/growth
                                  
                                  // Positional Heuristics
                                  // Corners are valuable
                                  if ((i===0||i===6) && (j===0||j===6)) score += 5;
                                  // Edges okay
                                  else if (i===0||i===6||j===0||j===6) score += 2;
                                  
                                  // Penalty for Jumps that don't capture (leaves hole)
                                  if (dist === 2 && enemyLoss === 0) score -= 5;

                                  // Random factor for unpredictability
                                  score += Math.random();

                                  if (score > maxScore) { 
                                      maxScore = score; 
                                      bestMove = { from: {r, c}, to: {r: i, c: j} }; 
                                  }
                              }
                          }
                      }
                  }
              }
          }

          if (bestMove) {
              return { ...prev, selectedCell: bestMove.from };
          }
          return prev;
      });

      // Execute Move (Re-run logic for consistency or store move)
      // For simplicity/robustness in React state, we re-run logic restricted to selected cell or globally
      setTimeout(() => {
          setGameState(prev => {
              if (!prev.board) return prev;
              // ... Re-run logic similar to above to find target from selectedCell ...
              // [Omitted full duplication for brevity, assumes logic finds same best move]
              // Actual implementation executes the move found.
              
              // To ensure it works, we'll just re-run the search to find the *target* for the already selected source.
              const board = prev.board;
              const aiId = prev.activePlayerId!;
              // ... search for best target from prev.selectedCell ...
              // (If selectedCell is null, fallback to passing turn)
              
              if (!prev.selectedCell) return { ...prev, activePlayerId: prev.activePlayerId! % 4 + 1 };

              let bestTarget = null;
              let maxScore = -9999;
              const r = prev.selectedCell.r;
              const c = prev.selectedCell.c;

              for (let i = r - 2; i <= r + 2; i++) {
                  for (let j = c - 2; j <= c + 2; j++) {
                      if (i >= 0 && i < 7 && j >= 0 && j < 7 && board[i][j] === 0) {
                          // ... Same score logic ...
                          let myGain = 0; let enemyLoss = 0;
                          const dist = Math.max(Math.abs(r - i), Math.abs(c - j));
                          if (dist === 1) myGain += 1; 
                          for (let nr = i - 1; nr <= i + 1; nr++) { for (let nc = j - 1; nc <= j + 1; nc++) { if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) { const val = board[nr][nc]; if (val > 0 && val !== aiId) { myGain++; enemyLoss++; } } } }
                          let score = (myGain + enemyLoss) * 10;
                          if ((i===0||i===6) && (j===0||j===6)) score += 5;
                          else if (i===0||i===6||j===0||j===6) score += 2;
                          if (dist === 2 && enemyLoss === 0) score -= 5;
                          score += Math.random();
                          if (score > maxScore) { maxScore = score; bestTarget = {r: i, c: j}; }
                      }
                  }
              }

              if (bestTarget) {
                  playSfx(SELECT_SFX_URL);
                  const newBoard = board.map(row => [...row]);
                  const { r: toR, c: toC } = bestTarget;
                  const dist = Math.max(Math.abs(r - toR), Math.abs(c - toC));
                  newBoard[toR][toC] = aiId;
                  if (dist === 2) newBoard[r][c] = 0; 
                  for (let i = toR - 1; i <= toR + 1; i++) {
                      for (let j = toC - 1; j <= toC + 1; j++) {
                          if (i >= 0 && i < 7 && j >= 0 && j < 7) {
                              const val = newBoard[i][j];
                              if (val > 0 && val !== aiId) newBoard[i][j] = aiId;
                          }
                      }
                  }
                  
                  let nextPlayerId = aiId % 4 + 1;
                  let movesPossible = false;
                  let checkedCount = 0;
                  while (checkedCount < 4) { if (canPlayerMove(newBoard, nextPlayerId)) { movesPossible = true; break; } nextPlayerId = nextPlayerId % 4 + 1; checkedCount++; }
                  
                  if (!movesPossible) {
                      playSfx(ROUND_END_SFX_URL);
                      const scores = { 1: 0, 2: 0, 3: 0, 4: 0 };
                      newBoard.forEach(row => row.forEach(cell => { if(cell>0) scores[cell as 1|2|3|4]++; }));
                      const updatedPlayers = prev.players.map(p => ({ ...p, totalScore: scores[p.id as 1|2|3|4] * 10, roundPoints: scores[p.id as 1|2|3|4] }));
                      return { ...prev, board: newBoard, players: updatedPlayers, phase: GamePhase.LEADERBOARD };
                  }
                  return { ...prev, board: newBoard, activePlayerId: nextPlayerId, selectedCell: null };
              }
              return { ...prev, activePlayerId: prev.activePlayerId! % 4 + 1, selectedCell: null };
          });
      }, 1000);
  };

  const handleCellClick = (r: number, c: number) => {
      if (gameState.phase !== GamePhase.PLAYING || gameState.gameId !== GameId.COLOR_WAR) return;
      const activePlayer = gameState.players[gameState.activePlayerId! - 1];
      if (activePlayer.isAi) return; 
      const board = gameState.board!;
      const currentPlayerId = gameState.activePlayerId!;
      const cellValue = board[r][c];

      if (cellValue === currentPlayerId) {
          playSfx(SELECT_SFX_URL);
          setGameState(prev => ({ ...prev, selectedCell: { r, c } }));
          return;
      }

      if (gameState.selectedCell && cellValue === 0) {
          const { r: selectedR, c: selectedC } = gameState.selectedCell;
          const dr = Math.abs(r - selectedR);
          const dc = Math.abs(c - selectedC);
          const maxDist = Math.max(dr, dc);

          if (maxDist > 0 && maxDist <= 2) {
              playSfx(SELECT_SFX_URL);
              const newBoard = board.map(row => [...row]);
              newBoard[r][c] = currentPlayerId;
              if (maxDist === 2) newBoard[selectedR][selectedC] = 0; 
              for (let i = r - 1; i <= r + 1; i++) {
                  for (let j = c - 1; j <= c + 1; j++) {
                      if (i >= 0 && i < 7 && j >= 0 && j < 7) {
                          const neighborVal = newBoard[i][j];
                          if (neighborVal !== 0 && neighborVal !== currentPlayerId) newBoard[i][j] = currentPlayerId; 
                      }
                  }
              }
              let nextPlayerId = currentPlayerId % 4 + 1;
              let movesPossible = false;
              let checkedCount = 0;
              while (checkedCount < 4) {
                 if (canPlayerMove(newBoard, nextPlayerId)) { movesPossible = true; break; }
                 nextPlayerId = nextPlayerId % 4 + 1;
                 checkedCount++;
              }
              if (!movesPossible) {
                  playSfx(ROUND_END_SFX_URL);
                  calculateColorWarScores(newBoard);
                  return;
              }
              setGameState(prev => ({ ...prev, board: newBoard, activePlayerId: nextPlayerId, selectedCell: null }));
          }
      }
  };

  const canPlayerMove = (board: number[][], playerId: number) => {
      for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
              if (board[r][c] === playerId) {
                  for (let i = r - 2; i <= r + 2; i++) {
                      for (let j = c - 2; j <= c + 2; j++) {
                          if (i >= 0 && i < 7 && j >= 0 && j < 7 && board[i][j] === 0) return true;
                      }
                  }
              }
          }
      }
      return false;
  };

  const calculateColorWarScores = (board: number[][]) => {
      const scores = { 1: 0, 2: 0, 3: 0, 4: 0 };
      board.forEach(row => row.forEach(cell => { if (cell > 0) scores[cell as 1|2|3|4]++; }));
      setGameState(prev => {
          const updatedPlayers = prev.players.map(p => ({ ...p, totalScore: scores[p.id as 1|2|3|4] * 10, roundPoints: scores[p.id as 1|2|3|4] }));
          return { ...prev, board: board, players: updatedPlayers, phase: GamePhase.LEADERBOARD };
      });
  };

  const handleNextPhase = () => {
    if (gameState.currentRound >= gameState.maxRounds) {
      setGameState(prev => ({ ...prev, phase: GamePhase.LEADERBOARD }));
    } else {
      setGameState(prev => ({ ...prev, currentRound: prev.currentRound + 1, phase: GamePhase.ASSIGN_ROLES }));
    }
  };

  const handleReset = () => {
     setGameState(prev => ({ ...prev, players: JSON.parse(JSON.stringify(INITIAL_PLAYERS)), currentRound: 1, phase: GamePhase.SETUP, policeTask: null, policePlayerIndex: -1, policeSelection: -1, policeGuessWasCorrect: null }));
     setIsTaskRevealed(false);
  };

  const handleGoHome = () => {
    setGameState({ gameId: GameId.THIEF_POLICE, players: JSON.parse(JSON.stringify(INITIAL_PLAYERS)), currentRound: 1, maxRounds: MAX_ROUNDS, phase: GamePhase.HOME, policeTask: null, policePlayerIndex: -1, policeSelection: -1, policeGuessWasCorrect: null });
  }

  const handleSelectGame = (id: GameId) => { setGameState(prev => ({ ...prev, gameId: id, phase: GamePhase.SETUP })); };

  // --- Styles & Rendering ---
  const getCardStyle = (player: Player, index: number) => {
    const isPolice = index === gameState.policePlayerIndex;
    const isOwner = player.currentRole === 'Owner'; 
    const isSelected = index === gameState.policeSelection;
    
    // Visibility Rules
    const showRole = 
      gameState.phase === GamePhase.VERDICT || 
      gameState.phase === GamePhase.ROUND_RESULTS || 
      gameState.phase === GamePhase.LEADERBOARD ||
      (gameState.gameId === GameId.THIEF_POLICE && (isPolice || isOwner)); 

    let bgClass = "bg-paper";
    let textClass = "text-paper-text";

    if (showRole && player.currentRole) {
        const r = player.currentRole.toLowerCase();
        if (r.includes('king') || r.includes('owner') || r.includes('1st') || r.includes('solver')) bgClass = "bg-role-owner";
        else if (r.includes('police') || r.includes('queen') || r.includes('hunter')) { bgClass = "bg-role-police"; textClass = "text-white"; }
        else if (r.includes('robber') || r.includes('knight')) { bgClass = "bg-role-robber"; textClass = "text-white"; }
        else if (r.includes('thief')) { bgClass = "bg-role-thief"; textClass = "text-white"; }
        else if (r === 'crashed' || r === 'peasant' || r === 'empty') bgClass = "bg-zinc-400";
    }

    if (gameState.phase === GamePhase.VERDICT && gameState.gameId === GameId.THIEF_POLICE) {
        if (gameState.policeGuessWasCorrect) { bgClass = "bg-cta-green ring-4 ring-green-300"; textClass = "text-white"; } 
        else if (isSelected) { bgClass = "bg-alert-red ring-4 ring-red-300"; textClass = "text-white"; }
    } else if (gameState.phase === GamePhase.REVEALING && isSelected) {
      bgClass = "bg-yellow-100 ring-4 ring-yellow-400";
    }

    return { bgClass, textClass, showRole };
  };

  const renderContent = () => {
    if (gameState.phase === GamePhase.HOME) {
      return <HomeScreen onSelectGame={handleSelectGame} />;
    }
    
    if (gameState.phase === GamePhase.SETUP) {
      return <SetupScreen gameName={currentGame.title} onStart={initGame} onBack={handleGoHome} />;
    }
    
    if (gameState.phase === GamePhase.LEADERBOARD) {
      return <Leaderboard players={gameState.players} onPlayAgain={handleReset} onHome={handleGoHome} />;
    }

    // --- GAME CONTENT ---
    const policePlayer = gameState.policePlayerIndex >= 0 ? gameState.players[gameState.policePlayerIndex] : null;

    return (
      <div className="flex-1 flex flex-col w-full h-full">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pb-2 pointer-events-none">
           <div className="flex items-center gap-3 pointer-events-auto">
               <QuitButton onQuit={handleGoHome} />
               <MuteButton isMuted={isMuted} onToggle={() => setIsMuted(!isMuted)} />
               <HelpButton onClick={() => setShowTutorial(true)} />
           </div>
           <h2 id="roundCounter" className="flex-1 text-center text-xl font-bold text-white pr-24 drop-shadow-md">
             {gameState.gameId === GameId.COLOR_WAR ? 'Color War' : gameState.gameId === GameId.TIC_TAC_TOE ? 'Tic-Tac-Toe' : gameState.gameId === GameId.SLIDING_PUZZLE ? 'Sliding Puzzle' : `Round ${gameState.currentRound}`}
           </h2>
        </div>

        <main className="flex-1 flex-grow flex-col items-center justify-center p-4 relative z-10">
          {/* ASSIGNING ANIMATION */}
          {gameState.phase === GamePhase.ASSIGN_ROLES && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 animate-fade-in-up">
               {gameState.gameId === GameId.THIEF_POLICE ? (
                   <div className="relative size-20 mb-6">
                      <div className="absolute inset-0 border-4 border-white/20 rounded-xl rotate-0 animate-[spin_1s_linear_infinite]"></div>
                      <div className="absolute inset-0 border-4 border-white/40 rounded-xl rotate-45 animate-[spin_1.5s_linear_infinite]"></div>
                      <div className="absolute inset-0 border-4 border-primary rounded-xl -rotate-12 animate-[spin_2s_linear_infinite]"></div>
                   </div>
               ) : (
                   <div className="relative size-20 mb-6">
                      <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                   </div>
               )}
               
               <p className="text-white text-2xl font-bold animate-pulse">
                  {gameState.gameId === GameId.SPACE_RACE ? "Launching Rockets..." : 
                   gameState.gameId === GameId.COLOR_WAR ? "Preparing Grid..." : 
                   gameState.gameId === GameId.TIC_TAC_TOE ? "Drawing Board..." : 
                   gameState.gameId === GameId.SLIDING_PUZZLE ? "Shuffling Tiles..." : 
                   gameState.gameId === GameId.THIEF_POLICE ? "Shuffling Roles..." : "Assigning Roles..."}
               </p>
             </div>
          )}

          {/* REVEALING ANIMATION */}
          {gameState.phase === GamePhase.REVEALING && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-40 backdrop-blur-sm animate-fade-in-up">
               <div className="bg-white/10 p-6 rounded-2xl flex flex-col items-center border border-white/20 shadow-2xl backdrop-blur-md">
                 <span className="material-symbols-outlined text-6xl text-yellow-400 animate-bounce mb-4">search</span>
                 <h3 className="text-white text-2xl font-bold">Investigating...</h3>
               </div>
             </div>
          )}

          {/* VERDICT OVERLAY - DELAYED POPUP */}
          {gameState.phase === GamePhase.VERDICT && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
               <div 
                 className={`p-8 rounded-2xl flex flex-col items-center shadow-2xl border-4 transform scale-110 opacity-0
                   ${gameState.policeGuessWasCorrect ? 'bg-cta-green border-green-300' : 'bg-alert-red border-red-300'}`}
                 style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.7s forwards' }}
               >
                 <span className="material-symbols-outlined text-7xl text-white mb-2">{gameState.policeGuessWasCorrect ? 'check_circle' : 'cancel'}</span>
                 <h3 className="text-white text-4xl font-extrabold uppercase tracking-widest">{gameState.policeGuessWasCorrect ? 'CORRECT!' : 'WRONG!'}</h3>
               </div>
               <style>{`
                 @keyframes popIn {
                   0% { opacity: 0; transform: scale(0.5); }
                   100% { opacity: 1; transform: scale(1.1); }
                 }
               `}</style>
             </div>
          )}

          {/* --- COLOR WAR GRID --- */}
          {gameState.gameId === GameId.COLOR_WAR && gameState.phase === GamePhase.PLAYING && gameState.board ? (
              <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up">
                  <div className="mb-6 px-8 py-3 rounded-2xl font-bold text-white shadow-xl flex items-center gap-3 transform transition-all duration-300 border-2 border-white/20 backdrop-blur-sm" style={{ backgroundColor: gameState.players[gameState.activePlayerId! - 1].color, boxShadow: `0 10px 30px -10px ${gameState.players[gameState.activePlayerId! - 1].color}80`}}>
                     {gameState.players[gameState.activePlayerId! - 1].isAi && <span className="material-symbols-outlined text-2xl animate-pulse">smart_toy</span>}
                     <span className="text-lg tracking-wide uppercase">{gameState.players[gameState.activePlayerId! - 1].name}'s Turn</span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10">
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                          {gameState.board.map((row, r) => (
                              row.map((cell, c) => {
                                  const isSelected = gameState.selectedCell?.r === r && gameState.selectedCell?.c === c;
                                  const playerColor = cell > 0 ? gameState.players[cell-1].color : null;
                                  let isValidMove = false;
                                  if (gameState.selectedCell && cell === 0) {
                                      const dr = Math.abs(r - gameState.selectedCell.r);
                                      const dc = Math.abs(c - gameState.selectedCell.c);
                                      if (Math.max(dr, dc) <= 2) isValidMove = true;
                                  }

                                  return (
                                      <div key={`${r}-${c}-${cell}`} onClick={() => handleCellClick(r, c)}
                                          className={`size-10 sm:size-12 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative ${isSelected ? 'ring-2 ring-white z-10 scale-105 shadow-lg bg-slate-700' : 'bg-slate-900/50 shadow-inner'} ${isValidMove ? 'bg-slate-700/50' : ''}`}
                                          style={{ boxShadow: cell === 0 ? 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)' : 'none' }}>
                                          {isValidMove && !cell && <div className="size-3 rounded-full bg-white/20 animate-pulse"></div>}
                                          {cell > 0 && <div className="size-8 sm:size-9 rounded-full shadow-lg transform animate-[bounceIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]" style={{ backgroundColor: playerColor!, boxShadow: `0 4px 6px -1px rgba(0,0,0,0.3), inset 0 2px 4px 0 rgba(255,255,255,0.3)` }}><div className="absolute top-1 right-2 size-2 bg-white/40 rounded-full blur-[1px]"></div></div>}
                                      </div>
                                  );
                              })
                          ))}
                      </div>
                  </div>
                  
                  <div className="flex justify-between w-full mt-8 px-4">
                      {gameState.players.map(p => {
                         const count = gameState.board!.flat().filter(c => c === p.id).length;
                         const isActive = p.id === gameState.activePlayerId;
                         return (
                             <div key={p.id} className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'opacity-100 scale-110 -translate-y-1' : 'opacity-50 grayscale-[0.5]'}`}>
                                 <div className="size-10 rounded-full mb-2 shadow-lg flex items-center justify-center text-white font-bold border-2 border-white/20" style={{ backgroundColor: p.color }}>{count}</div>
                                 {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white mt-1"></div>}
                             </div>
                         )
                      })}
                  </div>
                  <style>{`@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }`}</style>
              </div>
          ) : gameState.gameId === GameId.TIC_TAC_TOE && gameState.phase === GamePhase.PLAYING ? (
            /* --- TIC TAC TOE GRID --- */
            <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up">
                {/* Turn Indicator */}
                <div className="flex w-full justify-between items-center bg-black/40 rounded-xl p-2 mb-6 border border-white/10 backdrop-blur-sm">
                    <div className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${gameState.tttTurn === 'X' ? 'bg-[#00FFFF]/20 shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'opacity-50'}`}>
                        <span className="text-[#00FFFF] font-bold">PLAYER X</span>
                        <div className="flex gap-1 mt-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (gameState.xMoves?.length || 0) ? 'bg-[#00FFFF]' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="mx-2 text-white/20 text-xl font-bold">VS</div>
                    <div className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${gameState.tttTurn === 'O' ? 'bg-[#FF00FF]/20 shadow-[0_0_15px_rgba(255,0,255,0.3)]' : 'opacity-50'}`}>
                        <span className="text-[#FF00FF] font-bold">PLAYER O</span>
                        <div className="flex gap-1 mt-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (gameState.oMoves?.length || 0) ? 'bg-[#FF00FF]' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Game Board */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-black/30 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                    {[...Array(9)].map((_, i) => {
                        const isX = gameState.xMoves?.includes(i);
                        const isO = gameState.oMoves?.includes(i);
                        const xIdx = gameState.xMoves?.indexOf(i);
                        const oIdx = gameState.oMoves?.indexOf(i);
                        
                        const age = isX ? xIdx : oIdx;
                        const total = isX ? gameState.xMoves!.length : (isO ? gameState.oMoves!.length : 0);
                        const isOldest = total === 3 && age === 0;
                        const isNewest = age === total - 1;
                        
                        const isWinningCell = gameState.tttWinningLine?.includes(i);

                        return (
                            <div 
                                key={i}
                                onClick={() => handleTicTacToeCellClick(i)}
                                className={`
                                    size-24 sm:size-28 rounded-xl flex items-center justify-center relative
                                    bg-gradient-to-br from-white/5 to-white/0 border border-white/5
                                    transition-all duration-300
                                    ${!isX && !isO && !gameState.tttWinner ? 'cursor-pointer hover:bg-white/10' : ''}
                                    ${isWinningCell ? (isX ? 'bg-[#00FFFF]/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.5)]' : 'bg-[#FF00FF]/20 shadow-[inset_0_0_20px_rgba(255,0,255,0.5)]') : ''}
                                `}
                            >
                                {(isX || isO) && (
                                    <div className={`transform transition-all duration-500 ${isOldest && !gameState.tttWinner ? 'opacity-50 scale-90 blur-[1px]' : 'scale-100'}`}>
                                        <span className={`text-6xl font-black ${isX ? 'text-[#00FFFF] drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]' : 'text-[#FF00FF] drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]'}`}>
                                            {isX ? 'X' : 'O'}
                                        </span>
                                        {isOldest && !gameState.tttWinner && (
                                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-bounce border border-white/20">!</div>
                                        )}
                                        {isNewest && !gameState.tttWinner && (
                                            <div className={`absolute inset-0 border-2 rounded-xl animate-pulse ${isX ? 'border-[#00FFFF]/30' : 'border-[#FF00FF]/30'}`}></div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
                
                <div className="mt-4 text-white/50 text-sm font-medium animate-pulse">
                    {gameState.tttTurn === 'X' 
                        ? (gameState.xMoves?.length === 3 ? "Next X move removes oldest X!" : "X to move") 
                        : (gameState.oMoves?.length === 3 ? "Next O move removes oldest O!" : "O to move")
                    }
                </div>
            </div>
          ) : gameState.gameId === GameId.SLIDING_PUZZLE && gameState.phase === GamePhase.PLAYING ? (
            /* --- SLIDING PUZZLE GRID --- */
            <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up font-inter">
                {/* Stats Header */}
                <div className="flex w-full gap-4 mb-6">
                    <div className="flex-1 flex flex-col items-center bg-dark-blue-900/50 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                        <span className="text-luminous-accent/70 text-xs font-bold uppercase tracking-wider">Moves</span>
                        <span className="text-white font-digital text-3xl font-bold">{gameState.puzzleMoves}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center bg-dark-blue-900/50 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                        <span className="text-luminous-accent/70 text-xs font-bold uppercase tracking-wider">Time</span>
                        <span className="text-white font-digital text-3xl font-bold">
                            {Math.floor((gameState.puzzleTime || 0) / 60).toString().padStart(2, '0')}:
                            {((gameState.puzzleTime || 0) % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Puzzle Board */}
                <div className="p-3 bg-black/30 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl shadow-luminous-blue/10">
                    <div 
                        className={`grid gap-2.5 transition-all duration-300`} 
                        style={{ 
                            gridTemplateColumns: `repeat(${gameState.puzzleSize}, minmax(0, 1fr))`,
                            width: 'min(80vw, 320px)',
                            height: 'min(80vw, 320px)'
                        }}
                    >
                        {gameState.puzzleGrid?.map((num, i) => {
                            const isEmpty = num === 0;
                            const emptyIdx = gameState.puzzleGrid!.indexOf(0);
                            const size = gameState.puzzleSize || 4;
                            const row = Math.floor(i / size);
                            const col = i % size;
                            const emptyRow = Math.floor(emptyIdx / size);
                            const emptyCol = emptyIdx % size;
                            const isMovable = !isEmpty && (Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1);

                            return (
                                <div 
                                    key={`${i}-${num}`}
                                    onClick={() => handleTileClick(i)}
                                    className={`
                                        rounded-lg flex items-center justify-center text-3xl font-bold font-display select-none
                                        transition-all duration-200
                                        ${isEmpty ? 'bg-luminous-blue/5 shadow-[inset_0_0_10px_rgba(48,205,255,0.1)]' : 'bg-gradient-to-br from-white/10 to-white/5 border-t border-l border-white/10 shadow-[4px_4px_10px_rgba(0,0,0,0.3)]'}
                                        ${!isEmpty ? 'text-slate-200' : ''}
                                        ${isMovable ? 'cursor-pointer hover:bg-white/15 hover:scale-[1.02] hover:shadow-glow-sm hover:text-white hover:border-luminous-accent/30' : ''}
                                        ${gameState.puzzleStatus === 'won' && !isEmpty ? 'bg-luminous-blue text-white shadow-glow-md' : ''}
                                    `}
                                >
                                    {!isEmpty && num}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-4 mt-8 w-full max-w-xs">
                    <button 
                        onClick={() => resetPuzzle(gameState.puzzleSize || 4)} 
                        className="flex-1 py-3 px-4 rounded-xl bg-dark-blue-800/80 text-luminous-accent font-bold border border-white/10 hover:bg-dark-blue-800 hover:text-white hover:border-luminous-accent/50 transition-all active:scale-95"
                    >
                        Shuffle
                    </button>
                    <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/5">
                        {[3, 4, 5].map(size => (
                            <button
                                key={size}
                                onClick={() => resetPuzzle(size)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${gameState.puzzleSize === size ? 'bg-luminous-blue/20 text-luminous-accent shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {size}x{size}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          ) : (
          /* --- STANDARD CARD GAME SCREEN --- */
          <div id="gameScreen" className="grid grid-cols-2 gap-6 w-full max-w-sm aspect-square relative z-0 perspective-1000">
            <style>{`
              .perspective-1000 { perspective: 1000px; }
              .transform-style-3d { transform-style: preserve-3d; }
              .backface-hidden { backface-visibility: hidden; }
              .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
            {gameState.players.map((player, index) => {
              const style = getCardStyle(player, index);
              const isSelectionPhase = gameState.gameId === GameId.THIEF_POLICE && gameState.phase === GamePhase.POLICE_SELECTION;
              const isClickable = isSelectionPhase && index !== gameState.policePlayerIndex && player.currentRole !== 'Owner';
              const isFaded = isSelectionPhase && !isClickable;

              return (
                <div 
                  key={player.id}
                  id={`paper${player.id}`}
                  onClick={() => isClickable && handlePoliceSelection(index)}
                  className={`
                    relative flex items-center justify-center rounded-xl p-0
                    transition-all duration-300 ease-in-out
                    ${ROTATIONS[index]}
                    ${isClickable ? 'cursor-pointer hover:scale-105 hover:z-10' : ''}
                    ${isFaded ? 'opacity-50 grayscale cursor-not-allowed' : 'opacity-100'}
                    w-full h-full
                  `}
                >
                    {/* Card Flipper Container */}
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${style.showRole ? 'rotate-y-180' : ''}`}>
                        
                        {/* FRONT FACE (Name Only) */}
                        <div className={`absolute inset-0 bg-paper rounded-xl shadow-lg flex flex-col items-center justify-center backface-hidden p-4 border-2 border-transparent`}>
                            <div className="flex items-center gap-1">
                                {player.isAi && <span className="material-symbols-outlined text-sm opacity-50">smart_toy</span>}
                                <p className="text-paper-text text-lg font-bold paper-name">Player {player.id}</p>
                            </div>
                            <p className="text-paper-text text-base font-medium opacity-90 truncate max-w-full">{player.name}</p>
                            <div className="mt-2 text-paper-text/40"><span className="material-symbols-outlined text-3xl">help</span></div>
                            <div className="absolute -top-2 -right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full paper-total">{player.totalScore} pts</div>
                        </div>

                        {/* BACK FACE (Role Revealed) */}
                        <div className={`absolute inset-0 ${style.bgClass} rounded-xl shadow-lg flex flex-col items-center justify-center backface-hidden rotate-y-180 p-4 border-2 border-white/20`}>
                            <div className="flex items-center gap-1">
                                {player.isAi && <span className="material-symbols-outlined text-sm opacity-50">smart_toy</span>}
                                <p className={`${style.textClass} text-lg font-bold paper-name`}>Player {player.id}</p>
                            </div>
                            <p className={`${style.textClass} text-base font-medium opacity-90 truncate max-w-full`}>{player.name}</p>
                            <div className="text-center mt-2 animate-pop-in">
                              <p className={`${style.textClass} text-xl font-extrabold uppercase paper-role`}>{player.currentRole}</p>
                            </div>
                            <div className="absolute -top-2 -right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full paper-total">{player.totalScore} pts</div>
                        </div>
                    </div>
                </div>
              );
            })}
          </div>
          )}
        </main>

        {/* POLICE TASK POPUP */}
        {gameState.phase === GamePhase.POLICE_TASK && policePlayer && !policePlayer.isAi && gameState.gameId === GameId.THIEF_POLICE && (
          <div id="policePopup" className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 p-6 animate-fade-in-up">
            <div className="bg-paper rounded-xl w-full max-w-sm p-6 text-center shadow-2xl flex flex-col items-center gap-4">
               <div className="bg-role-police text-white p-3 rounded-full mb-2"><span className="material-symbols-outlined text-4xl">local_police</span></div>
               <div>
                  <p className="text-xs font-bold text-role-police uppercase tracking-wider mb-1">Pass Device To</p>
                  <h3 className="text-paper-text text-2xl font-bold">{policePlayer.name}</h3>
               </div>
               {!isTaskRevealed ? (
                 <div className="w-full mt-4">
                   <p className="text-paper-text/80 text-sm mb-4">Pass the device to {policePlayer.name} then tap reveal.</p>
                   <button onClick={() => setIsTaskRevealed(true)} className="bg-zinc-800 text-white font-bold py-3 px-6 rounded-lg w-full flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">visibility</span>Reveal My Task
                   </button>
                 </div>
               ) : (
                 <div className="w-full mt-2 animate-fade-in-up">
                    <div className="bg-black/5 p-4 rounded-lg w-full mb-4 border border-black/10">
                      <p className="text-paper-text/80 text-lg mb-1">Find the:</p>
                      <p id="policeTask" className="text-3xl font-extrabold text-alert-red uppercase tracking-widest">{gameState.policeTask}</p>
                    </div>
                    <button id="policeSelectBtn" onClick={() => setGameState(prev => ({ ...prev, phase: GamePhase.POLICE_SELECTION }))} className="bg-role-police hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors">Start Investigation</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* ROUND RESULTS OVERLAY */}
        {gameState.phase === GamePhase.ROUND_RESULTS && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md z-40 p-4 animate-fade-in-up">
              <div className="bg-white/10 border border-white/20 rounded-xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center gap-6">
                 <h3 className="text-white text-3xl font-bold">Round Over</h3>
                 <div className="w-full space-y-3">
                    {gameState.players.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/10 border-l-4 border-white/50">
                         <div>
                            <div className="flex items-center gap-2"><p className="text-white font-bold">{p.name}</p>{p.isAi && <span className="material-symbols-outlined text-sm text-white/50">smart_toy</span>}</div>
                            <p className="text-white/70 text-sm uppercase">{p.currentRole}</p>
                         </div>
                         <div className="text-right"><p className={`text-lg font-bold ${p.roundPoints > 0 ? 'text-green-400' : 'text-gray-400'}`}>+{p.roundPoints}</p></div>
                      </div>
                    ))}
                 </div>
              </div>
              <button id="nextRoundBtn" onClick={handleNextPhase} className="mt-8 bg-cta-green hover:bg-green-500 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg w-full max-w-md transition-transform active:scale-95">{gameState.currentRound >= MAX_ROUNDS ? "View Leaderboard" : "Next Round"}</button>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-display select-none">
      {/* Background Image Layer - Fixed behind everything */}
      <div className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}>
          {/* Subtle Dark Overlay for contrast */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
      </div>

      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {renderContent()}
      </div>
      {showTutorial && <TutorialOverlay gameId={gameState.gameId} onDismiss={() => setShowTutorial(false)} />}
    </div>
  );
};

// --- Sub-Components ---
const HomeScreen: React.FC<{ onSelectGame: (id: GameId) => void }> = ({ onSelectGame }) => {
  return (
    <div className="relative flex flex-1 flex-col bg-transparent font-display pb-20">
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10">
        <div className="flex size-12 shrink-0 items-center justify-start text-zinc-900 dark:text-white"><span className="material-symbols-outlined text-3xl">stadia_controller</span></div>
        <h1 className="text-zinc-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1">Game Lobby</h1>
      </div>
      <main className="flex-1 px-4">
        <div className="w-full pb-6">
          <div onClick={() => onSelectGame(GameId.THIEF_POLICE)} className="bg-cover bg-center flex flex-col items-stretch justify-end rounded-xl pt-[132px] overflow-hidden shadow-lg cursor-pointer transform transition-transform hover:scale-[1.02]" style={{ backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%), url("${GAMES[GameId.THIEF_POLICE].backgroundImage}")` }}>
            <div className="flex w-full items-end justify-between gap-4 p-4">
              <div className="flex flex-1 flex-col gap-1"><p className="text-white text-2xl font-bold leading-tight drop-shadow-md">{GAMES[GameId.THIEF_POLICE].title}</p><p className="text-white text-base font-medium drop-shadow-md">{GAMES[GameId.THIEF_POLICE].description}</p></div>
              <button className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-lg">Play</button>
            </div>
          </div>
        </div>
        <h2 className="text-zinc-900 dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em] pb-3">More Games</h2>
        <div className="grid grid-cols-2 gap-3">
           <GameCard id={GameId.COLOR_WAR} onSelect={onSelectGame} />
           <GameCard id={GameId.TIC_TAC_TOE} onSelect={onSelectGame} />
           <GameCard id={GameId.SLIDING_PUZZLE} onSelect={onSelectGame} />
           <GameCard id={GameId.SPACE_RACE} onSelect={onSelectGame} />
           <GameCard id={GameId.CASTLE_SIEGE} onSelect={onSelectGame} />
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-white/10 bg-black/40 backdrop-blur-lg px-4 pb-3 pt-2 z-50">
        <NavItem icon="home" text="Home" active />
        <NavItem icon="group" text="Friends" />
        <NavItem icon="person" text="Profile" />
        <NavItem icon="settings" text="Settings" />
      </nav>
    </div>
  );
};

const GameCard: React.FC<{ id: GameId; onSelect: (id: GameId) => void }> = ({ id, onSelect }) => {
  const game = GAMES[id];
  return (
    <div 
      onClick={() => !game.isComingSoon && onSelect(id)} 
      className={`
        flex flex-col gap-3 cursor-pointer group bg-black/20 p-2 rounded-xl backdrop-blur-sm border border-white/5 transition-all
        ${game.isComingSoon ? 'cursor-not-allowed opacity-80' : 'hover:bg-black/30 hover:scale-[1.02]'}
      `}
    >
      <div className="relative w-full aspect-square rounded-lg shadow-sm overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 bg-center bg-no-repeat bg-cover" style={{ backgroundImage: `url("${game.backgroundImage}")` }}></div>
          
          {/* Blue Overlay for Coming Soon */}
          {game.isComingSoon && (
              <div className="absolute inset-0 bg-blue-900/70 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                  <span className="material-symbols-outlined text-4xl mb-1">lock</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Coming Soon</span>
              </div>
          )}
      </div>
      <div>
          <p className="text-white text-base font-medium leading-normal group-hover:text-primary transition-colors">{game.title}</p>
          <p className="text-zinc-400 text-sm font-normal leading-normal">{game.playerCount === 1 ? 'Solo' : `${game.playerCount} Players`}</p>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; text: string; active?: boolean }> = ({ icon, text, active }) => (
  <a className={`flex flex-1 flex-col items-center justify-end gap-1 ${active ? 'text-primary' : 'text-zinc-400'}`} href="#">
    <div className="flex h-8 items-center justify-center"><span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span></div>
    <p className="text-xs font-medium leading-normal tracking-[0.015em]">{text}</p>
  </a>
);

const SetupScreen: React.FC<{ gameName: string; onStart: (names: string[], aiConfig: {enabled: boolean, count: number}) => void; onBack: () => void }> = ({ gameName, onStart, onBack }) => {
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiCount, setAiCount] = useState(1);
  const handleChange = (index: number, val: string) => { const newNames = [...names]; newNames[index] = val; setNames(newNames); };
  
  // Find current game config to determine player count
  const gameKey = Object.keys(GAMES).find(key => GAMES[key as GameId].title === gameName) as GameId;
  const playerCount = GAMES[gameKey]?.playerCount || 4;

  const isPlayerAi = (index: number) => !isAiMode ? false : (playerCount === 2 ? index === 1 : index >= (4 - aiCount));
  
  // Ready check: All non-AI slots must be filled up to playerCount
  const isReady = names.slice(0, playerCount).every((n, i) => isPlayerAi(i) || n.trim().length > 0);

  return (
    <div className="flex-1 min-h-screen bg-transparent p-6 flex flex-col">
       <div className="flex items-center mb-4"><button onClick={onBack} className="text-white mr-4 hover:text-primary transition-colors"><span className="material-symbols-outlined">arrow_back_ios_new</span></button><h1 className="text-white text-lg font-bold">Setup</h1></div>
       <div className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center">
          <p className="text-primary font-bold uppercase tracking-widest text-sm mb-1">{gameName}</p>
          <h1 className="text-white text-4xl font-bold mb-2">Enter Names</h1>
          <p className="text-zinc-400 mb-6">Enter player names to begin.</p>
          <div className="space-y-4 mb-8">
             {INITIAL_PLAYERS.slice(0, playerCount).map((p, idx) => {
                const isAi = isPlayerAi(idx);
                return (
                    <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors backdrop-blur-sm ${isAi ? 'bg-black/40 border-transparent' : 'bg-black/20 border-white/10 focus-within:border-primary'}`}>
                    <div className="size-8 rounded-full shrink-0 flex items-center justify-center shadow-lg" style={{ backgroundColor: p.color }}>{isAi && <span className="material-symbols-outlined text-white text-sm">smart_toy</span>}</div>
                    <span className="text-zinc-400 font-bold w-16 text-sm">PLAYER {p.id}</span>
                    <input id={`player${p.id}Name`} type="text" className={`flex-1 bg-transparent text-right text-white font-medium focus:outline-none placeholder:text-zinc-600 ${isAi ? 'italic text-zinc-500' : ''}`} placeholder={isAi ? `Bot ${p.id}` : `Name`} value={isAi ? '' : names[idx]} onChange={(e) => handleChange(idx, e.target.value)} autoComplete="off" disabled={isAi} />
                    </div>
                );
             })}
          </div>
          
          {playerCount > 1 && (
            <div className="bg-black/30 backdrop-blur-sm border border-white/5 p-4 rounded-xl mb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">smart_toy</span><span className="text-white font-bold">AI Mode</span></div>
                    <button onClick={() => setIsAiMode(!isAiMode)} className={`w-12 h-7 rounded-full transition-colors relative ${isAiMode ? 'bg-primary' : 'bg-zinc-600'}`}><div className={`absolute top-1 size-5 bg-white rounded-full transition-transform ${isAiMode ? 'left-6' : 'left-1'}`}></div></button>
                </div>
                {isAiMode && playerCount > 2 && (
                    <div className="animate-fade-in-up">
                        <p className="text-sm text-zinc-400 mb-2">Number of AI Players:</p>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(num => (
                                <button key={num} onClick={() => setAiCount(num)} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${aiCount === num ? 'bg-white text-primary shadow-sm' : 'bg-black/40 text-zinc-400 hover:bg-black/60'}`}>{num} Bot{num > 1 ? 's' : ''}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}
       </div>
       <div className="max-w-md mx-auto w-full pb-8">
          <button id="startGameBtn" onClick={() => isReady && onStart(names, { enabled: isAiMode, count: aiCount })} disabled={!isReady} className={`w-full h-14 rounded-xl font-bold text-lg transition-all ${isReady ? 'bg-primary text-white shadow-lg hover:bg-blue-600 active:scale-95' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>Start {gameName}</button>
       </div>
    </div>
  );
};

const Leaderboard: React.FC<{ players: Player[], onPlayAgain: () => void, onHome: () => void }> = ({ players, onPlayAgain, onHome }) => {
  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
  return (
    <div id="leaderboardScreen" className="flex-1 min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative overflow-hidden">
       <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20"><div className="absolute top-0 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-bounce delay-75"></div><div className="absolute top-10 left-1/2 w-3 h-3 bg-blue-500 rotate-45 animate-ping"></div><div className="absolute top-20 left-3/4 w-2 h-4 bg-yellow-500 animate-pulse"></div></div>
       <div className="w-full max-w-md z-10">
          <div className="text-center mb-10"><h1 className="text-4xl font-bold text-white mb-2">Final Results</h1><p className="text-zinc-400">{players[0].currentRole === 'Commander' ? 'Game Over' : '16 Rounds Complete'}</p></div>
          <div id="leaderboardList" className="space-y-4">
             {sortedPlayers.map((p, idx) => (
                <div key={p.id} className={`flex items-center p-4 rounded-xl backdrop-blur-sm border ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-lg scale-105' : 'bg-black/40 border-white/10 shadow-sm'}`}>
                   <div className="flex-none w-10 text-2xl font-bold text-center">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '4'}</div>
                   <div className="flex-1 px-4"><div className="flex items-center gap-2"><p className="font-bold text-lg text-white">{p.name}</p>{p.isAi && <span className="material-symbols-outlined text-xs text-zinc-400">smart_toy</span>}</div><p className="text-sm text-zinc-400">Player {p.id}</p></div>
                   <div className="flex-none font-mono font-bold text-xl text-primary">{p.totalScore}</div>
                </div>
             ))}
          </div>
          <div className="flex flex-col gap-3 mt-12 w-full">
            <button id="playAgainBtn" onClick={onPlayAgain} className="h-14 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-transform active:scale-95 flex items-center justify-center gap-2"><span className="material-symbols-outlined">replay</span>Play Again</button>
            <button onClick={onHome} className="h-14 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-transform active:scale-95 flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10"><span className="material-symbols-outlined">home</span>Back to Home</button>
          </div>
       </div>
    </div>
  );
};

export default App;