import React, { useState, useEffect, useCallback, useRef } from 'react';

type Position = 'south' | 'west' | 'north' | 'east';
type GamePhase = 'setup' | 'playing' | 'rotating' | 'gameOver';

interface Card {
  id: string;
  name: string;
  colorIndex: number;
}

interface MatchHistory {
  position: Position;
  matchLevel: number;
  round: number;
}

interface PlayerRanking {
  position: Position;
  name: string;
  place: number;
  matchType: string;
  matchLevel: number;
  hand: Card[];
}

const CARD_COLORS = [
  { bg: 'bg-[#9f1239]', name: 'ruby-red' },
  { bg: 'bg-[#1e40af]', name: 'sapphire-blue' },
  { bg: 'bg-[#065f46]', name: 'emerald-green' },
  { bg: 'bg-[#581c87]', name: 'amethyst-purple' },
];

const PRESET_THEMES: Record<string, { names: string[]; icon: string }> = {
  animals: { names: ['Lion', 'Tiger', 'Eagle', 'Wolf'], icon: 'pets' },
  cities: { names: ['Tokyo', 'Paris', 'Cairo', 'Sydney'], icon: 'public' },
  movies: { names: ['Avatar', 'Frozen', 'Matrix', 'Shrek'], icon: 'local_movies' },
};

const POSITIONS: Position[] = ['south', 'west', 'north', 'east'];

