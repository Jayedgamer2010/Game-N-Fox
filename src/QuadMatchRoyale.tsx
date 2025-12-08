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
  hand: Card[];
}

const CARD_COLORS = [
  { bg: 'bg-rose-700', border: 'border-rose-500', text: 'text-rose-100' },
  { bg: 'bg-blue-700', border: 'border-blue-500', text: 'text-blue-100' },
  { bg: 'bg-emerald-700', border: 'border-emerald-500', text: 'text-emerald-100' },
  { bg: 'bg-purple-700', border: 'border-purple-500', text: 'text-purple-100' },
];

const PRESET_THEMES = {
  animals: ['Lion', 'Tiger', 'Eagle', 'Wolf'],
  cities: ['Tokyo', 'Paris', 'Cairo', 'Sydney'],
  movies: ['Avatar', 'Frozen', 'Matrix', 'Shrek'],
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
  const counts: Record<string, number> = {};
  hand.forEach(card => {
    counts[card.name] = (counts[card.name] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(counts));
  return maxCount;
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
}

const QuadMatchRoyale: React.FC<QuadMatchRoyaleProps> = ({ 
  onExit, 
  isMultiplayer = false, 
  sendGameAction, 
  myPosition = 'south',
  isHost = false,
  onGameAction 
}) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
  const [hands, setHands] = useState<Record<Position, Card[]>>({
    south: [],
    west: [],
    north: [],
    east: [],
  });
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [winner, setWinner] = useState<Position | null>(null);
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const cardReceivedRef = useRef<Record<Position, number>>({
    south: 0, west: 0, north: 0, east: 0
  });
  const pendingSelectionsRef = useRef<Record<Position, number | null>>({
    south: null, west: null, north: null, east: null
  });
  const isHostRef = useRef(isHost);
  const executeCardPassRef = useRef<((selections: Record<Position, number>) => void) | null>(null);
  const autoStartTriggeredRef = useRef(false);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const positions: Position[] = ['south', 'west', 'north', 'east'];

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
          cardReceivedRef.current = { south: 0, west: 0, north: 0, east: 0 };
          pendingSelectionsRef.current = { south: null, west: null, north: null, east: null };
          setGamePhase('playing');
          break;

        case 'quadmatch_card_selected':
          pendingSelectionsRef.current[data.position as Position] = data.cardIndex;
          const allSelected = positions.every(p => 
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
          cardReceivedRef.current = { south: 0, west: 0, north: 0, east: 0 };
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
            deck.push({
              id: `${name}-${i}`,
              name: name.trim(),
              colorIndex,
            });
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
          sendGameAction('quadmatch_game_started', {
            hands: newHands,
            playerNames: presetNames,
          });
        }
        
        setPlayerNames(presetNames);
        setHands(newHands);
        setCurrentRound(1);
        setSelectedCardIndex(null);
        setWinner(null);
        setRankings([]);
        setMatchHistory([]);
        cardReceivedRef.current = { south: 0, west: 0, north: 0, east: 0 };
        setGamePhase('playing');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMultiplayer, isHost, gamePhase, sendGameAction]);
  
  const positionLabels: Record<Position, string> = {
    south: 'You (South)',
    west: 'West',
    north: 'North',
    east: 'East',
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
    setActivePreset(null);
    setNameError(null);
  };

  const applyPreset = (presetKey: keyof typeof PRESET_THEMES) => {
    setPlayerNames(PRESET_THEMES[presetKey]);
    setActivePreset(presetKey);
    setNameError(null);
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
        deck.push({
          id: `${name}-${i}`,
          name: name.trim(),
          colorIndex,
        });
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
      sendGameAction('quadmatch_game_started', {
        hands: newHands,
        playerNames: playerNames,
      });
    }
    
    setHands(newHands);
    setCurrentRound(1);
    setSelectedCardIndex(null);
    setWinner(null);
    setRankings([]);
    setMatchHistory([]);
    cardReceivedRef.current = { south: 0, west: 0, north: 0, east: 0 };
    setGamePhase('playing');
  };

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
      let newHistory = matchHistory;
      let finalRankings: PlayerRanking[] = [];

      if (winnerPos) {
        newHistory = [...matchHistory];
        positions.forEach(pos => {
          const level = getMatchLevel(newHands[pos]);
          const existingEntry = newHistory.find(h => h.position === pos && h.matchLevel === level);
          if (!existingEntry && level >= 2) {
            newHistory.push({ position: pos, matchLevel: level, round: currentRound });
          }
        });
        finalRankings = calculateRankings(newHands, winnerPos, newHistory);
      } else {
        const updatedHistory: MatchHistory[] = [...matchHistory];
        positions.forEach(pos => {
          const level = getMatchLevel(newHands[pos]);
          const existingEntry = updatedHistory.find(h => h.position === pos && h.matchLevel === level);
          if (!existingEntry && level >= 2) {
            updatedHistory.push({ position: pos, matchLevel: level, round: currentRound });
          }
        });
        newHistory = updatedHistory;
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
      pendingSelectionsRef.current = { south: null, west: null, north: null, east: null };

      if (winnerPos) {
        setWinner(winnerPos);
        setRankings(finalRankings);
        setMatchHistory(newHistory);
        setGamePhase('gameOver');
      } else {
        setMatchHistory(newHistory);
        setCurrentRound(prev => prev + 1);
        setGamePhase('playing');
      }
    }, 500);
  }, [hands, matchHistory, currentRound, checkForWinner, calculateRankings, positions, isMultiplayer, sendGameAction]);

  useEffect(() => {
    executeCardPassRef.current = executeCardPass;
  }, [executeCardPass]);

  const getAICardToPass = useCallback((hand: Card[], position: Position): number => {
    const counts: Record<string, number> = {};
    hand.forEach(card => {
      counts[card.name] = (counts[card.name] || 0) + 1;
    });

    const sortedByReceived = hand.map((card, idx) => ({ card, idx }));
    
    const hasThreeOfKind = Object.values(counts).some(c => c >= 3);
    if (hasThreeOfKind) {
      const threeOfKindName = Object.keys(counts).find(name => counts[name] >= 3)!;
      const singleton = sortedByReceived.find(({ card }) => card.name !== threeOfKindName);
      if (singleton) return singleton.idx;
    }

    const hasPair = Object.values(counts).some(c => c >= 2);
    if (hasPair) {
      const pairName = Object.keys(counts).find(name => counts[name] >= 2)!;
      const nonPair = sortedByReceived.filter(({ card }) => card.name !== pairName);
      if (nonPair.length > 0) {
        return nonPair[Math.floor(Math.random() * nonPair.length)].idx;
      }
    }

    const minCount = Math.min(...Object.values(counts));
    const leastCommon = sortedByReceived.filter(({ card }) => counts[card.name] === minCount);
    return leastCommon[Math.floor(Math.random() * leastCommon.length)].idx;
  }, []);

  const checkForWinner = useCallback((currentHands: Record<Position, Card[]>): Position | null => {
    for (const pos of positions) {
      if (getMatchLevel(currentHands[pos]) === 4) {
        return pos;
      }
    }
    return null;
  }, [positions]);

  const updateMatchHistory = useCallback((currentHands: Record<Position, Card[]>, round: number) => {
    const newHistory: MatchHistory[] = [...matchHistory];
    
    positions.forEach(pos => {
      const level = getMatchLevel(currentHands[pos]);
      const existingEntry = newHistory.find(h => h.position === pos && h.matchLevel === level);
      if (!existingEntry && level >= 2) {
        newHistory.push({ position: pos, matchLevel: level, round });
      }
    });
    
    setMatchHistory(newHistory);
    return newHistory;
  }, [matchHistory, positions]);

  const calculateRankings = useCallback((currentHands: Record<Position, Card[]>, winnerPos: Position, history: MatchHistory[]): PlayerRanking[] => {
    const allRankings = positions.map(pos => {
      const level = getMatchLevel(currentHands[pos]);
      const historyEntry = history.find(h => h.position === pos && h.matchLevel === level);
      return {
        position: pos,
        name: positionLabels[pos],
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
  }, [currentRound, positions, positionLabels]);

  const passCards = useCallback(() => {
    if (selectedCardIndex === null) return;

    if (isMultiplayer && sendGameAction) {
      sendGameAction('quadmatch_card_selected', {
        position: myPosition,
        cardIndex: selectedCardIndex,
      });
      pendingSelectionsRef.current[myPosition] = selectedCardIndex;
      
      const allSelected = positions.every(p => 
        pendingSelectionsRef.current[p] !== null
      );
      if (allSelected && isHostRef.current) {
        executeCardPass(pendingSelectionsRef.current as Record<Position, number>);
      }
      return;
    }

    setGamePhase('rotating');

    const aiSelections: Record<Position, number> = {
      south: selectedCardIndex,
      west: getAICardToPass(hands.west, 'west'),
      north: getAICardToPass(hands.north, 'north'),
      east: getAICardToPass(hands.east, 'east'),
    };

    setTimeout(() => {
      const newHands: Record<Position, Card[]> = {
        south: [...hands.south],
        west: [...hands.west],
        north: [...hands.north],
        east: [...hands.east],
      };

      const passingCards = {
        south: newHands.south.splice(aiSelections.south, 1)[0],
        west: newHands.west.splice(aiSelections.west, 1)[0],
        north: newHands.north.splice(aiSelections.north, 1)[0],
        east: newHands.east.splice(aiSelections.east, 1)[0],
      };

      newHands.west.push(passingCards.south);
      newHands.north.push(passingCards.west);
      newHands.east.push(passingCards.north);
      newHands.south.push(passingCards.east);

      setHands(newHands);
      setSelectedCardIndex(null);

      const winnerPos = checkForWinner(newHands);
      if (winnerPos) {
        const history = updateMatchHistory(newHands, currentRound);
        const finalRankings = calculateRankings(newHands, winnerPos, history);
        setWinner(winnerPos);
        setRankings(finalRankings);
        setGamePhase('gameOver');
      } else {
        updateMatchHistory(newHands, currentRound);
        setCurrentRound(prev => prev + 1);
        setGamePhase('playing');
      }
    }, 500);
  }, [selectedCardIndex, hands, getAICardToPass, checkForWinner, updateMatchHistory, calculateRankings, currentRound, isMultiplayer, sendGameAction, myPosition, positions, executeCardPass]);

  const playAgain = () => {
    if (isMultiplayer && sendGameAction) {
      const deck = createDeck();
      const newHands: Record<Position, Card[]> = {
        south: deck.slice(0, 4),
        west: deck.slice(4, 8),
        north: deck.slice(8, 12),
        east: deck.slice(12, 16),
      };
      sendGameAction('quadmatch_play_again', { hands: newHands });
      setHands(newHands);
      setCurrentRound(1);
      setSelectedCardIndex(null);
      setWinner(null);
      setRankings([]);
      setMatchHistory([]);
      cardReceivedRef.current = { south: 0, west: 0, north: 0, east: 0 };
      setGamePhase('playing');
    } else {
      startGame();
    }
  };

  const newGame = () => {
    setGamePhase('setup');
    setPlayerNames(['', '', '', '']);
    setActivePreset(null);
    setNameError(null);
  };

  const canStart = playerNames.every(n => n.trim() !== '') && new Set(playerNames.map(n => n.trim().toLowerCase())).size === 4;

  if (gamePhase === 'setup') {
    if (isMultiplayer && !isHost) {
      return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background-dark p-4">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-primary animate-pulse">hourglass_empty</span>
            <h1 className="text-white text-2xl font-bold mt-4">Waiting for Host</h1>
            <p className="text-zinc-400 mt-2">The host is setting up the game...</p>
            {onExit && (
              <button
                onClick={onExit}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-zinc-700 px-6 py-3 text-white hover:bg-zinc-600 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Leave Game
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex min-h-screen w-full flex-col items-center bg-background-dark overflow-x-hidden p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between pt-4 pb-2">
            {onExit && (
              <button
                onClick={onExit}
                className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
            )}
            <div className="flex-1" />
          </div>
          
          <div className="text-center pt-4 pb-4">
            <h1 className="text-white tracking-light text-[32px] font-bold leading-tight">QuadMatch Royale</h1>
            <p className="text-zinc-400 text-base font-normal leading-normal pt-2">Enter four names to create the card sets for your game.</p>
          </div>

          <div className="py-4">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">Create Your Card Sets</h2>
            <div className="flex flex-col gap-4">
              {playerNames.map((name, index) => (
                <label key={index} className="flex flex-col">
                  <p className="text-white text-base font-medium leading-normal pb-2">Card Set {index + 1}</p>
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-zinc-700 bg-zinc-800 focus:border-primary h-14 placeholder:text-zinc-500 p-[15px] text-base font-normal leading-normal"
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
              <button
                onClick={() => applyPreset('animals')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activePreset === 'animals'
                    ? 'bg-primary/20 text-sky-300'
                    : 'bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">pets</span>
                Animals
              </button>
              <button
                onClick={() => applyPreset('cities')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activePreset === 'cities'
                    ? 'bg-primary/20 text-sky-300'
                    : 'bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">public</span>
                Cities
              </button>
              <button
                onClick={() => applyPreset('movies')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activePreset === 'movies'
                    ? 'bg-primary/20 text-sky-300'
                    : 'bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">local_movies</span>
                Movies
              </button>
            </div>
          </div>

          <div className="pt-8 pb-6">
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 h-14 text-base font-bold transition-all ${
                canStart
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'gameOver') {
    const winnerRanking = rankings.find(r => r.place === 1);
    
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center bg-background-dark overflow-x-hidden p-4">
        <div className="w-full text-center py-6">
          <h1 className="text-3xl font-bold tracking-tight text-white">WINNER!</h1>
          <p className="text-base text-zinc-400 mt-1">
            Congratulations, {winnerRanking?.name}!
          </p>
        </div>

        {winnerRanking && (
          <div className="w-full max-w-md">
            <div className="flex flex-col items-stretch justify-start rounded-xl bg-primary/20 shadow-lg p-4 mb-6 ring-2 ring-primary">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="flex items-center justify-center rounded-full size-16 bg-primary text-white">
                    <span className="material-symbols-outlined text-3xl">emoji_events</span>
                  </div>
                  <div className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-yellow-500 text-white">
                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-bold leading-tight tracking-tight text-white">{winnerRanking.name}</p>
                  <p className="text-base font-normal leading-normal text-zinc-300">1st Place</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-zinc-400">Final Hand</p>
                <div className="grid grid-cols-4 gap-2">
                  {winnerRanking.hand.map((card, idx) => (
                    <div
                      key={idx}
                      className={`aspect-[3/4] rounded-lg flex items-center justify-center p-1 text-center ${CARD_COLORS[card.colorIndex].bg}`}
                    >
                      <span className="font-bold text-white text-xs leading-tight">{card.name}</span>
                    </div>
                  ))}
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
          {rankings.filter(r => r.place > 1).map((ranking) => (
            <div key={ranking.position} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
              <div className="flex items-center justify-center rounded-full size-12 bg-zinc-700 text-white">
                <span className="text-lg font-bold">{ranking.place}</span>
              </div>
              <div className="flex-grow">
                <p className="text-base font-medium leading-normal text-white">
                  {ranking.name} - {ranking.place === 2 ? '2nd' : ranking.place === 3 ? '3rd' : '4th'} Place
                </p>
                <p className="text-sm font-normal leading-normal text-zinc-400">{ranking.matchType}</p>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ranking.hand.map((card, idx) => (
                  <div
                    key={idx}
                    className={`aspect-[3/4] w-8 rounded flex items-center justify-center ${CARD_COLORS[card.colorIndex].bg}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-md mt-8 p-4 rounded-xl bg-white/5">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="material-symbols-outlined text-3xl text-primary">replay</span>
              <p className="mt-1 text-2xl font-bold text-white">{currentRound}</p>
              <p className="text-sm text-zinc-400">Total Rounds</p>
            </div>
            <div>
              <span className="material-symbols-outlined text-3xl text-primary">swap_horiz</span>
              <p className="mt-1 text-2xl font-bold text-white">{currentRound * 4}</p>
              <p className="text-sm text-zinc-400">Cards Passed</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mt-auto pt-8 pb-4 space-y-3">
          <button
            onClick={playAgain}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Play Again
          </button>
          <button
            onClick={newGame}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-transparent px-6 text-base font-semibold text-primary ring-1 ring-inset ring-primary/50 hover:bg-primary/10"
          >
            Change Names
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-transparent px-6 text-base font-semibold text-zinc-400 hover:text-white"
            >
              Exit Game
            </button>
          )}
        </div>
      </div>
    );
  }

  const isRotating = gamePhase === 'rotating';

  const renderOpponentHand = (position: Position, label: string) => {
    const hand = hands[position];
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-white/60 text-sm font-medium">{label}</p>
        <div className="flex gap-1.5">
          {hand.map((_, idx) => (
            <div 
              key={idx} 
              className="w-10 h-14 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg border border-white/10 shadow-md flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-white/20 text-lg">style</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex size-12 shrink-0 items-center justify-start">
          <span className="material-symbols-outlined text-white/80 text-[28px]">neurology</span>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          Round {currentRound}
        </h2>
        <div className="flex w-12 items-center justify-end">
          {onExit && (
            <button
              onClick={onExit}
              className="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-white/80 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[28px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="text-center px-4 pt-2 pb-4">
        <h2 className="text-white tracking-light text-2xl font-bold leading-tight">
          {isRotating ? 'Passing cards...' : 'Select a card to pass'}
        </h2>
        <p className="text-white/60 text-sm font-normal leading-normal pt-1">
          {isRotating ? 'Cards rotating clockwise' : 'Your Turn - Tap a card to select it'}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          {renderOpponentHand('north', 'North (AI)')}

          <div className="flex w-full justify-between items-center px-4">
            <div className="transform -rotate-90 origin-center">
              {renderOpponentHand('west', 'West (AI)')}
            </div>

            <div className="relative w-20 h-20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-16 h-16 rounded-full border-2 border-dashed ${isRotating ? 'border-primary animate-spin' : 'border-white/20'}`}></div>
              </div>
              <span 
                className={`material-symbols-outlined absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 ${isRotating ? 'text-primary' : 'text-white/30'}`} 
                style={{ fontSize: '20px' }}
              >
                arrow_upward
              </span>
              <span 
                className={`material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 ${isRotating ? 'text-primary' : 'text-white/30'}`} 
                style={{ fontSize: '20px' }}
              >
                arrow_forward
              </span>
              <span 
                className={`material-symbols-outlined absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 ${isRotating ? 'text-primary' : 'text-white/30'}`} 
                style={{ fontSize: '20px' }}
              >
                arrow_downward
              </span>
              <span 
                className={`material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 ${isRotating ? 'text-primary' : 'text-white/30'}`} 
                style={{ fontSize: '20px' }}
              >
                arrow_back
              </span>
            </div>

            <div className="transform rotate-90 origin-center">
              {renderOpponentHand('east', 'East (AI)')}
            </div>
          </div>

          <div className="w-full p-4 rounded-2xl bg-primary/10 border-2 border-primary/50 shadow-lg shadow-primary/10">
            <p className="text-white text-base font-bold leading-normal text-center mb-4">
              Your Hand (South)
            </p>
            <div className="grid grid-cols-4 gap-3">
              {hands.south.map((card, idx) => (
                <button
                  key={card.id}
                  onClick={() => !isRotating && setSelectedCardIndex(idx)}
                  disabled={isRotating}
                  className={`relative aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all duration-200 ${
                    CARD_COLORS[card.colorIndex].bg
                  } ${
                    selectedCardIndex === idx
                      ? 'ring-4 ring-white shadow-xl shadow-white/20 scale-105 -translate-y-2'
                      : 'hover:scale-102 hover:-translate-y-1 hover:shadow-lg'
                  } ${isRotating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="font-bold text-white text-sm leading-tight uppercase break-words">{card.name}</span>
                  {selectedCardIndex === idx && (
                    <div className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-white text-primary">
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedCardIndex !== null && !isRotating && (
              <p className="text-center text-primary text-sm mt-3 font-medium">
                Passing "{hands.south[selectedCardIndex].name}" to West
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 pb-6">
        <button
          onClick={passCards}
          disabled={selectedCardIndex === null || isRotating}
          className={`w-full flex items-center justify-center rounded-xl h-14 gap-2 text-lg font-bold leading-normal tracking-[0.015em] transition-all ${
            selectedCardIndex !== null && !isRotating
              ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98]'
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
          }`}
        >
          <span>{isRotating ? 'Passing...' : 'Pass Selected Card'}</span>
          {!isRotating && selectedCardIndex !== null && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default QuadMatchRoyale;
