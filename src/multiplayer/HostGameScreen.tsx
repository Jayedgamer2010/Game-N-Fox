import React, { useState } from 'react';

interface HostGameScreenProps {
  onCreateGame: (settings: {
    playerName: string;
    isPublic: boolean;
    aiCount: number;
    gameMode: string;
    deckTheme: string;
    maxPlayers: number;
  }) => void;
  onBack: () => void;
  isConnected: boolean;
  error: string | null;
  maxPlayers: number;
  backgroundImage?: string;
}

const HostGameScreen: React.FC<HostGameScreenProps> = ({
  onCreateGame,
  onBack,
  isConnected,
  error,
  maxPlayers,
  backgroundImage,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [aiCount, setAiCount] = useState(0);
  const [gameMode, setGameMode] = useState('classic');
  const [deckTheme, setDeckTheme] = useState('default');

  const canCreate = playerName.trim().length >= 2 && isConnected;
  const maxAiPlayers = maxPlayers - 1;

  const handleCreate = () => {
    if (canCreate) {
      onCreateGame({
        playerName: playerName.trim(),
        isPublic,
        aiCount: Math.min(aiCount, maxAiPlayers),
        gameMode,
        deckTheme,
        maxPlayers,
      });
    }
  };

  return (
    <div 
      className="relative flex min-h-screen w-full flex-col bg-background-dark bg-cover bg-center bg-fixed"
      style={backgroundImage ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%), url(${backgroundImage})` } : undefined}
    >
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Host Game</h1>
        <div className="size-12 shrink-0"></div>
      </div>

      <main className="flex-grow px-4">
        <div className="mb-6">
          <label className="flex flex-col">
            <p className="text-white text-sm font-medium leading-normal pb-2">YOUR NAME</p>
            <input
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-zinc-700 bg-zinc-800 focus:border-primary h-14 placeholder:text-zinc-500 p-[15px] text-base font-normal leading-normal"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
            />
          </label>
        </div>

        <h2 className="text-white tracking-light text-[28px] font-bold leading-tight pt-2 pb-3">Game Settings</h2>

        <div className="flex py-3">
          <div className="flex h-12 flex-1 items-center justify-center rounded-xl bg-zinc-800/60 p-1">
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-base font-medium leading-normal transition-all duration-200 ${!isPublic ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-400'}`}>
              <span className="truncate">Private</span>
              <input
                className="invisible w-0"
                name="game_type"
                type="radio"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
              />
            </label>
            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-base font-medium leading-normal transition-all duration-200 ${isPublic ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-400'}`}>
              <span className="truncate">Public</span>
              <input
                className="invisible w-0"
                name="game_type"
                type="radio"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-4 bg-zinc-800/40 rounded-xl px-4 min-h-[72px] py-2 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0 size-12">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-white text-base font-medium leading-normal line-clamp-1">AI Players</p>
                <p className="text-zinc-400 text-sm font-normal leading-normal line-clamp-2">Fill empty slots with AI</p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-2 text-white">
                <button
                  onClick={() => setAiCount(Math.max(0, aiCount - 1))}
                  className="text-lg font-medium leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 cursor-pointer hover:bg-zinc-600 transition-colors"
                >
                  -
                </button>
                <span className="text-base font-medium w-6 text-center">{aiCount}</span>
                <button
                  onClick={() => setAiCount(Math.min(maxAiPlayers, aiCount + 1))}
                  className="text-lg font-medium leading-normal flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-zinc-800/40 rounded-xl px-4 min-h-[72px] py-2 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0 size-12">
                <span className="material-symbols-outlined">stadia_controller</span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-white text-base font-medium leading-normal line-clamp-1">Game Mode</p>
                <p className="text-zinc-400 text-sm font-normal leading-normal line-clamp-2">Select the rules for the match</p>
              </div>
            </div>
            <div className="shrink-0">
              <button className="text-base font-medium leading-normal text-white flex items-center gap-2">
                Classic
                <span className="material-symbols-outlined text-zinc-400">arrow_forward_ios</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-zinc-800/40 rounded-xl px-4 min-h-[72px] py-2 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0 size-12">
                <span className="material-symbols-outlined">style</span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-white text-base font-medium leading-normal line-clamp-1">Deck Theme</p>
                <p className="text-zinc-400 text-sm font-normal leading-normal line-clamp-2">Choose the card design</p>
              </div>
            </div>
            <div className="shrink-0">
              <button className="text-base font-medium leading-normal text-white flex items-center gap-2">
                Default
                <span className="material-symbols-outlined text-zinc-400">arrow_forward_ios</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-4 rounded-xl bg-primary/20 p-4">
          <div className="shrink-0 text-primary pt-1">
            <span className="material-symbols-outlined">lightbulb</span>
          </div>
          <p className="text-sm font-normal leading-relaxed text-zinc-300">
            After creating the game, you'll get a unique code to share with your friends.
          </p>
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
      </main>

      <div className="sticky bottom-0 bg-background-dark p-4 pb-6">
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className={`flex h-14 w-full items-center justify-center rounded-xl text-base font-bold leading-normal transition-all ${
            canCreate
              ? 'bg-primary text-white shadow-[0_4px_14px_rgba(43,108,238,0.4)] hover:bg-primary/90 active:scale-[0.98]'
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
          }`}
        >
          Create Game
        </button>
      </div>
    </div>
  );
};

export default HostGameScreen;