const POSITION_LABELS: Record<Position, string> = {
  south: 'You',
  west: 'Player 2',
  north: 'Player 3',
  east: 'Player 4',
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getMatchLevel = (hand: Card[]): number => {
  if (!hand || hand.length === 0) return 0;
  const counts: Record<string, number> = {};
  hand.forEach(card => {
    counts[card.name] = (counts[card.name] || 0) + 1;
  });
  return Math.max(...Object.values(counts));
};

const getMatchTypeName = (level: number): string => {
  switch (level) {
    case 4: return '4-of-a-kind';
    case 3: return '3-of-a-kind';
    case 2: return '2-of-a-kind';
    default: return 'No matches';
  }
};

interface QuadMatchRoyaleProps {
  onExit?: () => void;
  isMultiplayer?: boolean;
  sendGameAction?: (action: string, data: any) => void;
  myPosition?: Position;
  isHost?: boolean;
  onGameAction?: (callback: (data: { action: string; data: any }) => void) => void;
  multiplayerPlayerNames?: string[];
}

const QuadMatchRoyale: React.FC<QuadMatchRoyaleProps> = ({ 
  onExit, 
  isMultiplayer = false, 
  sendGameAction, 
  myPosition = 'south',
  isHost = false,
  onGameAction,
  multiplayerPlayerNames
}) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
  const [hands, setHands] = useState<Record<Position, Card[]>>({
    south: [], west: [], north: [], east: [],
  });
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [winner, setWinner] = useState<Position | null>(null);
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  
  const pendingSelectionsRef = useRef<Record<Position, number | null>>({
    south: null, west: null, north: null, east: null
  });
  const isHostRef = useRef(isHost);
  const executeCardPassRef = useRef<((selections: Record<Position, number>) => void) | null>(null);
  const autoStartTriggeredRef = useRef(false);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const checkForWinner = useCallback((currentHands: Record<Position, Card[]>): Position | null => {
    for (const pos of POSITIONS) {
      if (getMatchLevel(currentHands[pos]) === 4) {
        return pos;
      }
    }
    return null;
  }, []);

  const calculateRankings = useCallback((currentHands: Record<Position, Card[]>, winnerPos: Position, history: MatchHistory[]): PlayerRanking[] => {
    const allRankings = POSITIONS.map(pos => {
      const level = getMatchLevel(currentHands[pos]);
      const historyEntry = history.find(h => h.position === pos && h.matchLevel === level);
      return {
        position: pos,
        name: POSITION_LABELS[pos],
        matchLevel: level,
        firstAchieved: historyEntry?.round || currentRound,
        hand: currentHands[pos],
        matchType: getMatchTypeName(level),
        place: 0,
      };
    });

    allRankings.sort((a, b) => {
      if (a.position === winnerPos) return -1;
      if (b.position === winnerPos) return 1;
      if (b.matchLevel !== a.matchLevel) return b.matchLevel - a.matchLevel;
      return a.firstAchieved - b.firstAchieved;
    });

    return allRankings.map((r, idx) => ({
      ...r,
      place: idx + 1,
    }));
  }, [currentRound]);

  useEffect(() => {
    if (!isMultiplayer || !onGameAction) return;

    const handleAction = (payload: { action: string; data: any }) => {
      const { action, data } = payload;
      
      switch (action) {
        case 'quadmatch_game_started':
          setHands(data.hands);
          setPlayerNames(data.playerNames);
          setCurrentRound(1);
          setSelectedCardIndex(null);
          setWinner(null);
          setRankings([]);
          setMatchHistory([]);
          pendingSelectionsRef.current = { south: null, west: null, north: null, east: null };
          setGamePhase('playing');
          break;

        case 'quadmatch_card_selected':
          pendingSelectionsRef.current[data.position as Position] = data.cardIndex;
          const allSelected = POSITIONS.every(p => 
            pendingSelectionsRef.current[p] !== null
          );
          if (allSelected && isHostRef.current && executeCardPassRef.current) {
            executeCardPassRef.current(pendingSelectionsRef.current as Record<Position, number>);
          }
          break;

        case 'quadmatch_cards_passed':
          setHands(data.newHands);
          setCurrentRound(data.currentRound);
          setMatchHistory(data.matchHistory);
          setSelectedCardIndex(null);
          pendingSelectionsRef.current = { south: null, west: null, north: null, east: null };
          if (data.winner) {
            setWinner(data.winner);
            setRankings(data.rankings);
            setGamePhase('gameOver');
          } else {
            setGamePhase('playing');
          }
          break;

        case 'quadmatch_play_again':
          setHands(data.hands);
          setCurrentRound(1);
          setSelectedCardIndex(null);
          setWinner(null);
          setRankings([]);
          setMatchHistory([]);
          pendingSelectionsRef.current = { south: null, west: null, north: null, east: null };
          setGamePhase('playing');
          break;
      }
    };

    onGameAction(handleAction);
  }, [isMultiplayer, onGameAction]);

  useEffect(() => {
    if (isMultiplayer && gamePhase === 'setup' && isHost && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      
      const presetNames = ['Lion', 'Tiger', 'Eagle', 'Wolf'];
      
      const createMultiplayerDeck = (): Card[] => {
        const deck: Card[] = [];
        presetNames.forEach((name, colorIndex) => {
          for (let i = 0; i < 4; i++) {
            deck.push({ id: `${name}-${i}`, name: name.trim(), colorIndex });
          }
        });
        return shuffleArray(deck);
      };
      
      const timeoutId = setTimeout(() => {
        const deck = createMultiplayerDeck();
        const newHands: Record<Position, Card[]> = {
          south: deck.slice(0, 4),
          west: deck.slice(4, 8),
          north: deck.slice(8, 12),
          east: deck.slice(12, 16),
        };
        
        if (sendGameAction) {
          sendGameAction('quadmatch_game_started', { hands: newHands, playerNames: presetNames });
        }
        
        setPlayerNames(presetNames);
        setHands(newHands);
        setCurrentRound(1);
        setSelectedCardIndex(null);
        setWinner(null);
        setRankings([]);
        setMatchHistory([]);
        setGamePhase('playing');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMultiplayer, isHost, gamePhase, sendGameAction]);

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
    setActivePreset(null);
    setNameError(null);
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_THEMES[presetKey];
    if (preset) {
      setPlayerNames(preset.names);
      setActivePreset(presetKey);
      setNameError(null);
    }
  };

  const validateNames = (): boolean => {
    const trimmedNames = playerNames.map(n => n.trim().toLowerCase());
    if (trimmedNames.some(n => n === '')) {
      setNameError('Please enter all four names.');
      return false;
    }
    const uniqueNames = new Set(trimmedNames);
    if (uniqueNames.size !== 4) {
      setNameError('All names must be unique.');
      return false;
    }
    return true;
  };

  const createDeck = useCallback((): Card[] => {
    const deck: Card[] = [];
    playerNames.forEach((name, colorIndex) => {
      for (let i = 0; i < 4; i++) {
        deck.push({ id: `${name}-${i}`, name: name.trim(), colorIndex });
      }
    });
    return shuffleArray(deck);
  }, [playerNames]);

  const startGame = () => {
    if (!validateNames()) return;
    
    const deck = createDeck();
    const newHands: Record<Position, Card[]> = {
      south: deck.slice(0, 4),
      west: deck.slice(4, 8),
      north: deck.slice(8, 12),
      east: deck.slice(12, 16),
    };
    
    if (isMultiplayer && sendGameAction) {
      sendGameAction('quadmatch_game_started', { hands: newHands, playerNames: playerNames });
    }
    
    setHands(newHands);
    setCurrentRound(1);
    setSelectedCardIndex(null);
    setWinner(null);
    setRankings([]);
    setMatchHistory([]);
    setGamePhase('playing');
  };

  const getAICardToPass = useCallback((hand: Card[]): number => {
    const counts: Record<string, number> = {};
    hand.forEach(card => {
      counts[card.name] = (counts[card.name] || 0) + 1;
    });

    const cardsByIndex = hand.map((card, idx) => ({ card, idx }));
    
    const hasThreeOfKind = Object.values(counts).some(c => c >= 3);
    if (hasThreeOfKind) {
      const threeOfKindName = Object.keys(counts).find(name => counts[name] >= 3)!;
      const singletons = cardsByIndex.filter(({ card }) => card.name !== threeOfKindName);
      if (singletons.length > 0) {
        return singletons.reduce((a, b) => a.idx > b.idx ? a : b).idx;
      }
    }

    const hasPair = Object.values(counts).some(c => c >= 2);
    if (hasPair) {
      const pairName = Object.keys(counts).find(name => counts[name] >= 2)!;
      const nonPair = cardsByIndex.filter(({ card }) => card.name !== pairName);
      if (nonPair.length > 0) {
        return nonPair.reduce((a, b) => a.idx > b.idx ? a : b).idx;
      }
    }

    const minCount = Math.min(...Object.values(counts));
    const leastCommon = cardsByIndex.filter(({ card }) => counts[card.name] === minCount);
    return leastCommon.reduce((a, b) => a.idx > b.idx ? a : b).idx;
  }, []);

  const executeCardPass = useCallback((selections: Record<Position, number>) => {
    setGamePhase('rotating');

    setTimeout(() => {
      const newHands: Record<Position, Card[]> = {
        south: [...hands.south],
        west: [...hands.west],
        north: [...hands.north],
        east: [...hands.east],
      };

      const passingCards = {
        south: newHands.south.splice(selections.south, 1)[0],
        west: newHands.west.splice(selections.west, 1)[0],
        north: newHands.north.splice(selections.north, 1)[0],
        east: newHands.east.splice(selections.east, 1)[0],
      };

      newHands.west.push(passingCards.south);
      newHands.north.push(passingCards.west);
      newHands.east.push(passingCards.north);
      newHands.south.push(passingCards.east);

      const winnerPos = checkForWinner(newHands);
      let newHistory = [...matchHistory];
      let finalRankings: PlayerRanking[] = [];

      POSITIONS.forEach(pos => {
        const level = getMatchLevel(newHands[pos]);
        const existingEntry = newHistory.find(h => h.position === pos && h.matchLevel === level);
        if (!existingEntry && level >= 1) {
          newHistory.push({ position: pos, matchLevel: level, round: currentRound });
        }
      });

      if (winnerPos) {
        finalRankings = calculateRankings(newHands, winnerPos, newHistory);
      }

      if (isMultiplayer && sendGameAction) {
        sendGameAction('quadmatch_cards_passed', {
          newHands,
          currentRound: currentRound + 1,
          matchHistory: newHistory,
          winner: winnerPos,
          rankings: finalRankings,
        });
      }

      setHands(newHands);
      setSelectedCardIndex(null);
      setMatchHistory(newHistory);
      pendingSelectionsRef.current = { south: null, west: null, north: null, east: null };

      if (winnerPos) {
        setWinner(winnerPos);
        setRankings(finalRankings);
        setGamePhase('gameOver');
      } else {
        setCurrentRound(prev => prev + 1);
        setGamePhase('playing');
      }
    }, 500);
  }, [hands, matchHistory, currentRound, checkForWinner, calculateRankings, isMultiplayer, sendGameAction]);

  useEffect(() => {
    executeCardPassRef.current = executeCardPass;
  }, [executeCardPass]);

  const passCards = useCallback(() => {
    if (selectedCardIndex === null) return;

    if (isMultiplayer && sendGameAction) {
      sendGameAction('quadmatch_card_selected', { position: myPosition, cardIndex: selectedCardIndex });
      pendingSelectionsRef.current[myPosition] = selectedCardIndex;
      
      const allSelected = POSITIONS.every(p => pendingSelectionsRef.current[p] !== null);
      if (allSelected && isHostRef.current) {
        executeCardPass(pendingSelectionsRef.current as Record<Position, number>);
      }
      return;
    }

    const aiSelections: Record<Position, number> = {
      south: selectedCardIndex,
      west: getAICardToPass(hands.west),
      north: getAICardToPass(hands.north),
      east: getAICardToPass(hands.east),
    };

    executeCardPass(aiSelections);
  }, [selectedCardIndex, hands, getAICardToPass, isMultiplayer, sendGameAction, myPosition, executeCardPass]);

  const playAgain = () => {
    const deck = createDeck();
    const newHands: Record<Position, Card[]> = {
      south: deck.slice(0, 4),
      west: deck.slice(4, 8),
      north: deck.slice(8, 12),
      east: deck.slice(12, 16),
    };
    
    if (isMultiplayer && sendGameAction) {
      sendGameAction('quadmatch_play_again', { hands: newHands });
    }
    
    setHands(newHands);
    setCurrentRound(1);
    setSelectedCardIndex(null);
    setWinner(null);
    setRankings([]);
    setMatchHistory([]);
    setGamePhase('playing');
  };

  const newGame = () => {
    setGamePhase('setup');
    setPlayerNames(['', '', '', '']);
    setActivePreset(null);
    setNameError(null);
    autoStartTriggeredRef.current = false;
  };

  const canStart = playerNames.every(n => n.trim() !== '') && new Set(playerNames.map(n => n.trim().toLowerCase())).size === 4;

  const getPositionLabel = useCallback((position: Position, showYouForSelf: boolean = true): string => {
    if (isMultiplayer && multiplayerPlayerNames && multiplayerPlayerNames.length === 4) {
      if (showYouForSelf && position === myPosition) {
        return 'You';
      }
      const positionIndexMap: Record<Position, number> = {
        south: 0, west: 1, north: 2, east: 3
      };
      return multiplayerPlayerNames[positionIndexMap[position]] || POSITION_LABELS[position];
    }
    return POSITION_LABELS[position];
  }, [isMultiplayer, multiplayerPlayerNames, myPosition]);

  const handleQuitClick = () => {
    setShowQuitConfirm(true);
  };

  const handleConfirmQuit = () => {
    setShowQuitConfirm(false);
    if (onExit) onExit();
  };

  const handleCancelQuit = () => {
    setShowQuitConfirm(false);
  };

  const QuitConfirmationPopup = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a2233] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-white/10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 mb-4">
            <span className="material-symbols-outlined text-4xl text-red-400">logout</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Leave Game?</h2>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to quit? Your current progress will be lost.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={handleCancelQuit}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmQuit}
              className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = (card: Card, index: number, isSelectable: boolean = false, isSelected: boolean = false) => {
    const color = CARD_COLORS[card.colorIndex];
    return (
      <div
        key={`${card.id}-${index}`}
        onClick={() => isSelectable && gamePhase === 'playing' && setSelectedCardIndex(index)}
        className={`
          relative w-full aspect-[3/4] rounded-lg flex items-center justify-center p-2 text-center
          transition-all duration-200
          ${color.bg} text-white
          ${isSelected 
            ? 'border-2 border-white ring-2 ring-white shadow-lg shadow-white/30 transform scale-105' 
            : 'border-2 border-transparent hover:border-white/50'}
          ${isSelectable && gamePhase === 'playing' ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <span className="font-bold text-xs sm:text-sm leading-tight uppercase tracking-wide break-words">
          {card.name}
        </span>
      </div>
    );
  };

  const renderCardBack = () => (
    <div className="w-full aspect-[3/4] rounded-lg bg-white/5 border border-white/10" />
  );

  const renderMiniCard = (card: Card, index: number) => {
    const color = CARD_COLORS[card.colorIndex];
    return (
      <div key={`mini-${card.id}-${index}`} className={`aspect-[3/4] w-8 rounded ${color.bg} flex items-center justify-center`}>
        <span className="text-white text-[6px] font-bold uppercase truncate px-0.5">{card.name.slice(0, 3)}</span>
      </div>
    );
  };

  if (gamePhase === 'setup') {
    if (isMultiplayer && !isHost) {
      return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#101622] p-4">
          {showQuitConfirm && <QuitConfirmationPopup />}
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-[#2b6cee] animate-pulse">hourglass_empty</span>
            <h1 className="text-white text-2xl font-bold mt-4">Waiting for Host</h1>
            <p className="text-gray-400 mt-2">The host is setting up the game...</p>
            {onExit && (
              <button onClick={handleQuitClick} className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gray-700 px-6 py-3 text-white hover:bg-gray-600 transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
                Leave Game
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex min-h-screen w-full flex-col items-center bg-[#101622] overflow-x-hidden p-4">
        {showQuitConfirm && <QuitConfirmationPopup />}
        <div className="w-full max-w-md mx-auto">
          {onExit && (
            <div className="flex items-center justify-between pt-4 pb-2">
              <button onClick={handleQuitClick} className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
              <div className="flex-1" />
            </div>
          )}
          
          <div className="text-center pt-8 pb-4">
            <h1 className="text-white tracking-light text-[32px] font-bold leading-tight">QuadMatch Royale</h1>
            <p className="text-gray-400 text-base font-normal leading-normal pt-2">Enter four names to create the card sets for your game.</p>
          </div>

          <div className="py-4">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">Create Your Card Sets</h2>
            <div className="flex flex-col gap-4">
              {playerNames.map((name, index) => (
                <label key={index} className="flex flex-col">
                  <p className="text-white text-base font-medium leading-normal pb-2">Player {index + 1}</p>
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#2b6cee]/50 border border-gray-700 bg-gray-800 focus:border-[#2b6cee] h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                    placeholder="Enter a unique name"
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                  />
                </label>
              ))}
            </div>

            {nameError && (
              <div className="flex items-center gap-2 text-red-400 pt-3">
                <span className="material-symbols-outlined text-base">error</span>
                <p className="text-sm font-medium">{nameError}</p>
              </div>
            )}
          </div>

          <div className="py-4">
            <h3 className="text-white text-lg font-bold leading-tight pb-3">Quick Start Ideas</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(PRESET_THEMES).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activePreset === key
                      ? 'bg-[#2b6cee]/20 text-sky-300'
                      : 'bg-gray-700/80 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{preset.icon}</span>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8 pb-6">
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 h-14 text-base font-bold transition-colors ${
                canStart
                  ? 'bg-[#2b6cee] text-white hover:bg-[#2b6cee]/90'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'playing' || gamePhase === 'rotating') {
    const isRotating = gamePhase === 'rotating';
    
    return (
      <div className="relative flex h-screen w-full flex-col bg-[#101622] p-4 pt-6 overflow-hidden">
        {showQuitConfirm && <QuitConfirmationPopup />}
        
        <div className="flex items-center justify-between pb-2">
          <div className="flex size-12 shrink-0 items-center justify-start">
            <span className="material-symbols-outlined text-white/80" style={{ fontSize: '28px' }}>neurology</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Round {currentRound}</h2>
          <div className="flex w-12 items-center justify-end">
            {onExit && (
              <button onClick={handleQuitClick} className="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-white/80 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="absolute top-4 text-center z-10">
            <h2 className="text-white tracking-light text-[28px] font-bold leading-tight">
              {isRotating ? 'Passing cards...' : 'Select a card to pass'}
            </h2>
            <p className="text-white/60 text-base font-normal leading-normal pt-1">
              {isRotating ? 'Cards rotating clockwise' : 'Your Turn'}
            </p>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-24 h-24">
              <span className={`material-symbols-outlined text-white/10 absolute top-0 left-1/2 ${isRotating ? 'animate-pulse text-white/30' : ''}`} style={{ fontSize: '32px', transform: 'translateX(-50%) translateY(-100%) rotate(-90deg)' }}>arrow_forward</span>
              <span className={`material-symbols-outlined text-white/10 absolute bottom-0 left-1/2 ${isRotating ? 'animate-pulse text-white/30' : ''}`} style={{ fontSize: '32px', transform: 'translateX(-50%) translateY(100%) rotate(90deg)' }}>arrow_forward</span>
              <span className={`material-symbols-outlined text-white/10 absolute top-1/2 left-0 ${isRotating ? 'animate-pulse text-white/30' : ''}`} style={{ fontSize: '32px', transform: 'translateY(-50%) translateX(-100%) rotate(180deg)' }}>arrow_forward</span>
              <span className={`material-symbols-outlined text-white/10 absolute top-1/2 right-0 ${isRotating ? 'animate-pulse text-white/30' : ''}`} style={{ fontSize: '32px', transform: 'translateY(-50%) translateX(100%)' }}>arrow_forward</span>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-sm">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5">
              <p className="text-white/60 text-sm font-normal leading-normal text-center mb-2">{getPositionLabel('north')}</p>
              <div className="grid grid-cols-4 gap-2">
                {hands.north.map((_, idx) => (
                  <div key={idx}>{renderCardBack()}</div>
                ))}
              </div>
            </div>

            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 w-3/5">
              <p className="text-white/60 text-sm font-normal leading-normal text-center mb-2">{getPositionLabel('west')}</p>
              <div className="grid grid-cols-4 gap-1">
                {hands.west.map((_, idx) => (
                  <div key={idx}>{renderCardBack()}</div>
                ))}
              </div>
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-3/5">
              <p className="text-white/60 text-sm font-normal leading-normal text-center mb-2">{getPositionLabel('east')}</p>
              <div className="grid grid-cols-4 gap-1">
                {hands.east.map((_, idx) => (
                  <div key={idx}>{renderCardBack()}</div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-full p-3 rounded-xl bg-[#2b6cee]/20 border-2 border-[#2b6cee] shadow-lg shadow-[#2b6cee]/20">
              <p className="text-white text-base font-bold leading-normal text-center mb-3">{getPositionLabel('south')}</p>
              <div className="grid grid-cols-4 gap-2 px-2">
                {hands.south.map((card, idx) => (
                  <div key={card.id} className="flex flex-col gap-3">
                    {renderCard(card, idx, !isRotating, selectedCardIndex === idx)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full pt-4 pb-2">
          <button
            onClick={passCards}
            disabled={selectedCardIndex === null || isRotating}
            className={`w-full flex items-center justify-center rounded-xl h-14 gap-2 text-lg font-bold leading-normal tracking-[0.015em] transition-all ${
              selectedCardIndex !== null && !isRotating
                ? 'bg-[#2b6cee] text-white shadow-lg shadow-[#2b6cee]/30 hover:bg-[#2b6cee]/90'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>{isRotating ? 'Passing...' : 'Pass Selected Card'}</span>
            {!isRotating && <span className="material-symbols-outlined">arrow_forward</span>}
          </button>
        </div>
      </div>
    );
  }

  if (gamePhase === 'gameOver' && winner) {
    const winnerRanking = rankings.find(r => r.position === winner);
    const otherRankings = rankings.filter(r => r.position !== winner);
    const totalCardsPassed = (currentRound - 1) * 4;
    const getDisplayName = (position: Position) => getPositionLabel(position, false);

    return (
      <div className="relative flex min-h-screen w-full flex-col items-center bg-[#101622] overflow-x-hidden p-4">
        {showQuitConfirm && <QuitConfirmationPopup />}
        <div className="w-full text-center py-6">
          <h1 className="text-3xl font-bold tracking-tight text-white">WINNER!</h1>
          <p className="text-base text-gray-400 mt-1">Congratulations, {getDisplayName(winner)}!</p>
        </div>

        {winnerRanking && (
          <div className="w-full max-w-md">
            <div className="flex flex-col items-stretch justify-start rounded-xl bg-[#2b6cee]/20 shadow-lg p-4 mb-6 ring-2 ring-[#2b6cee]">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="flex items-center justify-center rounded-full size-16 bg-[#2b6cee]/30">
                    <span className="material-symbols-outlined text-4xl text-[#2b6cee]">person</span>
                  </div>
                  <div className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-[#2b6cee] text-white">
                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-bold leading-tight tracking-tight text-white">{getDisplayName(winnerRanking.position)}</p>
                  <p className="text-base font-normal leading-normal text-gray-300">1st Place</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-400">Final Hand</p>
                <div className="grid grid-cols-4 gap-2">
                  {winnerRanking.hand.map((card, idx) => {
                    const color = CARD_COLORS[card.colorIndex];
                    return (
                      <div key={idx} className={`aspect-[3/4] rounded-lg ${color.bg} flex items-center justify-center p-1`}>
                        <span className="text-white text-[10px] font-bold uppercase text-center break-words">{card.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center rounded-full bg-green-900/50 px-3 py-1 text-sm font-medium text-green-300">
                  {winnerRanking.matchType}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-md space-y-3">
          {otherRankings.map((ranking) => (
            <div key={ranking.position} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
              <div className="flex items-center justify-center rounded-full size-12 bg-gray-700">
                <span className="material-symbols-outlined text-2xl text-gray-400">person</span>
              </div>
              <div className="flex-grow">
                <p className="text-base font-medium leading-normal text-white">{getDisplayName(ranking.position)} - {ranking.place === 2 ? '2nd' : ranking.place === 3 ? '3rd' : '4th'} Place</p>
                <p className="text-sm font-normal leading-normal text-gray-400">{ranking.matchType}</p>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ranking.hand.map((card, idx) => renderMiniCard(card, idx))}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-md mt-8 p-4 rounded-xl bg-white/5">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="material-symbols-outlined text-3xl text-[#2b6cee]">replay</span>
              <p className="mt-1 text-2xl font-bold text-white">{currentRound - 1}</p>
              <p className="text-sm text-gray-400">Total Rounds</p>
            </div>
            <div>
              <span className="material-symbols-outlined text-3xl text-[#2b6cee]">swap_horiz</span>
              <p className="mt-1 text-2xl font-bold text-white">{totalCardsPassed}</p>
              <p className="text-sm text-gray-400">Cards Passed</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mt-auto pt-8 pb-4 space-y-3">
          <button
            onClick={playAgain}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#2b6cee] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#2b6cee]/90 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={newGame}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-transparent px-6 text-base font-semibold text-[#2b6cee] ring-1 ring-inset ring-[#2b6cee]/50 hover:bg-[#2b6cee]/10 transition-colors"
          >
            Change Names
          </button>
          {onExit && (
            <button
              onClick={handleQuitClick}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-transparent px-6 text-base font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">home</span>
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default QuadMatchRoyale;
