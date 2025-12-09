import React, { useState, useEffect, useCallback, useRef } from 'react';

type Position = 'south' | 'west' | 'north' | 'east';
type GamePhase = 'modeSelect' | 'setup' | 'playing' | 'passing' | 'gameOver';
type GameMode = 'offline' | 'multiplayer';
type TurnPhase = 'selecting' | 'passing' | 'waiting';

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
const TURN_ORDER: Position[] = ['south', 'west', 'north', 'east'];

const POSITION_LABELS: Record<Position, string> = {
  south: 'You',
  west: 'West',
  north: 'North',
  east: 'East',
};

const POSITION_NAMES: Record<Position, string> = {
  south: 'South',
  west: 'West',
  north: 'North',
  east: 'East',
};

const getRotatedPosition = (displayPosition: Position, myPosition: Position): Position => {
  if (myPosition === 'south') return displayPosition;
  
  const positionOrder: Position[] = ['south', 'west', 'north', 'east'];
  const myIndex = positionOrder.indexOf(myPosition);
  const displayIndex = positionOrder.indexOf(displayPosition);
  const actualIndex = (displayIndex + myIndex) % 4;
  return positionOrder[actualIndex];
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  const [gameMode, setGameMode] = useState<GameMode>(isMultiplayer ? 'multiplayer' : 'offline');
  const [gamePhase, setGamePhase] = useState<GamePhase>(isMultiplayer ? 'setup' : 'modeSelect');
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
  
  const [currentTurn, setCurrentTurn] = useState<Position>('south');
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('selecting');
  const [roundStartPlayer, setRoundStartPlayer] = useState<Position>('south');
  const [passedInRound, setPassedInRound] = useState<Record<Position, boolean>>({
    south: false, west: false, north: false, east: false
  });
  const [passingCard, setPassingCard] = useState<{ from: Position; to: Position; card: Card } | null>(null);
  
  const isHostRef = useRef(isHost);
  const autoStartTriggeredRef = useRef(false);
  const aiProcessingRef = useRef(false);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    if (isMultiplayer) {
      setGameMode('multiplayer');
      if (gamePhase === 'modeSelect') {
        setGamePhase('setup');
      }
    }
  }, [isMultiplayer, gamePhase]);

  const getNextPlayer = useCallback((current: Position): Position => {
    const currentIndex = TURN_ORDER.indexOf(current);
    return TURN_ORDER[(currentIndex + 1) % 4];
  }, []);

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

  const calculateBestCardToPass = useCallback((hand: Card[]): number => {
    const counts: Record<string, number> = {};
    hand.forEach(card => {
      counts[card.name] = (counts[card.name] || 0) + 1;
    });

    const cardsByIndex = hand.map((card, idx) => ({ card, idx }));
    
    const hasThreeOrMore = Object.values(counts).some(c => c >= 3);
    if (hasThreeOrMore) {
      const threeOfKindName = Object.keys(counts).find(name => counts[name] >= 3)!;
      const singletons = cardsByIndex.filter(({ card }) => card.name !== threeOfKindName);
      if (singletons.length > 0) {
        return singletons[0].idx;
      }
    }

    const hasPair = Object.values(counts).some(c => c >= 2);
    if (hasPair) {
      const pairName = Object.keys(counts).find(name => counts[name] >= 2)!;
      const nonPair = cardsByIndex.filter(({ card }) => card.name !== pairName);
      if (nonPair.length > 0) {
        return nonPair[0].idx;
      }
    }

    return 0;
  }, []);

  const executeCardPass = useCallback(async (fromPlayer: Position, cardIndex: number, currentHands: Record<Position, Card[]>, shouldBroadcast: boolean = true) => {
    const nextPlayer = getNextPlayer(fromPlayer);
    const cardToPass = currentHands[fromPlayer][cardIndex];
    
    setPassingCard({ from: fromPlayer, to: nextPlayer, card: cardToPass });
    setTurnPhase('passing');
    
    await delay(500);
    
    const newHands = {
      south: [...currentHands.south],
      west: [...currentHands.west],
      north: [...currentHands.north],
      east: [...currentHands.east],
    };
    
    newHands[fromPlayer].splice(cardIndex, 1);
    newHands[nextPlayer].push(cardToPass);
    
    setHands(newHands);
    setPassingCard(null);
    setSelectedCardIndex(null);
    
    const newPassedInRound = { ...passedInRound, [fromPlayer]: true };
    setPassedInRound(newPassedInRound);
    
    const allPassed = POSITIONS.every(p => newPassedInRound[p]);
    
    if (allPassed) {
      const winnerPos = checkForWinner(newHands);
      let newHistory = [...matchHistory];
      
      POSITIONS.forEach(pos => {
        const level = getMatchLevel(newHands[pos]);
        const existingEntry = newHistory.find(h => h.position === pos && h.matchLevel === level);
        if (!existingEntry && level >= 1) {
          newHistory.push({ position: pos, matchLevel: level, round: currentRound });
        }
      });
      
      setMatchHistory(newHistory);
      
      if (winnerPos) {
        const finalRankings = calculateRankings(newHands, winnerPos, newHistory);
        setWinner(winnerPos);
        setRankings(finalRankings);
        setGamePhase('gameOver');
        
        if (shouldBroadcast && isMultiplayer && sendGameAction && isHostRef.current) {
          sendGameAction('quadmatch_game_over', {
            winner: winnerPos,
            rankings: finalRankings,
            hands: newHands
          });
        }
      } else {
        setCurrentRound(prev => prev + 1);
        setPassedInRound({ south: false, west: false, north: false, east: false });
        setCurrentTurn('south');
        setTurnPhase('selecting');
        
        if (shouldBroadcast && isMultiplayer && sendGameAction && isHostRef.current) {
          sendGameAction('quadmatch_round_complete', {
            hands: newHands,
            round: currentRound + 1
          });
        }
      }
    } else {
      setCurrentTurn(nextPlayer);
      setTurnPhase('selecting');
      
      if (shouldBroadcast && isMultiplayer && sendGameAction && isHostRef.current) {
        sendGameAction('quadmatch_turn_change', {
          currentTurn: nextPlayer,
          hands: newHands,
          passedInRound: newPassedInRound,
          passingCard: { from: fromPlayer, to: nextPlayer, card: cardToPass }
        });
      }
    }
    
    return newHands;
  }, [getNextPlayer, passedInRound, checkForWinner, matchHistory, currentRound, calculateRankings, isMultiplayer, sendGameAction]);

  const processAITurn = useCallback(async (aiPlayer: Position, currentHands: Record<Position, Card[]>) => {
    if (aiProcessingRef.current) return;
    aiProcessingRef.current = true;
    
    await delay(800);
    
    const cardIndex = calculateBestCardToPass(currentHands[aiPlayer]);
    const newHands = await executeCardPass(aiPlayer, cardIndex, currentHands);
    
    aiProcessingRef.current = false;
    
    return newHands;
  }, [calculateBestCardToPass, executeCardPass]);

  useEffect(() => {
    if (gameMode === 'offline' && gamePhase === 'playing' && turnPhase === 'selecting') {
      if (currentTurn !== 'south' && !aiProcessingRef.current) {
        processAITurn(currentTurn, hands);
      }
    }
  }, [gameMode, gamePhase, currentTurn, turnPhase, hands, processAITurn]);

  const handlePlayerPassCard = useCallback(async () => {
    if (selectedCardIndex === null) return;
    if (gameMode === 'offline' && currentTurn !== 'south') return;
    if (gameMode === 'multiplayer' && currentTurn !== myPosition) return;
    
    if (gameMode === 'multiplayer') {
      if (isHost) {
        await executeCardPass(currentTurn, selectedCardIndex, hands, true);
      } else {
        if (sendGameAction) {
          sendGameAction('quadmatch_card_passed', {
            position: myPosition,
            cardIndex: selectedCardIndex
          });
        }
      }
    } else {
      await executeCardPass(currentTurn, selectedCardIndex, hands, false);
    }
  }, [selectedCardIndex, gameMode, currentTurn, myPosition, isMultiplayer, sendGameAction, hands, executeCardPass, isHost]);

  const processGameAction = useCallback((payload: { action: string; data: any }) => {
    const { action, data } = payload;
    
    console.log(`[${myPosition}] Received action: ${action}`, data);
    
    switch (action) {
      case 'quadmatch_game_started':
        console.log(`[${myPosition}] Game started, applying hands:`, data.hands);
        setHands(data.hands);
        setPlayerNames(data.playerNames);
        setCurrentRound(1);
        setSelectedCardIndex(null);
        setWinner(null);
        setRankings([]);
        setMatchHistory([]);
        setCurrentTurn('south');
        setTurnPhase('selecting');
        setPassedInRound({ south: false, west: false, north: false, east: false });
        setGamePhase('playing');
        break;

      case 'quadmatch_card_passed':
        if (isHostRef.current && data.position !== myPosition) {
          const fromPlayer = data.position as Position;
          const cardIndex = data.cardIndex;
          
          console.log(`[HOST] Processing card pass from ${fromPlayer}, cardIndex: ${cardIndex}`);
          
          if (fromPlayer !== currentTurn) {
            console.warn(`[HOST] Rejected out-of-turn pass from ${fromPlayer}, current turn is ${currentTurn}`);
            return;
          }
          
          if (passedInRound[fromPlayer]) {
            console.warn(`[HOST] Rejected duplicate pass from ${fromPlayer}`);
            return;
          }
          
          const nextPlayer = getNextPlayer(fromPlayer);
          const cardToPass = hands[fromPlayer][cardIndex];
          
          if (!cardToPass) {
            console.warn(`[HOST] No card found at index ${cardIndex} for ${fromPlayer}`);
            return;
          }
          
          const newHands = {
            south: [...hands.south],
            west: [...hands.west],
            north: [...hands.north],
            east: [...hands.east],
          };
          newHands[fromPlayer].splice(cardIndex, 1);
          newHands[nextPlayer].push(cardToPass);
          
          const newPassedInRound = { ...passedInRound, [fromPlayer]: true };
          const allPassed = POSITIONS.every(p => newPassedInRound[p]);
          
          if (allPassed) {
            let newHistory = [...matchHistory];
            POSITIONS.forEach(pos => {
              const level = getMatchLevel(newHands[pos]);
              const existingEntry = newHistory.find(h => h.position === pos && h.matchLevel === level);
              if (!existingEntry && level >= 1) {
                newHistory.push({ position: pos, matchLevel: level, round: currentRound });
              }
            });
            setMatchHistory(newHistory);
            
            const winnerPos = checkForWinner(newHands);
            
            if (winnerPos) {
              const finalRankings = calculateRankings(newHands, winnerPos, newHistory);
              
              setHands(newHands);
              setWinner(winnerPos);
              setRankings(finalRankings);
              setPassedInRound(newPassedInRound);
              setGamePhase('gameOver');
              
              if (sendGameAction) {
                sendGameAction('quadmatch_game_over', {
                  winner: winnerPos,
                  rankings: finalRankings,
                  hands: newHands
                });
              }
            } else {
              const newRound = currentRound + 1;
              
              setHands(newHands);
              setCurrentRound(newRound);
              setPassedInRound({ south: false, west: false, north: false, east: false });
              setCurrentTurn('south');
              setTurnPhase('selecting');
              setSelectedCardIndex(null);
              
              if (sendGameAction) {
                sendGameAction('quadmatch_round_complete', {
                  hands: newHands,
                  round: newRound
                });
              }
            }
          } else {
            setHands(newHands);
            setCurrentTurn(nextPlayer);
            setPassedInRound(newPassedInRound);
            setTurnPhase('selecting');
            setSelectedCardIndex(null);
            
            if (sendGameAction) {
              console.log(`[HOST] Broadcasting turn change to ${nextPlayer}`, newHands);
              sendGameAction('quadmatch_turn_change', {
                currentTurn: nextPlayer,
                hands: newHands,
                passedInRound: newPassedInRound,
                passingCard: { from: fromPlayer, to: nextPlayer, card: cardToPass }
              });
            }
          }
        }
        break;

      case 'quadmatch_turn_change':
        console.log(`[${myPosition}] Turn change received:`, data);
        if (data.passingCard && !isHostRef.current) {
          setPassingCard(data.passingCard);
          setTurnPhase('passing');
          setTimeout(() => {
            setPassingCard(null);
            setCurrentTurn(data.currentTurn);
            setHands(data.hands);
            setPassedInRound(data.passedInRound);
            setTurnPhase('selecting');
            setSelectedCardIndex(null);
          }, 400);
        } else {
          setCurrentTurn(data.currentTurn);
          setHands(data.hands);
          setPassedInRound(data.passedInRound);
          setTurnPhase('selecting');
          setSelectedCardIndex(null);
          setPassingCard(null);
        }
        break;

      case 'quadmatch_round_complete':
        console.log(`[${myPosition}] Round complete:`, data);
        setHands(data.hands);
        setCurrentRound(data.round);
        setPassedInRound({ south: false, west: false, north: false, east: false });
        setCurrentTurn('south');
        setTurnPhase('selecting');
        setSelectedCardIndex(null);
        setPassingCard(null);
        break;

      case 'quadmatch_game_over':
        console.log(`[${myPosition}] Game over:`, data);
        setWinner(data.winner);
        setRankings(data.rankings);
        setHands(data.hands);
        setGamePhase('gameOver');
        break;

      case 'quadmatch_play_again':
        console.log(`[${myPosition}] Play again:`, data);
        setHands(data.hands);
        setCurrentRound(1);
        setSelectedCardIndex(null);
        setWinner(null);
        setRankings([]);
        setMatchHistory([]);
        setCurrentTurn('south');
        setTurnPhase('selecting');
        setPassedInRound({ south: false, west: false, north: false, east: false });
        setGamePhase('playing');
        break;
    }
  }, [myPosition, getNextPlayer, passedInRound, checkForWinner, calculateRankings, matchHistory, currentRound, sendGameAction, hands, currentTurn]);

  useEffect(() => {
    if (!isMultiplayer || !onGameAction) return;

    const handleAction = (payload: { action: string; data: any }) => {
      processGameAction(payload);
    };

    onGameAction(handleAction);
  }, [isMultiplayer, onGameAction, processGameAction]);

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
        setCurrentTurn('south');
        setTurnPhase('selecting');
        setPassedInRound({ south: false, west: false, north: false, east: false });
        setGamePhase('playing');
      }, 500);
      
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
    setCurrentTurn('south');
    setTurnPhase('selecting');
    setPassedInRound({ south: false, west: false, north: false, east: false });
    setGamePhase('playing');
  };

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
    setCurrentTurn('south');
    setTurnPhase('selecting');
    setPassedInRound({ south: false, west: false, north: false, east: false });
    setGamePhase('playing');
  };

  const newGame = () => {
    if (isMultiplayer) {
      setGamePhase('setup');
    } else {
      setGamePhase('modeSelect');
    }
    setPlayerNames(['', '', '', '']);
    setActivePreset(null);
    setNameError(null);
    autoStartTriggeredRef.current = false;
  };

  const selectGameMode = (mode: GameMode) => {
    setGameMode(mode);
    setGamePhase('setup');
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
    if (gameMode === 'offline') {
      if (position === 'south') return 'You';
      return `${POSITION_NAMES[position]} (AI)`;
    }
    return POSITION_LABELS[position];
  }, [isMultiplayer, multiplayerPlayerNames, myPosition, gameMode]);

  const isMyTurn = useCallback((): boolean => {
    if (gameMode === 'offline') {
      return currentTurn === 'south';
    }
    return currentTurn === myPosition;
  }, [gameMode, currentTurn, myPosition]);

  const getTurnStatusMessage = useCallback((): string => {
    if (turnPhase === 'passing') {
      return 'Card passing...';
    }
    
    if (isMyTurn()) {
      return 'Your turn! Select a card to pass.';
    }
    
    const currentPlayerLabel = getPositionLabel(currentTurn, false);
    return `Waiting for ${currentPlayerLabel} to pass...`;
  }, [turnPhase, isMyTurn, getPositionLabel, currentTurn]);

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
        onClick={() => isSelectable && isMyTurn() && gamePhase === 'playing' && turnPhase === 'selecting' && setSelectedCardIndex(index)}
        className={`
          relative w-full aspect-[3/4] rounded-lg flex items-center justify-center p-2 text-center
          transition-all duration-200
          ${color.bg} text-white
          ${isSelected 
            ? 'border-2 border-white ring-2 ring-white shadow-lg shadow-white/30 transform scale-105' 
            : 'border-2 border-transparent hover:border-white/50'}
          ${isSelectable && isMyTurn() && gamePhase === 'playing' && turnPhase === 'selecting' ? 'cursor-pointer' : 'cursor-default'}
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

  const renderMiniCardBack = (index: number) => {
    return (
      <div key={`back-${index}`} className="aspect-[3/4] w-8 rounded bg-gradient-to-br from-[#2a3a5a] to-[#1a2535] border border-white/10 flex items-center justify-center">
        <span className="text-white/30 text-[8px] font-bold">?</span>
      </div>
    );
  };

  const isMyPosition = (position: Position): boolean => {
    if (gameMode === 'offline') {
      return position === 'south';
    }
    return position === myPosition;
  };

  const renderTurnIndicator = (position: Position) => {
    const isCurrentTurn = currentTurn === position;
    const hasPassed = passedInRound[position];
    
    if (hasPassed) {
      return (
        <div className="flex items-center gap-1 text-green-400 text-xs">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>Passed</span>
        </div>
      );
    }
    
    if (isCurrentTurn) {
      return (
        <div className="flex items-center gap-1 text-yellow-400 text-xs animate-pulse">
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          <span>Current Turn</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 text-gray-500 text-xs">
        <span className="material-symbols-outlined text-sm">hourglass_empty</span>
        <span>Waiting</span>
      </div>
    );
  };

  if (gamePhase === 'modeSelect') {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#101622] p-4">
        {showQuitConfirm && <QuitConfirmationPopup />}
        <div className="w-full max-w-md mx-auto">
          {onExit && (
            <div className="absolute top-4 left-4">
              <button onClick={handleQuitClick} className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
            </div>
          )}
          
          <div className="text-center mb-12">
            <h1 className="text-white tracking-light text-[32px] font-bold leading-tight mb-2">QuadMatch Royale</h1>
            <p className="text-gray-400 text-base">Choose your game mode</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => selectGameMode('offline')}
              className="w-full p-6 rounded-2xl bg-gradient-to-br from-[#2b6cee] to-[#1e40af] hover:from-[#3b7cf8] hover:to-[#2b6cee] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-16 rounded-xl bg-white/20">
                  <span className="material-symbols-outlined text-4xl text-white">smart_toy</span>
                </div>
                <div className="text-left">
                  <h3 className="text-white text-xl font-bold">Play with AI</h3>
                  <p className="text-white/70 text-sm mt-1">You vs 3 AI opponents</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                if (onExit) {
                  onExit();
                }
              }}
              className="w-full p-6 rounded-2xl bg-gradient-to-br from-[#065f46] to-[#064e3b] hover:from-[#059669] hover:to-[#065f46] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-16 rounded-xl bg-white/20">
                  <span className="material-symbols-outlined text-4xl text-white">group</span>
                </div>
                <div className="text-left">
                  <h3 className="text-white text-xl font-bold">Multiplayer Online</h3>
                  <p className="text-white/70 text-sm mt-1">Play with 4 real players</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <button onClick={() => isMultiplayer ? handleQuitClick() : setGamePhase('modeSelect')} className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
              <div className="flex-1" />
            </div>
          )}
          
          <div className="text-center pt-8 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${gameMode === 'offline' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                {gameMode === 'offline' ? 'Offline with AI' : 'Multiplayer'}
              </span>
            </div>
            <h1 className="text-white tracking-light text-[32px] font-bold leading-tight">QuadMatch Royale</h1>
            <p className="text-gray-400 text-base font-normal leading-normal pt-2">Enter four names to create the card sets for your game.</p>
          </div>

          <div className="py-4">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">Create Your Card Sets</h2>
            <div className="flex flex-col gap-4">
              {playerNames.map((name, index) => (
                <label key={index} className="flex flex-col">
                  <p className="text-white text-base font-medium leading-normal pb-2">Card Set {index + 1}</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    placeholder={`Enter name...`}
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-0 border border-[#394760] bg-[#1a2535] focus:border-[#394760] h-14 placeholder:text-[#6b7a94] p-[15px] text-base font-normal leading-normal"
                  />
                </label>
              ))}
            </div>
            {nameError && (
              <p className="text-red-400 text-sm mt-2">{nameError}</p>
            )}
          </div>

          <div className="py-4">
            <h2 className="text-white text-lg font-bold pb-2">Quick Presets</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    activePreset === key 
                      ? 'bg-[#2b6cee] border-[#2b6cee] text-white' 
                      : 'border-[#394760] text-gray-300 hover:bg-[#1a2535]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{theme.icon}</span>
                  <span className="capitalize text-sm font-medium">{key}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 pb-8">
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full h-14 rounded-xl text-white text-lg font-bold transition-all ${
                canStart 
                  ? 'bg-[#2b6cee] hover:bg-[#3b7cf8] cursor-pointer' 
                  : 'bg-[#394760] cursor-not-allowed opacity-50'
              }`}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'playing' || gamePhase === 'passing') {
    const myHand = gameMode === 'offline' ? hands.south : hands[myPosition];
    const canPassCard = isMyTurn() && selectedCardIndex !== null && turnPhase === 'selecting';

    const getDisplayPosition = (displayPos: Position): Position => {
      if (gameMode === 'offline') return displayPos;
      return getRotatedPosition(displayPos, myPosition);
    };

    const northPos = getDisplayPosition('north');
    const westPos = getDisplayPosition('west');
    const eastPos = getDisplayPosition('east');
    const southPos = getDisplayPosition('south');

    return (
      <div className="relative flex min-h-screen w-full flex-col bg-[#101622] p-2 sm:p-4">
        {showQuitConfirm && <QuitConfirmationPopup />}
        
        <div className="flex items-center justify-between mb-2">
          {onExit && (
            <button onClick={handleQuitClick} className="flex size-10 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${gameMode === 'offline' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
              {gameMode === 'offline' ? 'AI Mode' : 'Online'}
            </span>
            <div className="bg-[#1a2535] rounded-full px-3 py-1">
              <span className="text-white text-sm font-medium">Round {currentRound}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full">
          <div className="flex flex-col items-center py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400 text-xs font-medium">{getPositionLabel(northPos, false)}</span>
              {renderTurnIndicator(northPos)}
            </div>
            <div className="flex gap-1">
              {hands[northPos].map((card, idx) => (
                <div key={`north-${idx}`} className="w-8">
                  {isMyPosition(northPos) ? renderMiniCard(card, idx) : renderMiniCardBack(idx)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-400 text-xs font-medium">{getPositionLabel(westPos, false)}</span>
              </div>
              {renderTurnIndicator(westPos)}
              <div className="flex gap-1 mt-1">
                {hands[westPos].map((card, idx) => (
                  <div key={`west-${idx}`} className="w-6 sm:w-8">
                    {isMyPosition(westPos) ? renderMiniCard(card, idx) : renderMiniCardBack(idx)}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <div className={`text-center p-3 rounded-xl ${isMyTurn() ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-white/5'}`}>
                <p className={`text-sm font-medium ${isMyTurn() ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {getTurnStatusMessage()}
                </p>
              </div>
              {passingCard && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-400 animate-pulse">
                  <span>{getPositionLabel(passingCard.from, false)}</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  <span>{getPositionLabel(passingCard.to, false)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-400 text-xs font-medium">{getPositionLabel(eastPos, false)}</span>
              </div>
              {renderTurnIndicator(eastPos)}
              <div className="flex gap-1 mt-1">
                {hands[eastPos].map((card, idx) => (
                  <div key={`east-${idx}`} className="w-6 sm:w-8">
                    {isMyPosition(eastPos) ? renderMiniCard(card, idx) : renderMiniCardBack(idx)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-lg font-bold">{gameMode === 'offline' ? 'You' : 'You'}</span>
              {renderTurnIndicator(southPos)}
            </div>
            <div className="flex gap-2 sm:gap-3 justify-center">
              {myHand.map((card, idx) => (
                <div key={`my-${idx}`} className="w-16 sm:w-20">
                  {renderCard(card, idx, true, selectedCardIndex === idx)}
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {myHand.length} cards in hand
            </p>
          </div>

          <div className="py-4">
            <button
              onClick={handlePlayerPassCard}
              disabled={!canPassCard}
              className={`w-full h-12 rounded-xl text-white font-bold transition-all ${
                canPassCard 
                  ? 'bg-[#2b6cee] hover:bg-[#3b7cf8]' 
                  : 'bg-[#394760] opacity-50 cursor-not-allowed'
              }`}
            >
              {isMyTurn() 
                ? (selectedCardIndex !== null ? 'Pass Card' : 'Select a Card') 
                : 'Waiting for Turn...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'gameOver') {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center bg-[#101622] overflow-x-hidden p-4">
        {showQuitConfirm && <QuitConfirmationPopup />}
        <div className="w-full max-w-md mx-auto">
          <div className="text-center pt-8 pb-6">
            <span className="material-symbols-outlined text-6xl text-yellow-400 mb-4">emoji_events</span>
            <h1 className="text-white text-3xl font-bold mb-2">Game Over!</h1>
            <p className="text-gray-400">
              {getPositionLabel(winner!, false)} wins with 4-of-a-kind in Round {currentRound}!
            </p>
          </div>

          <div className="py-4">
            <h2 className="text-white text-xl font-bold mb-4 text-center">Final Rankings</h2>
            <div className="flex flex-col gap-3">
              {rankings.map((ranking, idx) => (
                <div 
                  key={ranking.position}
                  className={`p-4 rounded-xl border ${
                    idx === 0 
                      ? 'bg-yellow-500/10 border-yellow-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${idx === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        #{ranking.place}
                      </span>
                      <span className="text-white font-semibold">
                        {getPositionLabel(ranking.position, false)}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${
                      ranking.matchLevel === 4 ? 'text-yellow-400' :
                      ranking.matchLevel === 3 ? 'text-blue-400' :
                      ranking.matchLevel === 2 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {ranking.matchType}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {ranking.hand.map((card, cardIdx) => (
                      <div key={cardIdx} className="w-10">
                        {renderMiniCard(card, cardIdx)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 pb-8">
            <button
              onClick={playAgain}
              className="w-full h-14 rounded-xl bg-[#2b6cee] hover:bg-[#3b7cf8] text-white text-lg font-bold transition-all"
            >
              Play Again
            </button>
            <button
              onClick={newGame}
              className="w-full h-14 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition-all"
            >
              New Game
            </button>
            {onExit && (
              <button
                onClick={handleQuitClick}
                className="w-full h-14 rounded-xl border border-white/20 hover:bg-white/5 text-gray-400 text-lg font-medium transition-all"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuadMatchRoyale;
