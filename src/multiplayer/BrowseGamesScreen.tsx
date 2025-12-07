import React, { useState, useEffect } from 'react';
import { RoomInfo } from './types';

interface BrowseGamesScreenProps {
  rooms: RoomInfo[];
  onRefresh: () => void;
  onJoinRoom: (playerName: string, roomId: string) => void;
  onBack: () => void;
  isConnected: boolean;
  error: string | null;
}

const BrowseGamesScreen: React.FC<BrowseGamesScreenProps> = ({
  rooms,
  onRefresh,
  onJoinRoom,
  onBack,
  isConnected,
  error,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'starting'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isConnected) {
      onRefresh();
    }
  }, [isConnected, onRefresh]);

  const filteredRooms = rooms.filter(room => {
    if (filter === 'waiting' && room.status !== 'waiting') return false;
    if (filter === 'starting' && room.status !== 'starting') return false;
    if (searchQuery && !room.hostName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleJoin = (roomId: string) => {
    if (playerName.trim().length >= 2) {
      onJoinRoom(playerName.trim(), roomId);
    } else {
      setSelectedRoomId(roomId);
    }
  };

  const confirmJoin = () => {
    if (selectedRoomId && playerName.trim().length >= 2) {
      onJoinRoom(playerName.trim(), selectedRoomId);
      setSelectedRoomId(null);
    }
  };

  const getStatusBadge = (status: string, playerCount: number, maxPlayers: number) => {
    if (playerCount >= maxPlayers) {
      return (
        <div className="flex items-center justify-center rounded-full bg-zinc-500/20 h-8 px-3">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Full</p>
        </div>
      );
    }
    if (status === 'waiting') {
      return (
        <div className="flex items-center justify-center rounded-full bg-green-500/20 h-8 px-3">
          <p className="text-green-500 text-xs font-medium uppercase tracking-wider">Waiting</p>
        </div>
      );
    }
    if (status === 'starting') {
      return (
        <div className="flex items-center justify-center rounded-full bg-orange-500/20 h-8 px-3">
          <p className="text-orange-500 text-xs font-medium uppercase tracking-wider">Starting Soon</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-x-hidden">
      <div className="flex items-center bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-white flex size-12 shrink-0 items-center justify-start -ml-3 hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Public Games</h2>
        <button
          onClick={onRefresh}
          className="flex size-12 shrink-0 items-center justify-end hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl text-white">refresh</span>
        </button>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <label className="flex flex-col min-w-40 h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
            <div className="text-zinc-400 flex border-r-0 bg-zinc-800 items-center justify-center pl-4 rounded-l-lg">
              <span className="material-symbols-outlined text-2xl">search</span>
            </div>
            <input
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-white focus:outline-0 focus:ring-0 border-none bg-zinc-800 h-full placeholder:text-zinc-400 px-4 pl-2 text-base font-normal leading-normal"
              placeholder="Search by host name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </label>
      </div>

      <div className="flex gap-3 px-4 pt-1 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-4 pr-4 transition-colors ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          <p className="text-sm font-medium leading-normal">All</p>
        </button>
        <button
          onClick={() => setFilter('waiting')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-4 pr-4 transition-colors ${
            filter === 'waiting' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          <p className="text-sm font-medium leading-normal">Waiting</p>
        </button>
        <button
          onClick={() => setFilter('starting')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-4 pr-4 transition-colors ${
            filter === 'starting' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          <p className="text-sm font-medium leading-normal">Starting Soon</p>
        </button>
      </div>

      {!isConnected && (
        <div className="px-4 py-8 flex items-center justify-center gap-2 text-yellow-400">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <p className="text-sm">Connecting to server...</p>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 flex items-start gap-4 rounded-xl bg-red-500/20 p-4">
          <div className="shrink-0 text-red-400 pt-1">
            <span className="material-symbols-outlined">error</span>
          </div>
          <p className="text-sm font-normal leading-relaxed text-red-300">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        {filteredRooms.length === 0 && isConnected && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-5xl text-zinc-600 mb-4">sports_esports</span>
            <p className="text-zinc-400 text-base">No public games available</p>
            <p className="text-zinc-500 text-sm mt-1">Try creating your own game!</p>
          </div>
        )}

        {filteredRooms.map((room) => {
          const isFull = room.playerCount >= room.maxPlayers;
          return (
            <div
              key={room.id}
              className={`flex flex-col gap-4 bg-zinc-800/50 p-4 rounded-xl ${isFull ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-primary to-purple-600 rounded-full h-12 w-12 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">person</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-white text-base font-semibold leading-normal line-clamp-1">{room.hostName}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-zinc-400">group</span>
                      <p className="text-zinc-400 text-sm font-normal leading-normal line-clamp-2">
                        {room.playerCount}/{room.maxPlayers} Players
                      </p>
                    </div>
                  </div>
                </div>
                {getStatusBadge(room.status, room.playerCount, room.maxPlayers)}
              </div>
              <button
                onClick={() => handleJoin(room.id)}
                disabled={isFull}
                className={`flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-4 text-base font-semibold leading-normal transition-all ${
                  isFull
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
                }`}
              >
                <span className="truncate">Join Game</span>
              </button>
            </div>
          );
        })}
      </div>

      {selectedRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Enter Your Name</h3>
            <input
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-zinc-700 bg-zinc-800 focus:border-primary h-14 placeholder:text-zinc-500 p-[15px] text-base font-normal leading-normal mb-4"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRoomId(null)}
                className="flex-1 h-12 rounded-xl bg-zinc-700 text-white font-bold hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmJoin}
                disabled={playerName.trim().length < 2}
                className={`flex-1 h-12 rounded-xl font-bold transition-all ${
                  playerName.trim().length >= 2
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                }`}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseGamesScreen;
