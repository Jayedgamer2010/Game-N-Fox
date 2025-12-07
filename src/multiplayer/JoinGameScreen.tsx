import React, { useState } from 'react';

interface JoinGameScreenProps {
  onJoinGame: (playerName: string, roomCode: string) => void;
  onBrowseGames: () => void;
  onBack: () => void;
  isConnected: boolean;
  error: string | null;
}

const JoinGameScreen: React.FC<JoinGameScreenProps> = ({
  onJoinGame,
  onBrowseGames,
  onBack,
  isConnected,
  error,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');

  const canJoin = playerName.trim().length >= 2 && gameCode.trim().length >= 4 && isConnected;

  const handleJoin = () => {
    if (canJoin) {
      onJoinGame(playerName.trim(), gameCode.trim().toUpperCase());
    }
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setGameCode(cleaned.slice(0, 6));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-hidden">
      <div className="flex items-center p-4 pb-2 justify-between bg-background-dark">
        <button
          onClick={onBack}
          className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-white -ml-12">Join Game</h2>
      </div>

      <main className="flex flex-1 flex-col justify-between p-4">
        <div className="flex-grow">
          <p className="text-zinc-400 text-base font-normal leading-normal pb-6 pt-2 text-center">
            Enter your name and the code shared by your friend.
          </p>

          <div className="flex w-full flex-wrap items-end gap-4 mb-4">
            <label className="flex flex-col w-full flex-1">
              <p className="text-white text-sm font-medium leading-normal pb-2">YOUR NAME</p>
              <div className="flex w-full flex-1 items-stretch rounded-xl border border-zinc-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 bg-zinc-800">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-0 border-0 bg-transparent h-14 placeholder:text-zinc-500 px-4 text-base font-normal leading-normal"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                />
              </div>
            </label>
          </div>

          <div className="flex w-full flex-wrap items-end gap-4">
            <label className="flex flex-col w-full flex-1">
              <p className="text-white text-sm font-medium leading-normal pb-2">GAME CODE</p>
              <div className="flex w-full flex-1 items-stretch rounded-xl border border-zinc-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 bg-zinc-800">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-xl text-white focus:outline-0 focus:ring-0 border-0 bg-transparent h-14 placeholder:text-zinc-500 px-4 text-base font-normal leading-normal tracking-widest uppercase"
                  placeholder="XXXXXX"
                  value={gameCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  maxLength={6}
                />
                {gameCode && (
                  <div className="text-zinc-400 flex bg-transparent items-center justify-center pr-4 rounded-r-xl">
                    <button onClick={() => setGameCode('')}>
                      <span className="material-symbols-outlined cursor-pointer hover:text-white transition-colors">cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-4 rounded-xl bg-red-500/20 p-4">
              <div className="shrink-0 text-red-400 pt-1">
                <span className="material-symbols-outlined">error</span>
              </div>
              <p className="text-sm font-normal leading-relaxed text-red-300">{error}</p>
            </div>
          )}

          {!isConnected && (
            <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400">
              <span className="material-symbols-outlined animate-spin">sync</span>
              <p className="text-sm">Connecting to server...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex w-full">
            <button
              onClick={handleJoin}
              disabled={!canJoin}
              className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 text-base font-bold leading-normal tracking-[0.015em] transition-all ${
                canJoin
                  ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <span className="truncate">Join Game</span>
            </button>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3">
            <button
              onClick={onBrowseGames}
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-transparent text-white text-sm font-bold leading-normal tracking-[0.015em] w-full hover:bg-white/5 transition-colors"
            >
              <span className="truncate">Browse Public Games</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JoinGameScreen;
