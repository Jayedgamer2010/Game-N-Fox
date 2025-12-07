import React, { useState } from 'react';
import { RoomInfo } from './types';

interface GameLobbyScreenProps {
  room: RoomInfo;
  playerId: string;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onUpdateSettings: (settings: any) => void;
  error: string | null;
  backgroundImage?: string;
}

const GameLobbyScreen: React.FC<GameLobbyScreenProps> = ({
  room,
  playerId,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onUpdateSettings,
  error,
  backgroundImage,
}) => {
  const [showCode, setShowCode] = useState(true);
  const [copied, setCopied] = useState(false);

  const isHost = room.hostId === playerId;
  const currentPlayer = room.players.find(p => p.id === playerId);
  const allReady = room.players.every(p => p.isReady);
  const hasEnoughPlayers = room.players.length + room.aiCount >= 2;
  const canStart = isHost && allReady && hasEnoughPlayers;
  const maxPlayers = room.maxPlayers;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const allPositions = ['South', 'West', 'North', 'East'];
  const positions = allPositions.slice(0, maxPlayers);

  return (
    <div 
      className="relative flex min-h-screen w-full flex-col bg-background-dark bg-cover bg-center bg-fixed"
      style={backgroundImage ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%), url(${backgroundImage})` } : undefined}
    >
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <button
          onClick={onLeaveRoom}
          className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Game Lobby</h1>
        <div className="size-12 shrink-0"></div>
      </div>

      <main className="flex-grow px-4 pb-32">
        <div className="bg-primary/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Game Code</p>
            <button
              onClick={() => setShowCode(!showCode)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {showCode ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold tracking-[0.3em] text-white font-mono">
              {showCode ? room.code : '••••••'}
            </p>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/30 text-white hover:bg-primary/40 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-zinc-400 text-sm mt-3">Share this code with friends to invite them</p>
        </div>

        <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] pb-4">
          Players ({room.players.length + room.aiCount}/{room.maxPlayers})
        </h2>

        <div className="space-y-3 mb-6">
          {positions.map((position, index) => {
            const player = room.players[index];
            const isAiSlot = !player && index < room.players.length + room.aiCount;
            const isEmpty = !player && !isAiSlot;

            return (
              <div
                key={position}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
                  player ? 'bg-zinc-800/60' : isAiSlot ? 'bg-zinc-800/40' : 'bg-zinc-800/20'
                }`}
              >
                <div className={`flex items-center justify-center rounded-full size-12 ${
                  player ? 'bg-primary' : isAiSlot ? 'bg-purple-600' : 'bg-zinc-700'
                }`}>
                  {player ? (
                    <span className="material-symbols-outlined text-white">person</span>
                  ) : isAiSlot ? (
                    <span className="material-symbols-outlined text-white">smart_toy</span>
                  ) : (
                    <span className="material-symbols-outlined text-zinc-500">person_add</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-medium ${player || isAiSlot ? 'text-white' : 'text-zinc-500'}`}>
                      {player ? player.name : isAiSlot ? `AI Bot ${index + 1}` : 'Waiting...'}
                    </p>
                    {player?.isHost && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                        HOST
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm">{position}</p>
                </div>

                {player && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                    player.isReady ? 'bg-green-500/20' : 'bg-zinc-700'
                  }`}>
                    {player.isReady ? (
                      <>
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        <span className="text-green-500 text-xs font-medium">Ready</span>
                      </>
                    ) : (
                      <span className="text-zinc-400 text-xs font-medium">Not Ready</span>
                    )}
                  </div>
                )}

                {isAiSlot && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20">
                    <span className="material-symbols-outlined text-purple-400 text-sm">smart_toy</span>
                    <span className="text-purple-400 text-xs font-medium">AI</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isHost && (
          <div className="bg-zinc-800/40 rounded-xl p-4 mb-6">
            <h3 className="text-white font-bold mb-3">Host Controls</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">AI Players</p>
                <p className="text-zinc-400 text-xs">Fill empty slots</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateSettings({ aiCount: Math.max(0, room.aiCount - 1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-600"
                >
                  -
                </button>
                <span className="text-white w-6 text-center">{room.aiCount}</span>
                <button
                  onClick={() => onUpdateSettings({ aiCount: Math.min(maxPlayers - room.players.length, room.aiCount + 1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/80"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-4 rounded-xl bg-red-500/20 p-4 mb-4">
            <div className="shrink-0 text-red-400 pt-1">
              <span className="material-symbols-outlined">error</span>
            </div>
            <p className="text-sm font-normal leading-relaxed text-red-300">{error}</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background-dark via-background-dark to-transparent p-4 pb-6 space-y-3">
        {!isHost && (
          <button
            onClick={onToggleReady}
            className={`flex h-14 w-full items-center justify-center rounded-xl text-base font-bold leading-normal transition-all ${
              currentPlayer?.isReady
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-green-600 text-white shadow-[0_4px_14px_rgba(34,197,94,0.4)] hover:bg-green-500'
            }`}
          >
            {currentPlayer?.isReady ? 'Cancel Ready' : "I'm Ready!"}
          </button>
        )}

        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`flex h-14 w-full items-center justify-center rounded-xl text-base font-bold leading-normal transition-all ${
              canStart
                ? 'bg-primary text-white shadow-[0_4px_14px_rgba(43,108,238,0.4)] hover:bg-primary/90 active:scale-[0.98]'
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {!hasEnoughPlayers
              ? 'Need more players'
              : !allReady
              ? 'Waiting for players...'
              : 'Start Game'}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameLobbyScreen;
