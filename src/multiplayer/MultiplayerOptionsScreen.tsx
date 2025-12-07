import React from 'react';

interface MultiplayerOptionsScreenProps {
  onSelectHost: () => void;
  onSelectJoin: () => void;
  onSelectBrowse: () => void;
  onBack: () => void;
  backgroundImage?: string;
}

const MultiplayerOptionsScreen: React.FC<MultiplayerOptionsScreenProps> = ({
  onSelectHost,
  onSelectJoin,
  onSelectBrowse,
  onBack,
  backgroundImage,
}) => {
  return (
    <div 
      className="relative flex min-h-screen w-full flex-col bg-background-dark bg-cover bg-center bg-fixed"
      style={backgroundImage ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%), url(${backgroundImage})` } : undefined}
    >
      <header className="flex items-center p-4">
        <button
          onClick={onBack}
          className="flex size-12 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-white pr-12">Multiplayer</h1>
      </header>

      <main className="flex flex-1 flex-col justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onSelectHost}
            className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-primary px-5 py-4 text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined !text-3xl">add_circle</span>
              <span className="truncate text-lg font-bold">HOST GAME</span>
            </div>
            <p className="text-sm font-medium text-white/80">Create a lobby for friends</p>
          </button>

          <button
            onClick={onSelectJoin}
            className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-zinc-800 px-5 py-4 text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined !text-3xl">password</span>
              <span className="truncate text-lg font-bold">JOIN GAME</span>
            </div>
            <p className="text-sm font-medium text-zinc-400">Enter a game code</p>
          </button>

          <button
            onClick={onSelectBrowse}
            className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-zinc-800 px-5 py-4 text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined !text-3xl">public</span>
              <span className="truncate text-lg font-bold">BROWSE GAMES</span>
            </div>
            <p className="text-sm font-medium text-zinc-400">Find a public match</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default MultiplayerOptionsScreen;
