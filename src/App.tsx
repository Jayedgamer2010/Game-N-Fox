import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, Player, GameState, GameId } from './types';
import { INITIAL_PLAYERS, MAX_ROUNDS, GAMES, ROTATIONS, PLAYER_DIRECTIONS, CONFETTI_COLORS, CONFETTI_SHAPES } from './constants';
import redSuitBackground from '@assets/generated_images/red_suited_guard_figure.png';
import QuadMatchRoyale from './QuadMatchRoyale';
import {
  ModeSelectionScreen,
  MultiplayerOptionsScreen,
  HostGameScreen,
  JoinGameScreen,
  BrowseGamesScreen,
  GameLobbyScreen,
  useWebSocket,
} from './multiplayer';

const BGM_URL = "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=fun-life-112188.mp3";
const START_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3";
const ROLE_REVEAL_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-card-flip-2767.mp3";
const SELECT_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3";
const ROUND_END_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-game-level-completed-2059.mp3";
const VERDICT_REVEAL_SFX_URL = "https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3";

const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=2069&auto=format&fit=crop";

const QuitButton: React.FC<{ onQuit: () => void }> = ({ onQuit }) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const DURATION = 3000;

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

const HomeScreen: React.FC<{ onSelectGame: (id: GameId) => void }> = ({ onSelectGame }) => {
  const allGames = Object.values(GAMES);
  const featuredGame = allGames.find(g => g.id === GameId.THIEF_POLICE) || allGames[0];
  const otherGames = allGames.filter(g => g.id !== featuredGame.id);

  const getGameIcon = (gameId: GameId) => {
    switch(gameId) {
      case GameId.THIEF_POLICE: return 'local_police';
      case GameId.COLOR_WAR: return 'palette';
      case GameId.TIC_TAC_TOE: return 'grid_3x3';
      case GameId.SLIDING_PUZZLE: return 'apps';
      case GameId.SPACE_RACE: return 'rocket_launch';
      case GameId.CASTLE_SIEGE: return 'castle';
      case GameId.QUAD_MATCH: return 'style';
      default: return 'sports_esports';
    }
  };

  return (
    <div 
      className="relative flex min-h-screen w-full flex-col bg-background-dark bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%), url(${redSuitBackground})` }}
    >
      <main className="flex-1 pb-24">
        <div className="flex items-center bg-transparent p-4 pb-2 justify-between sticky top-0 z-10 animate-fade-in-up backdrop-blur-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-start text-white">
            <span className="material-symbols-outlined !text-3xl">stadia_controller</span>
          </div>
          <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1">Game Lobby</h1>
        </div>

        <div className="p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <button
            onClick={() => !featuredGame.isComingSoon && onSelectGame(featuredGame.id)}
            disabled={featuredGame.isComingSoon}
            className="w-full bg-cover bg-center flex flex-col items-stretch justify-end rounded-xl pt-[132px] relative overflow-hidden group transition-transform active:scale-[0.98]"
            style={{ 
              backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%), url("${featuredGame.cardImage || featuredGame.backgroundImage}")` 
            }}
          >
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex w-full items-end justify-between gap-4 p-4 relative z-10">
              <div className="flex max-w-[440px] flex-1 flex-col gap-1">
                <p className="text-white tracking-tight text-2xl font-bold leading-tight max-w-[440px] text-left">{featuredGame.title}</p>
                <p className="text-white/90 text-base font-medium leading-normal text-left">{featuredGame.description}</p>
              </div>
              <div className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/40 transition-all">
                <span className="truncate">Play Now</span>
              </div>
            </div>
          </button>
        </div>

        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>More Games</h2>

        <div className="grid grid-cols-2 gap-3 px-4">
          {otherGames.map((game, index) => (
            <button
              key={game.id}
              onClick={() => !game.isComingSoon && onSelectGame(game.id)}
              disabled={game.isComingSoon}
              className={`flex flex-col gap-3 pb-3 text-left animate-fade-in-up group transition-all ${
                game.isComingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{ animationDelay: `${0.25 + index * 0.08}s`, opacity: 0 }}
            >
              <div 
                className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-lg relative overflow-hidden shadow-lg"
                style={{ backgroundImage: `url("${game.cardImage || game.backgroundImage}")` }}
              >
                {game.isComingSoon && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-white text-sm">lock</span>
                    <span className="text-xs text-white font-medium uppercase tracking-wide">Coming Soon</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div>
                <p className="text-white text-base font-medium leading-normal">{game.title}</p>
                <p className="text-zinc-400 text-sm font-normal leading-normal">
                  {game.playerCount} Player{game.playerCount > 1 ? 's' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-zinc-800 bg-background-dark/80 backdrop-blur-lg px-4 pb-3 pt-2 z-20">
        <div className="flex flex-1 flex-col items-center justify-end gap-1 text-primary">
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          </div>
          <p className="text-xs font-medium leading-normal tracking-[0.015em]">Home</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-end gap-1 text-zinc-500">
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">group</span>
          </div>
          <p className="text-xs font-medium leading-normal tracking-[0.015em]">Friends</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-end gap-1 text-zinc-500">
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">person</span>
          </div>
          <p className="text-xs font-medium leading-normal tracking-[0.015em]">Profile</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-end gap-1 text-zinc-500">
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">settings</span>
          </div>
          <p className="text-xs font-medium leading-normal tracking-[0.015em]">Settings</p>
        </div>
      </nav>
    </div>
  );
};

const SetupScreen: React.FC<{ gameName: string; gameId: GameId; onStart: (names: string[], aiConfig: { enabled: boolean; count: number }) => void; onBack: () => void; backgroundImage?: string }> = ({ gameName, gameId, onStart, onBack, backgroundImage }) => {
  const game = GAMES[gameId];
  const playerCount = game.playerCount;
  const isSolo = playerCount === 1;
  const isTwoPlayer = playerCount === 2;
  
  const [names, setNames] = useState(['', '', '', '']);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiCount, setAiCount] = useState(1);

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const canStart = names.slice(0, playerCount).filter(n => n.trim()).length >= 1;
  
  const playerLabels = isSolo 
    ? ['PLAYER'] 
    : isTwoPlayer 
      ? ['PLAYER X', 'PLAYER O']
      : PLAYER_DIRECTIONS;

  return (
    <div 
      className="flex flex-col min-h-screen bg-background-dark bg-cover bg-center bg-fixed"
      style={backgroundImage ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%), url(${backgroundImage})` } : undefined}
    >
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-transparent backdrop-blur-sm">
        <button onClick={onBack} className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Game Setup</h2>
      </div>
      <main className="flex-grow px-4">
        <div className="animate-fade-in-up">
          <h1 className="text-white text-[32px] font-bold leading-tight tracking-tight pt-6 pb-2">Enter Player Names</h1>
          <p className="text-zinc-400 text-base pb-6">
            {isSolo 
              ? 'Enter your name to begin.' 
              : `Enter player names to begin.`}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {INITIAL_PLAYERS.slice(0, playerCount).map((player, index) => {
            const isAiPlayer = aiEnabled && index >= playerCount - (isTwoPlayer ? 1 : aiCount);
            return (
              <div 
                key={player.id} 
                className={`flex items-center gap-4 bg-zinc-800/50 p-4 rounded-xl animate-fade-in-up transition-all duration-300 hover:bg-zinc-800/70 ${isAiPlayer ? 'ring-1 ring-primary/30' : ''}`}
                style={{ animationDelay: `${0.1 + index * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div 
                    className="flex items-center justify-center rounded-full shrink-0 size-10 shadow-lg transition-transform hover:scale-110"
                    style={{ backgroundColor: player.color }}
                  >
                    {isAiPlayer && <span className="material-symbols-outlined text-white text-sm">smart_toy</span>}
                  </div>
                  <p className="text-white text-base font-bold leading-normal w-20 uppercase tracking-wide">
                    {playerLabels[index]}
                  </p>
                  <input
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-500 border-0 p-0 focus:ring-0 text-right outline-none text-base"
                    placeholder={isSolo ? 'Your Name' : (isAiPlayer ? `Bot ${index + 1}` : `Player ${index + 1} Name`)}
                    value={names[index]}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    type="text"
                    disabled={isAiPlayer}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {!isSolo && (
          <div className="mt-6 p-4 bg-zinc-800/50 rounded-xl animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-primary">smart_toy</span>
                  AI Mode
                </p>
                <p className="text-zinc-400 text-sm mt-1">
                  {isTwoPlayer ? 'Play against computer' : 'Add AI opponents'}
                </p>
              </div>
              <button 
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-14 h-7 rounded-full transition-all duration-300 ${aiEnabled ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-zinc-600'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${aiEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            {aiEnabled && !isTwoPlayer && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-zinc-400 text-sm mb-3">Number of AI Players:</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      onClick={() => setAiCount(num)}
                      className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${aiCount === num ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                    >
                      {num} Bot{num > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <div className="p-4 pt-8 sticky bottom-0 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
        <button
          onClick={() => onStart(names, { enabled: aiEnabled, count: isTwoPlayer ? 1 : aiCount })}
          disabled={!canStart}
          className={`w-full h-14 rounded-xl font-bold text-base transition-all duration-300 ${
            canStart 
              ? 'bg-primary text-white active:scale-[0.98] shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40' 
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">play_arrow</span>
            Start Game
          </span>
        </button>
      </div>
    </div>
  );
};

const ConfettiPiece: React.FC<{ index: number }> = ({ index }) => {
  const shape = CONFETTI_SHAPES[index % CONFETTI_SHAPES.length];
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 5 + (index * 10) % 90;
  const duration = 4 + Math.random() * 4;
  const delay = Math.random() * 3;
  
  const shapeClass = shape === 'circle' ? 'confetti-circle' : shape === 'triangle' ? 'confetti-triangle' : 'confetti-rectangle';
  
  return (
    <div 
      className={`confetti ${shapeClass}`}
      style={{ 
        left: `${left}%`,
        backgroundColor: shape !== 'triangle' ? color : 'transparent',
        borderBottomColor: shape === 'triangle' ? color : undefined,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`
      }}
    />
  );
};

const FloatingScoreHeader: React.FC<{ 
  players: Player[]; 
  currentRound: number; 
  maxRounds: number; 
  activePlayerId?: number;
  gameTitle: string;
}> = ({ players, currentRound, maxRounds, activePlayerId, gameTitle }) => {
  return (
    <div className="fixed top-0 left-0 right-0 p-3 pt-4 z-30 pointer-events-none">
      <div className="mx-auto max-w-lg rounded-2xl glass-dark px-4 py-3 shadow-2xl animate-fade-in-up pointer-events-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <h2 className="text-base font-bold text-white">{gameTitle}</h2>
          <span className="text-sm text-zinc-400">Round {currentRound}/{maxRounds}</span>
        </div>
        <div className="flex justify-between items-center gap-1">
          {players.map((player, index) => {
            const isActive = player.id === activePlayerId;
            return (
              <div key={player.id} className={`flex flex-1 flex-col items-center gap-1 text-center transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-70'}`}>
                <div className="relative">
                  <div 
                    className={`aspect-square size-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${isActive ? 'border-primary ring-2 ring-primary/50' : 'border-transparent'}`}
                    style={{ backgroundColor: player.color }}
                  >
                    <span className="material-symbols-outlined text-lg text-white">
                      {player.isAi ? 'smart_toy' : 'person'}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-background-dark">
                      <span className="material-symbols-outlined text-[10px] text-white">star</span>
                    </div>
                  )}
                </div>
                <div className={`text-xs font-medium truncate max-w-[60px] ${isActive ? 'text-primary' : 'text-white/70'}`}>
                  {player.name || `P${index + 1}`}
                </div>
                <div className="text-sm font-bold text-white">{player.totalScore}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Leaderboard: React.FC<{ players: Player[]; onPlayAgain: () => void; onHome: () => void; backgroundImage?: string }> = ({ players, onPlayAgain, onHome, backgroundImage }) => {
  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
  
  return (
    <div 
      className="relative flex h-full min-h-screen w-full flex-col items-center overflow-hidden bg-background-dark bg-cover bg-center bg-fixed"
      style={backgroundImage ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%), url(${backgroundImage})` } : undefined}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(18)].map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>
      <div className="relative z-10 flex w-full max-w-md flex-col px-4 pt-16 pb-8">
        <div className="text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mb-4 shadow-lg animate-float">
            <span className="material-symbols-outlined text-4xl text-white">emoji_events</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Final Results</h1>
          <p className="mt-1 text-base text-zinc-400">{MAX_ROUNDS} Rounds Complete</p>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id}
              className={`flex items-center gap-4 rounded-xl p-4 animate-fade-in-up backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                index === 0 
                  ? 'border-2 border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/20' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              style={{ animationDelay: `${0.1 + index * 0.1}s`, opacity: 0 }}
            >
              <span className={`text-2xl font-bold w-8 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-zinc-300' : index === 2 ? 'text-amber-700' : 'text-zinc-500'}`}>
                {index + 1}
              </span>
              <div className="flex flex-1 items-center gap-4">
                <div className="relative">
                  <div 
                    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg ${index === 0 ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background-dark' : ''}`}
                    style={{ backgroundColor: player.color }}
                  >
                    <span className="material-symbols-outlined text-2xl text-white">
                      {player.isAi ? 'smart_toy' : 'person'}
                    </span>
                  </div>
                  {index === 0 && (
                    <div className="absolute -top-3 -right-2 animate-wiggle">
                      <span className="material-symbols-outlined !text-3xl text-amber-400 drop-shadow-lg">workspace_premium</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-base font-semibold text-white">{player.name || `Player ${player.id}`}</p>
                  {index === 0 && <p className="text-sm font-medium text-amber-400">Winner!</p>}
                  {index === 1 && <p className="text-xs text-zinc-400">Runner Up</p>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-lg font-bold ${index === 0 ? 'text-amber-400' : 'text-white'}`}>{player.totalScore}</p>
                <p className="text-xs text-zinc-500">pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 z-20 mt-auto flex w-full max-w-md flex-col gap-3 bg-gradient-to-t from-background-dark via-background-dark/90 to-transparent px-4 pb-8 pt-8">
        <button 
          onClick={onPlayAgain}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/30 transition-all active:scale-95 hover:bg-primary/90 hover:shadow-xl"
        >
          <span className="material-symbols-outlined">replay</span>
          Play Again
        </button>
        <button 
          onClick={onHome}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-base font-bold text-white transition-all active:scale-95 hover:bg-white/20"
        >
          <span className="material-symbols-outlined">home</span>
          Back to Menu
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
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

  const [isMuted, setIsMuted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [isTaskRevealed, setIsTaskRevealed] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);
  const [isMultiplayerMode, setIsMultiplayerMode] = useState(false);

  const handleGameStateUpdate = useCallback((data: { gameState: any }) => {
    console.log('Received game state update from other player:', data.gameState);
    setGameState(prev => ({
      ...prev,
      ...data.gameState,
    }));
  }, []);

  const handleGameAction = useCallback((data: { playerId: string; action: string; data: any }) => {
    console.log('Received game action from player:', data.playerId, data.action, data.data);
    if (data.action === 'ttt_move') {
      const { xMoves, oMoves, nextTurn, winLine, winner, players, phase } = data.data;
      setGameState(prev => ({
        ...prev,
        xMoves: xMoves ?? prev.xMoves,
        oMoves: oMoves ?? prev.oMoves,
        tttTurn: nextTurn,
        tttWinningLine: winLine || null,
        tttWinner: winner || null,
        players: players || prev.players,
        phase: phase || prev.phase,
      }));
    } else if (data.action === 'color_war_move') {
      const { board, activePlayerId, turnCount, phase, players } = data.data;
      setGameState(prev => ({
        ...prev,
        board,
        activePlayerId,
        turnCount,
        selectedCell: null,
        phase: phase || prev.phase,
        players: players || prev.players,
      }));
    }
  }, []);

  const {
    state: multiplayerState,
    publicRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    getPublicRooms,
    toggleReady,
    startGame: wsStartGame,
    updateSettings,
    setMode: setMultiplayerMode,
    setOption: setMultiplayerOption,
    sendGameAction,
    updateGameState,
  } = useWebSocket({
    onGameStateUpdate: handleGameStateUpdate,
    onGameAction: handleGameAction,
  });

  const currentGame = GAMES[gameState.gameId];

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
      if (bgmRef.current.paused) bgmRef.current.play().catch(() => {});
    } else {
      bgmRef.current.pause();
    }
  }, [gameState.phase, isMuted]);

  const playSfx = useCallback((url: string) => {
    if (isMuted) return;
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, [isMuted]);

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

  const handleSelectGame = (id: GameId) => {
    setGameState(prev => ({ ...prev, gameId: id, phase: GamePhase.MODE_SELECT }));
  };

  const handleSelectOffline = () => {
    setIsMultiplayerMode(false);
    setGameState(prev => ({ ...prev, phase: GamePhase.SETUP }));
  };

  const handleSelectOnline = () => {
    setIsMultiplayerMode(true);
    setMultiplayerMode('online');
    setGameState(prev => ({ ...prev, phase: GamePhase.MULTIPLAYER_OPTIONS }));
  };

  const handleHostGame = () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.HOST_GAME }));
  };

  const handleJoinGame = () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.JOIN_GAME }));
  };

  const handleBrowseGames = () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.BROWSE_GAMES }));
    getPublicRooms();
  };

  const handleCreateGame = (settings: { playerName: string; isPublic: boolean; aiCount: number; gameMode: string; deckTheme: string; maxPlayers: number }) => {
    createRoom(settings.playerName, settings.isPublic, settings.aiCount, settings.gameMode, settings.deckTheme, settings.maxPlayers);
  };

  const handleJoinRoom = (playerName: string, roomCode: string) => {
    joinRoom(playerName, roomCode);
  };

  const handleJoinRoomById = (playerName: string, roomId: string) => {
    joinRoom(playerName, undefined, roomId);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setGameState(prev => ({ ...prev, phase: GamePhase.MULTIPLAYER_OPTIONS }));
  };

  const handleMultiplayerStartGame = () => {
    wsStartGame();
  };

  useEffect(() => {
    if (multiplayerState.room) {
      if (gameState.phase !== GamePhase.GAME_LOBBY && multiplayerState.room.status === 'waiting') {
        setGameState(prev => ({ ...prev, phase: GamePhase.GAME_LOBBY }));
      }
      if (multiplayerState.room.status === 'playing' && gameState.phase === GamePhase.GAME_LOBBY) {
        const roomPlayers = multiplayerState.room.players;
        const maxPlayers = multiplayerState.room.maxPlayers;
        const newPlayers = INITIAL_PLAYERS.slice(0, maxPlayers).map((p, i) => {
          const roomPlayer = roomPlayers[i];
          const isAi = !roomPlayer && i < roomPlayers.length + multiplayerState.room!.aiCount;
          return {
            ...p,
            name: roomPlayer?.name || (isAi ? `Bot ${i + 1}` : `Player ${i + 1}`),
            isAi: isAi,
          };
        });
        setGameState(prev => ({
          ...prev,
          players: newPlayers,
          phase: GamePhase.ASSIGN_ROLES,
          currentRound: 1,
        }));
      }
    }
  }, [multiplayerState.room, gameState.phase]);

  const handleGoHome = () => {
    if (isMultiplayerMode) {
      leaveRoom();
      setIsMultiplayerMode(false);
    }
    setGameState({
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
    setHasSeenTutorial(false);
  };

  const handleReset = () => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => ({ ...p, totalScore: 0, currentRole: null, roundPoints: 0 })),
      currentRound: 1,
      phase: GamePhase.ASSIGN_ROLES,
      policeTask: null,
      policePlayerIndex: -1,
      policeSelection: -1,
      policeGuessWasCorrect: null,
      board: [],
      activePlayerId: 1,
      selectedCell: null,
      xMoves: [],
      oMoves: [],
      tttTurn: 'X',
      tttWinner: null,
      tttWinningLine: null,
      puzzleGrid: [],
      puzzleMoves: 0,
      puzzleTime: 0,
      puzzleStatus: 'playing'
    }));
  };

  const initGame = (names: string[], aiConfig: { enabled: boolean, count: number }) => {
    playSfx(START_SFX_URL);
    
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      setHasSeenTutorial(true);
    }

    setGameState(prev => {
      const gameDef = GAMES[prev.gameId];
      const count = gameDef.playerCount;
      const activeInitialPlayers = INITIAL_PLAYERS.slice(0, count);

      const newPlayers = activeInitialPlayers.map((p, i) => {
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

  const initColorWarBoard = () => {
    const size = 7;
    const board = Array(size).fill(0).map(() => Array(size).fill(0));
    board[0][0] = 1; board[0][size-1] = 2; board[size-1][0] = 3; board[size-1][size-1] = 4;
    return board;
  };

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
        board: initColorWarBoard(),
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
    const roles: string[] = [...gameDef.roles];
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
    if (gameState.tttTurn === 'O' && gameState.players[1]?.isAi) return;

    playSfx(SELECT_SFX_URL);

    const isX = gameState.tttTurn === 'X';
    const currentMoves = isX ? [...(gameState.xMoves || [])] : [...(gameState.oMoves || [])];
    const nextMoves = [...currentMoves, index];
    
    if (nextMoves.length > 3) nextMoves.shift();

    const winLine = checkTicTacToeWin(nextMoves);
    const nextTurn = isX ? 'O' : 'X';
    const nextX = isX ? nextMoves : gameState.xMoves;
    const nextO = isX ? gameState.oMoves : nextMoves;

    let updatedPlayers = gameState.players;
    let newPhase = gameState.phase;

    if (winLine) {
      playSfx(ROUND_END_SFX_URL);
      const points = GAMES[GameId.TIC_TAC_TOE].points;
      updatedPlayers = gameState.players.map((p, i) => {
        let pts = 0;
        if (isX && i === 0) pts = points.WIN;
        if (!isX && i === 1) pts = points.WIN;
        return { ...p, totalScore: p.totalScore + pts, roundPoints: pts };
      });
      newPhase = GamePhase.LEADERBOARD;
    }

    if (isMultiplayerMode && multiplayerState.isConnected) {
      sendGameAction('ttt_move', {
        index,
        isX,
        xMoves: nextX,
        oMoves: nextO,
        nextTurn,
        winLine: winLine || null,
        winner: winLine ? (isX ? 'X' : 'O') : null,
        players: winLine ? updatedPlayers : null,
        phase: winLine ? newPhase : null,
      });
    }

    setGameState(prev => ({
      ...prev,
      xMoves: nextX,
      oMoves: nextO,
      tttTurn: nextTurn,
      tttWinningLine: winLine || null,
      tttWinner: winLine ? (isX ? 'X' : 'O') : null,
      players: updatedPlayers,
      phase: newPhase,
    }));
  };

  useEffect(() => {
    if (gameState.gameId !== GameId.TIC_TAC_TOE) return;
    if (gameState.phase !== GamePhase.PLAYING) return;
    if (gameState.tttWinner) return;
    if (gameState.tttTurn !== 'O') return;
    if (!gameState.players[1]?.isAi) return;

    const timer = setTimeout(() => {
      const xMoves = gameState.xMoves || [];
      const oMoves = gameState.oMoves || [];
      const occupied = [...xMoves, ...oMoves];
      const available = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => !occupied.includes(i));
      
      if (available.length === 0) return;
      
      const randomIndex = available[Math.floor(Math.random() * available.length)];
      handleTicTacToeCellClick(randomIndex);
    }, 800);

    return () => clearTimeout(timer);
  }, [gameState.tttTurn, gameState.phase, gameState.gameId, gameState.tttWinner, gameState.players, gameState.xMoves, gameState.oMoves]);

  const handleCellClick = (r: number, c: number) => {
    if (gameState.phase !== GamePhase.PLAYING || !gameState.board) return;
    const cell = gameState.board[r][c];
    const activeId = gameState.activePlayerId || 1;
    const activePlayer = gameState.players[activeId - 1];
    
    if (activePlayer.isAi) return;

    if (cell === activeId) {
      setGameState(prev => ({
        ...prev,
        selectedCell: prev.selectedCell?.r === r && prev.selectedCell?.c === c ? null : { r, c }
      }));
      playSfx(SELECT_SFX_URL);
      return;
    }

    if (gameState.selectedCell && cell === 0) {
      const dr = Math.abs(r - gameState.selectedCell.r);
      const dc = Math.abs(c - gameState.selectedCell.c);
      if (Math.max(dr, dc) <= 2) {
        executeColorWarMove(gameState.selectedCell.r, gameState.selectedCell.c, r, c);
      }
    }
  };

  const executeColorWarMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    playSfx(SELECT_SFX_URL);
    
    if (!gameState.board) return;
    
    const activeId = gameState.activePlayerId || 1;
    const board = gameState.board.map(row => [...row]);
    const dr = Math.abs(toR - fromR);
    const dc = Math.abs(toC - fromC);
    const isClone = Math.max(dr, dc) === 1;

    if (!isClone) {
      board[fromR][fromC] = 0;
    }
    board[toR][toC] = activeId;

    for (let nr = toR - 1; nr <= toR + 1; nr++) {
      for (let nc = toC - 1; nc <= toC + 1; nc++) {
        if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && board[nr][nc] !== 0 && board[nr][nc] !== activeId) {
          board[nr][nc] = activeId;
        }
      }
    }

    const hasValidMove = (playerId: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (board[r][c] === playerId) {
            for (let tr = 0; tr < 7; tr++) {
              for (let tc = 0; tc < 7; tc++) {
                if (board[tr][tc] === 0 && Math.max(Math.abs(tr - r), Math.abs(tc - c)) <= 2) {
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    };

    let nextId = activeId % 4 + 1;
    let attempts = 0;
    while (!hasValidMove(nextId) && attempts < 4) {
      nextId = nextId % 4 + 1;
      attempts++;
    }

    const newTurnCount = (gameState.turnCount || 0) + 1;
    const gameOver = attempts >= 4 || newTurnCount >= 100;

    let newPhase = gameState.phase;
    let updatedPlayers = gameState.players;

    if (gameOver) {
      const counts = [0, 0, 0, 0];
      board.forEach(row => row.forEach(cell => {
        if (cell > 0) counts[cell - 1]++;
      }));
      const maxCount = Math.max(...counts);
      const winnerId = counts.indexOf(maxCount) + 1;
      
      updatedPlayers = gameState.players.map((p, i) => ({
        ...p,
        totalScore: i === winnerId - 1 ? 1000 : counts[i] * 10
      }));
      newPhase = GamePhase.LEADERBOARD;
    }

    if (isMultiplayerMode && multiplayerState.isConnected) {
      sendGameAction('color_war_move', {
        board,
        activePlayerId: gameOver ? activeId : nextId,
        turnCount: newTurnCount,
        phase: gameOver ? newPhase : null,
        players: gameOver ? updatedPlayers : null,
      });
    }

    setGameState(prev => ({
      ...prev,
      board,
      activePlayerId: gameOver ? activeId : nextId,
      selectedCell: null,
      turnCount: newTurnCount,
      phase: newPhase,
      players: updatedPlayers,
    }));
  };

  useEffect(() => {
    if (gameState.gameId !== GameId.COLOR_WAR) return;
    if (gameState.phase !== GamePhase.PLAYING) return;
    if (!gameState.board) return;

    const activeId = gameState.activePlayerId || 1;
    const activePlayer = gameState.players[activeId - 1];

    if (!activePlayer?.isAi) return;

    const timer = setTimeout(() => {
      const board = gameState.board!;
      const moves: { from: { r: number; c: number }; to: { r: number; c: number } }[] = [];

      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (board[r][c] === activeId) {
            for (let tr = 0; tr < 7; tr++) {
              for (let tc = 0; tc < 7; tc++) {
                if (board[tr][tc] === 0 && Math.max(Math.abs(tr - r), Math.abs(tc - c)) <= 2) {
                  moves.push({ from: { r, c }, to: { r: tr, c: tc } });
                }
              }
            }
          }
        }
      }

      if (moves.length > 0) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        executeColorWarMove(move.from.r, move.from.c, move.to.r, move.to.c);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [gameState.activePlayerId, gameState.phase, gameState.gameId, gameState.board, gameState.players]);

  const handlePoliceTaskConfirm = () => {
    playSfx(SELECT_SFX_URL);
    setIsTaskRevealed(true);
  };

  const handlePoliceTaskDone = () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.POLICE_SELECTION }));
  };

  const handleNextRound = () => {
    setGameState(prev => {
      if (prev.currentRound >= prev.maxRounds) {
        return { ...prev, phase: GamePhase.LEADERBOARD };
      }
      return {
        ...prev,
        currentRound: prev.currentRound + 1,
        phase: GamePhase.ASSIGN_ROLES,
        policeTask: null,
        policePlayerIndex: -1,
        policeSelection: -1,
        policeGuessWasCorrect: null
      };
    });
  };

  const getCardStyle = (player: Player, index: number) => {
    const role = player.currentRole;
    let bgClass = 'bg-paper';
    let textClass = 'text-paper-text';
    let showRole = false;

    const isThiefPolice = gameState.gameId === GameId.THIEF_POLICE;
    const showAllRoles = gameState.phase === GamePhase.ROUND_RESULTS || gameState.phase === GamePhase.VERDICT;
    
    if (isThiefPolice) {
      if (role === 'Owner' || role === 'Police' || showAllRoles) {
        showRole = true;
        if (role === 'Owner') { bgClass = 'bg-role-owner'; textClass = 'text-paper-text'; }
        else if (role === 'Police') { bgClass = 'bg-role-police'; textClass = 'text-white'; }
        else if (role === 'Robber') { bgClass = 'bg-role-robber'; textClass = 'text-white'; }
        else if (role === 'Thief') { bgClass = 'bg-role-thief'; textClass = 'text-white'; }
      }
    }

    return { bgClass, textClass, showRole };
  };

  const renderContent = () => {
    if (gameState.phase === GamePhase.HOME) {
      return <HomeScreen onSelectGame={handleSelectGame} />;
    }

    if (gameState.phase === GamePhase.MODE_SELECT) {
      return (
        <ModeSelectionScreen
          gameName={currentGame.title}
          onSelectOffline={handleSelectOffline}
          onSelectOnline={handleSelectOnline}
          onBack={handleGoHome}
          backgroundImage={redSuitBackground}
        />
      );
    }

    if (gameState.phase === GamePhase.MULTIPLAYER_OPTIONS) {
      return (
        <MultiplayerOptionsScreen
          onSelectHost={handleHostGame}
          onSelectJoin={handleJoinGame}
          onSelectBrowse={handleBrowseGames}
          onBack={() => setGameState(prev => ({ ...prev, phase: GamePhase.MODE_SELECT }))}
          backgroundImage={redSuitBackground}
        />
      );
    }

    if (gameState.phase === GamePhase.HOST_GAME) {
      return (
        <HostGameScreen
          onCreateGame={handleCreateGame}
          onBack={() => setGameState(prev => ({ ...prev, phase: GamePhase.MULTIPLAYER_OPTIONS }))}
          isConnected={multiplayerState.isConnected}
          error={multiplayerState.error}
          maxPlayers={currentGame.playerCount}
          backgroundImage={redSuitBackground}
        />
      );
    }

    if (gameState.phase === GamePhase.JOIN_GAME) {
      return (
        <JoinGameScreen
          onJoinGame={handleJoinRoom}
          onBrowseGames={handleBrowseGames}
          onBack={() => setGameState(prev => ({ ...prev, phase: GamePhase.MULTIPLAYER_OPTIONS }))}
          isConnected={multiplayerState.isConnected}
          error={multiplayerState.error}
          backgroundImage={redSuitBackground}
        />
      );
    }

    if (gameState.phase === GamePhase.BROWSE_GAMES) {
      return (
        <BrowseGamesScreen
          rooms={publicRooms}
          onRefresh={getPublicRooms}
          onJoinRoom={handleJoinRoomById}
          onBack={() => setGameState(prev => ({ ...prev, phase: GamePhase.MULTIPLAYER_OPTIONS }))}
          isConnected={multiplayerState.isConnected}
          error={multiplayerState.error}
          backgroundImage={redSuitBackground}
        />
      );
    }

    if (gameState.phase === GamePhase.GAME_LOBBY && multiplayerState.room) {
      return (
        <GameLobbyScreen
          room={multiplayerState.room}
          playerId={multiplayerState.playerId || ''}
          onToggleReady={toggleReady}
          onStartGame={handleMultiplayerStartGame}
          onLeaveRoom={handleLeaveRoom}
          onUpdateSettings={updateSettings}
          error={multiplayerState.error}
          backgroundImage={redSuitBackground}
        />
      );
    }
    
    if (gameState.phase === GamePhase.SETUP) {
      if (gameState.gameId === GameId.QUAD_MATCH) {
        return <QuadMatchRoyale onExit={handleGoHome} />;
      }
      return <SetupScreen gameName={currentGame.title} gameId={gameState.gameId} onStart={initGame} onBack={handleGoHome} backgroundImage={redSuitBackground} />;
    }
    
    if (gameState.gameId === GameId.QUAD_MATCH && gameState.phase === GamePhase.PLAYING) {
      return <QuadMatchRoyale onExit={handleGoHome} />;
    }
    
    if (gameState.phase === GamePhase.LEADERBOARD) {
      return <Leaderboard players={gameState.players} onPlayAgain={handleReset} onHome={handleGoHome} backgroundImage={redSuitBackground} />;
    }

    const policePlayer = gameState.policePlayerIndex >= 0 ? gameState.players[gameState.policePlayerIndex] : null;

    return (
      <div className="flex-1 flex flex-col w-full h-full">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pb-2 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <QuitButton onQuit={handleGoHome} />
            <MuteButton isMuted={isMuted} onToggle={() => setIsMuted(!isMuted)} />
            <HelpButton onClick={() => setShowTutorial(true)} />
          </div>
          <h2 className="flex-1 text-center text-xl font-bold text-white pr-24 drop-shadow-md">
            {gameState.gameId === GameId.COLOR_WAR ? 'Color War' : gameState.gameId === GameId.TIC_TAC_TOE ? 'Tic-Tac-Toe' : gameState.gameId === GameId.SLIDING_PUZZLE ? 'Sliding Puzzle' : `Round ${gameState.currentRound}`}
          </h2>
        </div>

        <main className="flex-1 flex-grow flex-col items-center justify-center p-4 relative z-10">
          {gameState.phase === GamePhase.ASSIGN_ROLES && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-bg/90 backdrop-blur-sm z-50">
              {gameState.gameId === GameId.THIEF_POLICE ? (
                <>
                  <div className="grid grid-cols-2 gap-6 w-full max-w-sm aspect-square mb-8">
                    {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className="animate-spin-fade flex items-center justify-center rounded-xl bg-paper/50 shadow-xl backdrop-blur-sm border border-white/10"
                        style={{ 
                          animationDelay: `${i * 0.15}s`,
                          height: '100%'
                        }}
                      >
                        <span className="material-symbols-outlined text-4xl text-paper-text/30">help</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 animate-fade-in-up">
                    <span className="material-symbols-outlined text-3xl text-primary animate-bounce">shuffle</span>
                    <p className="text-white text-2xl font-bold animate-pulse">Shuffling Roles...</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative size-24 mb-6">
                    <div className="absolute inset-0 border-4 border-white/20 rounded-xl rotate-0 animate-spin"></div>
                    <div className="absolute inset-0 border-4 border-white/40 rounded-xl rotate-45 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-xl -rotate-12 animate-spin" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-primary">
                        {gameState.gameId === GameId.COLOR_WAR ? 'palette' : 
                         gameState.gameId === GameId.TIC_TAC_TOE ? 'grid_3x3' : 
                         gameState.gameId === GameId.SLIDING_PUZZLE ? 'apps' : 'casino'}
                      </span>
                    </div>
                  </div>
                  <p className="text-white text-2xl font-bold animate-pulse">
                    {gameState.gameId === GameId.COLOR_WAR ? "Preparing Grid..." : 
                     gameState.gameId === GameId.TIC_TAC_TOE ? "Drawing Board..." : 
                     gameState.gameId === GameId.SLIDING_PUZZLE ? "Shuffling Tiles..." : 
                     "Preparing Game..."}
                  </p>
                </>
              )}
            </div>
          )}

          {gameState.phase === GamePhase.REVEALING && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-40 backdrop-blur-sm">
              <div className="bg-white/10 p-6 rounded-2xl flex flex-col items-center border border-white/20 shadow-2xl backdrop-blur-md">
                <span className="material-symbols-outlined text-6xl text-yellow-400 animate-bounce mb-4">search</span>
                <h3 className="text-white text-2xl font-bold">Investigating...</h3>
              </div>
            </div>
          )}

          {gameState.phase === GamePhase.VERDICT && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
              <div 
                className={`p-8 rounded-2xl flex flex-col items-center shadow-2xl border-4 transform scale-110
                  ${gameState.policeGuessWasCorrect ? 'bg-cta-green border-green-300' : 'bg-alert-red border-red-300'}`}
              >
                <span className="material-symbols-outlined text-7xl text-white mb-2">{gameState.policeGuessWasCorrect ? 'check_circle' : 'cancel'}</span>
                <h3 className="text-white text-4xl font-extrabold uppercase tracking-widest">{gameState.policeGuessWasCorrect ? 'CORRECT!' : 'WRONG!'}</h3>
              </div>
            </div>
          )}

          {gameState.gameId === GameId.COLOR_WAR && gameState.phase === GamePhase.PLAYING && gameState.board ? (
            <div className="flex flex-col items-center w-full max-w-md pt-16">
              <div className="mb-6 px-8 py-3 rounded-2xl font-bold text-white shadow-xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-sm" style={{ backgroundColor: gameState.players[gameState.activePlayerId! - 1].color }}>
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
                          className={`size-10 sm:size-12 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative ${isSelected ? 'ring-2 ring-white z-10 scale-105 shadow-lg bg-slate-700' : 'bg-slate-900/50 shadow-inner'} ${isValidMove ? 'bg-slate-700/50' : ''}`}>
                          {isValidMove && !cell && <div className="size-3 rounded-full bg-white/20 animate-pulse"></div>}
                          {cell > 0 && <div className="size-8 sm:size-9 rounded-full shadow-lg" style={{ backgroundColor: playerColor! }}></div>}
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
                    <div key={p.id} className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'opacity-100 scale-110 -translate-y-1' : 'opacity-50'}`}>
                      <div className="size-10 rounded-full mb-2 shadow-lg flex items-center justify-center text-white font-bold border-2 border-white/20" style={{ backgroundColor: p.color }}>{count}</div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white mt-1"></div>}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : gameState.gameId === GameId.TIC_TAC_TOE && gameState.phase === GamePhase.PLAYING ? (
            <div className="flex flex-col items-center w-full max-w-md pt-16">
              <div className="flex w-full justify-between items-center bg-black/40 rounded-xl p-2 mb-6 border border-white/10 backdrop-blur-sm">
                <div className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${gameState.tttTurn === 'X' ? 'bg-cyan-400/20 shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'opacity-50'}`}>
                  <span className="text-cyan-400 font-bold">PLAYER X</span>
                  <div className="flex gap-1 mt-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (gameState.xMoves?.length || 0) ? 'bg-cyan-400' : 'bg-white/20'}`} />
                    ))}
                  </div>
                </div>
                <div className="mx-2 text-white/20 text-xl font-bold">VS</div>
                <div className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${gameState.tttTurn === 'O' ? 'bg-fuchsia-500/20 shadow-[0_0_15px_rgba(255,0,255,0.3)]' : 'opacity-50'}`}>
                  <span className="text-fuchsia-500 font-bold">PLAYER O</span>
                  <div className="flex gap-1 mt-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < (gameState.oMoves?.length || 0) ? 'bg-fuchsia-500' : 'bg-white/20'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-black/30 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                {[...Array(9)].map((_, i) => {
                  const isX = gameState.xMoves?.includes(i);
                  const isO = gameState.oMoves?.includes(i);
                  const xIdx = gameState.xMoves?.indexOf(i);
                  const oIdx = gameState.oMoves?.indexOf(i);
                  
                  const age = isX ? xIdx : oIdx;
                  const total = isX ? gameState.xMoves!.length : (isO ? gameState.oMoves!.length : 0);
                  const isOldest = total === 3 && age === 0;
                  
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
                        ${isWinningCell ? (isX ? 'bg-cyan-400/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.5)]' : 'bg-fuchsia-500/20 shadow-[inset_0_0_20px_rgba(255,0,255,0.5)]') : ''}
                      `}
                    >
                      {(isX || isO) && (
                        <div className={`transform transition-all duration-500 ${isOldest && !gameState.tttWinner ? 'opacity-50 scale-90 blur-[1px]' : 'scale-100'}`}>
                          <span className={`text-6xl font-black ${isX ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]' : 'text-fuchsia-500 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]'}`}>
                            {isX ? 'X' : 'O'}
                          </span>
                          {isOldest && !gameState.tttWinner && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-bounce border border-white/20">!</div>
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
            <div className="flex flex-col items-center w-full max-w-md pt-16">
              <div className="flex w-full gap-4 mb-6">
                <div className="flex-1 flex flex-col items-center bg-slate-800/50 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <span className="text-luminous-accent/70 text-xs font-bold uppercase tracking-wider">Moves</span>
                  <span className="text-white font-digital text-3xl font-bold">{gameState.puzzleMoves}</span>
                </div>
                <div className="flex-1 flex flex-col items-center bg-slate-800/50 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <span className="text-luminous-accent/70 text-xs font-bold uppercase tracking-wider">Time</span>
                  <span className="text-white font-digital text-3xl font-bold">
                    {Math.floor((gameState.puzzleTime || 0) / 60).toString().padStart(2, '0')}:
                    {((gameState.puzzleTime || 0) % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/30 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
                <div 
                  className="grid gap-2.5 transition-all duration-300" 
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
                          ${isEmpty ? 'bg-luminous-blue/5' : 'bg-gradient-to-br from-white/10 to-white/5 border-t border-l border-white/10 shadow-lg'}
                          ${!isEmpty ? 'text-slate-200' : ''}
                          ${isMovable ? 'cursor-pointer hover:bg-white/15 hover:scale-[1.02] hover:text-white' : ''}
                          ${gameState.puzzleStatus === 'won' && !isEmpty ? 'bg-luminous-blue text-white' : ''}
                        `}
                      >
                        {!isEmpty && num}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-4 mt-8 w-full max-w-xs">
                <button 
                  onClick={() => resetPuzzle(gameState.puzzleSize || 4)} 
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800/80 text-luminous-accent font-bold border border-white/10 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
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
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm aspect-square relative z-0 pt-16" style={{ perspective: '1000px' }}>
              <style>{`
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
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${style.showRole ? 'rotate-y-180' : ''}`}>
                      <div className="absolute inset-0 bg-paper rounded-xl shadow-lg flex flex-col items-center justify-center backface-hidden p-4 border-2 border-transparent">
                        <div className="flex items-center gap-1">
                          {player.isAi && <span className="material-symbols-outlined text-sm opacity-50">smart_toy</span>}
                          <p className="text-paper-text text-lg font-bold">Player {player.id}</p>
                        </div>
                        <p className="text-paper-text text-base font-medium opacity-90 truncate max-w-full">{player.name}</p>
                        <div className="mt-2 text-paper-text/40"><span className="material-symbols-outlined text-3xl">help</span></div>
                        <div className="absolute -top-2 -right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{player.totalScore} pts</div>
                      </div>

                      <div className={`absolute inset-0 ${style.bgClass} rounded-xl shadow-lg flex flex-col items-center justify-center backface-hidden rotate-y-180 p-4 border-2 border-white/20`}>
                        <div className="flex items-center gap-1">
                          {player.isAi && <span className="material-symbols-outlined text-sm opacity-50">smart_toy</span>}
                          <p className={`${style.textClass} text-lg font-bold`}>Player {player.id}</p>
                        </div>
                        <p className={`${style.textClass} text-base font-medium opacity-90 truncate max-w-full`}>{player.name}</p>
                        <div className="text-center mt-2">
                          <p className={`${style.textClass} text-xl font-extrabold uppercase`}>{player.currentRole}</p>
                        </div>
                        <div className="absolute -top-2 -right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{player.totalScore} pts</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {gameState.phase === GamePhase.POLICE_TASK && policePlayer && !policePlayer.isAi && gameState.gameId === GameId.THIEF_POLICE && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 p-6">
            <div className="bg-paper rounded-xl w-full max-w-sm p-6 text-center shadow-2xl flex flex-col items-center gap-4">
              <div className="bg-role-police text-white p-3 rounded-full mb-2"><span className="material-symbols-outlined text-4xl">local_police</span></div>
              <div>
                <h3 className="text-paper-text text-2xl font-bold mb-1">Police Investigation</h3>
                <p className="text-paper-text/70 text-sm">Pass the device to <strong>{policePlayer.name}</strong></p>
              </div>
              {!isTaskRevealed ? (
                <button onClick={handlePoliceTaskConfirm} className="mt-4 bg-role-police text-white font-bold py-3 px-6 rounded-lg w-full active:scale-95 transition-transform">
                  I am {policePlayer.name}
                </button>
              ) : (
                <div className="mt-4 w-full">
                  <p className="text-paper-text/70 mb-2">Your secret task:</p>
                  <div className="bg-amber-100 border-2 border-amber-400 rounded-lg p-4 mb-4">
                    <p className="text-2xl font-extrabold text-amber-700">Find the {gameState.policeTask}!</p>
                  </div>
                  <button onClick={handlePoliceTaskDone} className="bg-role-police text-white font-bold py-3 px-6 rounded-lg w-full active:scale-95 transition-transform">
                    Start Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState.phase === GamePhase.POLICE_SELECTION && gameState.gameId === GameId.THIEF_POLICE && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 p-4">
            <div className="bg-paper/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg">
              <p className="text-paper-text font-bold text-center">Tap a player to accuse!</p>
            </div>
          </div>
        )}

        {gameState.phase === GamePhase.ROUND_RESULTS && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-40 p-4">
            <div className="animate-pop-in bg-paper/10 border border-white/20 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 animate-fade-in-up">
                <span className="material-symbols-outlined text-4xl text-cta-green">flag</span>
                <h3 className="text-white text-3xl font-bold">Round Over!</h3>
              </div>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="w-full space-y-3 text-left">
                {gameState.players.map((player, index) => {
                  const isOwner = player.currentRole === 'Owner';
                  const isPolice = player.currentRole === 'Police';
                  const isRobber = player.currentRole === 'Robber';
                  const isThief = player.currentRole === 'Thief';
                  const wasAccused = gameState.policeSelection === index;
                  
                  let bgClass = 'bg-white/10';
                  let borderClass = '';
                  let roleIcon = 'person';
                  
                  if (isOwner) { 
                    bgClass = 'bg-role-owner/30'; 
                    borderClass = 'border-2 border-role-owner shadow-[0_0_15px_rgba(241,196,15,0.3)]'; 
                    roleIcon = 'home';
                  } else if (isPolice) { 
                    bgClass = 'bg-role-police/30'; 
                    borderClass = 'border border-role-police/50';
                    roleIcon = 'local_police';
                  } else if (isRobber) { 
                    bgClass = wasAccused ? 'bg-alert-red/30' : 'bg-role-robber/30'; 
                    borderClass = wasAccused ? 'border-2 border-alert-red' : 'border border-role-robber/50';
                    roleIcon = 'sports_martial_arts';
                  } else if (isThief) { 
                    bgClass = wasAccused ? 'bg-alert-red/30' : 'bg-role-thief/30'; 
                    borderClass = wasAccused ? 'border-2 border-alert-red' : 'border border-role-thief/50';
                    roleIcon = 'visibility_off';
                  } else if (wasAccused) { 
                    bgClass = 'bg-alert-red/30'; 
                    borderClass = 'border-2 border-alert-red'; 
                  }
                  
                  return (
                    <div 
                      key={player.id} 
                      className={`flex items-center justify-between ${bgClass} ${borderClass} p-3 rounded-xl animate-fade-in-up transition-all hover:scale-[1.02]`}
                      style={{ animationDelay: `${0.1 + index * 0.1}s`, opacity: 0 }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="size-10 rounded-full flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: player.color }}
                        >
                          <span className="material-symbols-outlined text-lg text-white">{roleIcon}</span>
                        </div>
                        <div>
                          <p className="text-white font-bold">{player.name} <span className="text-white/50 font-normal">(P{player.id})</span></p>
                          <p className="text-white/70 text-sm font-medium">{player.currentRole}{wasAccused ? ' • Accused' : ''}</p>
                        </div>
                      </div>
                      <div className={`text-xl font-bold px-3 py-1 rounded-lg ${
                        player.roundPoints > 0 
                          ? 'text-cta-green bg-cta-green/20' 
                          : player.roundPoints < 0 
                            ? 'text-alert-red bg-alert-red/20' 
                            : 'text-white/70 bg-white/5'
                      }`}>
                        {player.roundPoints > 0 ? '+' : ''}{player.roundPoints}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button 
              onClick={handleNextRound} 
              className="animate-fade-in-up mt-8 bg-cta-green text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg shadow-cta-green/30 w-full max-w-md active:scale-95 transition-all hover:shadow-xl hover:shadow-cta-green/40 flex items-center justify-center gap-2"
              style={{ animationDelay: '0.5s', opacity: 0 }}
            >
              <span>{gameState.currentRound >= gameState.maxRounds ? 'View Final Results' : 'Next Round'}</span>
              <span className="material-symbols-outlined">{gameState.currentRound >= gameState.maxRounds ? 'emoji_events' : 'arrow_forward'}</span>
            </button>
          </div>
        )}

        {showTutorial && <TutorialOverlay gameId={gameState.gameId} onDismiss={() => setShowTutorial(false)} />}
      </div>
    );
  };

  return (
    <div 
      className="font-display min-h-screen bg-game-bg bg-cover bg-center"
      style={{ backgroundImage: gameState.phase !== GamePhase.HOME && gameState.phase !== GamePhase.SETUP && gameState.phase !== GamePhase.LEADERBOARD ? `url(${currentGame.backgroundImage})` : undefined }}
    >
      {renderContent()}
    </div>
  );
};

export default App;
