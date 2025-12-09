import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface Player {
  id: string;
  name: string;
  socket: WebSocket;
  isHost: boolean;
  isReady: boolean;
}

type Position = 'south' | 'west' | 'north' | 'east';
const POSITION_ORDER: Position[] = ['south', 'west', 'north', 'east'];

interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  players: Player[];
  maxPlayers: number;
  isPublic: boolean;
  aiCount: number;
  gameMode: string;
  deckTheme: string;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  gameState: any;
  createdAt: Date;
  playerPositions: Map<string, Position>;
}

const rooms: Map<string, GameRoom> = new Map();
const playerSockets: Map<WebSocket, { playerId: string; roomId: string | null }> = new Map();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePlayerId(): string {
  return uuidv4().substring(0, 8);
}

function broadcastToRoom(roomId: string, message: any, excludePlayerId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.id !== excludePlayerId && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(messageStr);
    }
  });
}

function sendToPlayer(socket: WebSocket, message: any) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function getRoomInfo(room: GameRoom) {
  const playerPositionsObj: Record<string, Position> = {};
  room.playerPositions.forEach((pos, id) => {
    playerPositionsObj[id] = pos;
  });
  
  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    hostName: room.hostName,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      position: room.playerPositions.get(p.id),
    })),
    maxPlayers: room.maxPlayers,
    isPublic: room.isPublic,
    aiCount: room.aiCount,
    gameMode: room.gameMode,
    deckTheme: room.deckTheme,
    status: room.status,
    playerCount: room.players.length,
    playerPositions: playerPositionsObj,
  };
}

function getPublicRooms() {
  const publicRooms: any[] = [];
  rooms.forEach(room => {
    if (room.isPublic && room.status === 'waiting' && room.players.length < room.maxPlayers) {
      publicRooms.push(getRoomInfo(room));
    }
  });
  return publicRooms;
}

function removePlayerFromRoom(playerId: string, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const wasHost = room.players[playerIndex].isHost;
  room.players.splice(playerIndex, 1);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    console.log(`Room ${room.code} deleted - no players left`);
  } else {
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
      room.hostName = room.players[0].name;
    }
    broadcastToRoom(roomId, {
      type: 'player_left',
      playerId,
      room: getRoomInfo(room),
    });
  }
}

