import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomInfo, ServerMessage, MultiplayerState } from './types';

export function useWebSocket() {
  const [state, setState] = useState<MultiplayerState>({
    mode: null,
    option: null,
    room: null,
    playerId: null,
    playerName: '',
    isConnected: false,
    error: null,
  });
  
  const [publicRooms, setPublicRooms] = useState<RoomInfo[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      console.log('WebSocket connected');
    };

    socket.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }));
      console.log('WebSocket disconnected');
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (state.mode === 'online') {
          connect();
        }
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setState(prev => ({ ...prev, error: 'Connection error' }));
    };

    socket.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }, [state.mode]);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'connected':
        setState(prev => ({ ...prev, playerId: message.playerId }));
        break;

      case 'room_created':
      case 'joined_room':
        setState(prev => ({ ...prev, room: message.room, error: null }));
        break;

      case 'left_room':
        setState(prev => ({ ...prev, room: null }));
        break;

      case 'player_joined':
      case 'player_left':
      case 'player_ready_changed':
      case 'settings_updated':
        setState(prev => ({ ...prev, room: message.room }));
        break;

      case 'game_started':
        setState(prev => ({ 
          ...prev, 
          room: { ...prev.room!, status: 'playing' } 
        }));
        break;

      case 'public_rooms':
        setPublicRooms(message.rooms);
        break;

      case 'error':
        setState(prev => ({ ...prev, error: message.error }));
        break;

      default:
        break;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      room: null,
      playerId: null,
    }));
  }, []);

  const send = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const createRoom = useCallback((playerName: string, isPublic: boolean, aiCount: number, gameMode: string, deckTheme: string, maxPlayers: number = 4) => {
    setState(prev => ({ ...prev, playerName }));
    send({
      type: 'create_room',
      playerName,
      isPublic,
      aiCount,
      gameMode,
      deckTheme,
      maxPlayers,
    });
  }, [send]);

  const joinRoom = useCallback((playerName: string, roomCode?: string, roomId?: string) => {
    setState(prev => ({ ...prev, playerName }));
    send({
      type: 'join_room',
      playerName,
      roomCode,
      roomId,
    });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'leave_room' });
  }, [send]);

  const getPublicRooms = useCallback(() => {
    send({ type: 'get_public_rooms' });
  }, [send]);

  const toggleReady = useCallback(() => {
    send({ type: 'toggle_ready' });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'start_game' });
  }, [send]);

  const sendGameAction = useCallback((action: string, data: any) => {
    send({ type: 'game_action', action, data });
  }, [send]);

  const updateGameState = useCallback((gameState: any) => {
    send({ type: 'update_game_state', gameState });
  }, [send]);

  const updateSettings = useCallback((settings: any) => {
    send({ type: 'update_settings', ...settings });
  }, [send]);

  const setMode = useCallback((mode: 'offline' | 'online' | null) => {
    setState(prev => ({ ...prev, mode, option: null, room: null }));
    if (mode === 'online') {
      connect();
    } else {
      disconnect();
    }
  }, [connect, disconnect]);

  const setOption = useCallback((option: 'host' | 'join' | 'browse' | null) => {
    setState(prev => ({ ...prev, option }));
  }, []);

  const setPlayerName = useCallback((playerName: string) => {
    setState(prev => ({ ...prev, playerName }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    publicRooms,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    getPublicRooms,
    toggleReady,
    startGame,
    sendGameAction,
    updateGameState,
    updateSettings,
    setMode,
    setOption,
    setPlayerName,
    clearError,
  };
}