wss.on('connection', (socket) => {
  const playerId = generatePlayerId();
  playerSockets.set(socket, { playerId, roomId: null });
  console.log(`Player connected: ${playerId}`);

  sendToPlayer(socket, { type: 'connected', playerId });

  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const playerInfo = playerSockets.get(socket);
      if (!playerInfo) return;

      switch (message.type) {
        case 'create_room': {
          const code = generateRoomCode();
          const roomId = uuidv4();
          const playerPositions = new Map<string, Position>();
          playerPositions.set(playerId, 'south');
          
          const room: GameRoom = {
            id: roomId,
            code,
            hostId: playerId,
            hostName: message.playerName,
            players: [{
              id: playerId,
              name: message.playerName,
              socket,
              isHost: true,
              isReady: true,
            }],
            maxPlayers: message.maxPlayers ?? 4,
            isPublic: message.isPublic ?? false,
            aiCount: message.aiCount ?? 0,
            gameMode: message.gameMode ?? 'classic',
            deckTheme: message.deckTheme ?? 'default',
            status: 'waiting',
            gameState: null,
            createdAt: new Date(),
            playerPositions,
          };

          rooms.set(roomId, room);
          playerInfo.roomId = roomId;

          sendToPlayer(socket, {
            type: 'room_created',
            room: getRoomInfo(room),
          });

          console.log(`Room created: ${code} by ${message.playerName}`);
          break;
        }

        case 'join_room': {
          let room: GameRoom | undefined;
          
          if (message.roomCode) {
            rooms.forEach(r => {
              if (r.code.toUpperCase() === message.roomCode.toUpperCase()) {
                room = r;
              }
            });
          } else if (message.roomId) {
            room = rooms.get(message.roomId);
          }

          if (!room) {
            sendToPlayer(socket, {
              type: 'error',
              error: 'Room not found',
            });
            break;
          }

          if (room.players.length >= room.maxPlayers) {
            sendToPlayer(socket, {
              type: 'error',
              error: 'Room is full',
            });
            break;
          }

          if (room.status !== 'waiting') {
            sendToPlayer(socket, {
              type: 'error',
              error: 'Game already in progress',
            });
            break;
          }

          const player: Player = {
            id: playerId,
            name: message.playerName,
            socket,
            isHost: false,
            isReady: false,
          };

          const nextPosition = POSITION_ORDER[room.players.length];
          room.playerPositions.set(playerId, nextPosition);
          
          room.players.push(player);
          playerInfo.roomId = room.id;

          broadcastToRoom(room.id, {
            type: 'player_joined',
            player: { id: player.id, name: player.name, isHost: false, isReady: false },
            room: getRoomInfo(room),
          }, playerId);

          sendToPlayer(socket, {
            type: 'joined_room',
            room: getRoomInfo(room),
          });

          console.log(`Player ${message.playerName} joined room ${room.code}`);
          break;
        }

        case 'leave_room': {
          if (playerInfo.roomId) {
            removePlayerFromRoom(playerId, playerInfo.roomId);
            playerInfo.roomId = null;
            sendToPlayer(socket, { type: 'left_room' });
          }
          break;
        }

        case 'get_public_rooms': {
          sendToPlayer(socket, {
            type: 'public_rooms',
            rooms: getPublicRooms(),
          });
          break;
        }

        case 'toggle_ready': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room) break;

          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.isReady = !player.isReady;
            broadcastToRoom(room.id, {
              type: 'player_ready_changed',
              playerId,
              isReady: player.isReady,
              room: getRoomInfo(room),
            });
          }
          break;
        }

        case 'start_game': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room) break;

          if (room.hostId !== playerId) {
            sendToPlayer(socket, { type: 'error', error: 'Only host can start the game' });
            break;
          }

          const allReady = room.players.every(p => p.isReady);
          if (!allReady && room.players.length > 1) {
            sendToPlayer(socket, { type: 'error', error: 'Not all players are ready' });
            break;
          }

          if (room.players.length + room.aiCount < 2) {
            sendToPlayer(socket, { type: 'error', error: 'Need at least 2 players to start' });
            break;
          }

          room.status = 'playing';
          broadcastToRoom(room.id, {
            type: 'game_started',
            room: getRoomInfo(room),
          });

          console.log(`Game started in room ${room.code}`);
          break;
        }

        case 'game_action': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room || room.status !== 'playing') break;

          const senderPosition = room.playerPositions.get(playerId);
          
          const stateUpdateActions = [
            'quadmatch_game_started',
            'quadmatch_turn_change',
            'quadmatch_round_complete',
            'quadmatch_game_over',
            'quadmatch_play_again',
            'quadmatch_full_state_sync'
          ];
          
          if (stateUpdateActions.includes(message.action)) {
            room.players.forEach(player => {
              if (player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(JSON.stringify({
                  type: 'game_action',
                  playerId,
                  senderPosition,
                  action: message.action,
                  data: message.data,
                }));
              }
            });
          } else {
            broadcastToRoom(room.id, {
              type: 'game_action',
              playerId,
              senderPosition,
              action: message.action,
              data: message.data,
            }, playerId);
          }
          break;
        }

        case 'update_game_state': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room) break;

          room.gameState = message.gameState;
          broadcastToRoom(room.id, {
            type: 'game_state_updated',
            gameState: message.gameState,
          }, playerId);
          break;
        }

        case 'end_game': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room) break;

          room.status = 'finished';
          broadcastToRoom(room.id, {
            type: 'game_ended',
            results: message.results,
          });
          break;
        }

        case 'chat': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room) break;

          broadcastToRoom(room.id, {
            type: 'chat',
            playerId,
            playerName: message.playerName,
            message: message.message,
          });
          break;
        }

        case 'update_settings': {
          if (!playerInfo.roomId) break;
          const room = rooms.get(playerInfo.roomId);
          if (!room || room.hostId !== playerId) break;

          if (message.isPublic !== undefined) room.isPublic = message.isPublic;
          if (message.aiCount !== undefined) room.aiCount = message.aiCount;
          if (message.gameMode !== undefined) room.gameMode = message.gameMode;
          if (message.deckTheme !== undefined) room.deckTheme = message.deckTheme;

          broadcastToRoom(room.id, {
            type: 'settings_updated',
            room: getRoomInfo(room),
          });
          break;
        }

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  socket.on('close', () => {
    const playerInfo = playerSockets.get(socket);
    if (playerInfo) {
      if (playerInfo.roomId) {
        removePlayerFromRoom(playerInfo.playerId, playerInfo.roomId);
      }
      playerSockets.delete(socket);
      console.log(`Player disconnected: ${playerInfo.playerId}`);
    }
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

app.use(express.json());

app.post('/api/ai/card-suggestion', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { hand, playerPosition, gameContext } = req.body;
    if (!hand || !Array.isArray(hand)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const handDescription = hand.map((card: any, idx: number) => `${idx}: ${card.name}`).join(", ");
    
    const prompt = `You are an expert card game AI for QuadMatch Royale.
The goal is to collect 4 cards of the same type (4-of-a-kind).
You must select one card to pass to the next player.

Strategy:
- Keep cards you have multiples of (pairs, triples)
- Pass cards you only have one of (singletons)

Your hand: [${handDescription}]
Position: ${playerPosition || 'unknown'}
${gameContext ? `Context: ${gameContext}` : ""}

Which card index (0-${hand.length - 1}) should you pass? Respond with JSON:
{"cardIndex": number, "reasoning": "brief explanation"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return res.json(data);
    }
    
    return res.json(getFallbackSuggestion(hand));
  } catch (error) {
    console.error('AI suggestion error:', error);
    return res.json(getFallbackSuggestion(req.body?.hand || []));
  }
});

function getFallbackSuggestion(hand: { name: string }[]): { cardIndex: number; reasoning: string } {
  if (!hand || hand.length === 0) {
    return { cardIndex: 0, reasoning: "No hand provided" };
  }
  
  const counts: Record<string, number> = {};
  hand.forEach(card => {
    counts[card.name] = (counts[card.name] || 0) + 1;
  });

  const hasThreeOrMore = Object.entries(counts).find(([_, count]) => count >= 3);
  if (hasThreeOrMore) {
    const [threeName] = hasThreeOrMore;
    const singletonIdx = hand.findIndex(card => card.name !== threeName);
    if (singletonIdx !== -1) {
      return { cardIndex: singletonIdx, reasoning: "Keeping triple, passing singleton" };
    }
  }

  const hasPair = Object.entries(counts).find(([_, count]) => count >= 2);
  if (hasPair) {
    const [pairName] = hasPair;
    const nonPairIdx = hand.findIndex(card => card.name !== pairName);
    if (nonPairIdx !== -1) {
      return { cardIndex: nonPairIdx, reasoning: "Keeping pair, passing non-pair" };
    }
  }

  return { cardIndex: 0, reasoning: "No matches, passing first card" };
}

app.get('/api/ai/status', (req, res) => {
  res.json({ 
    configured: !!process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash'
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game server running on port ${PORT}`);
});
