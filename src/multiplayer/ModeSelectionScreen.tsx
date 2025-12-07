import React from 'react';

interface ModeSelectionScreenProps {
  gameName: string;
  onSelectOffline: () => void;
  onSelectOnline: () => void;
  onBack: () => void;
}

const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  gameName,
  onSelectOffline,
  onSelectOnline,
  onBack,
}) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark">
      <div className="absolute inset-0 z-0">
        <div className="h-full w-full bg-gradient-to-b from-primary/10 to-transparent opacity-50"></div>
      </div>
      
      <div className="relative z-10 flex h-full flex-1 flex-col">
        <div className="flex items-center p-4">
          <button
            onClick={onBack}
            className="flex size-12 shrink-0 items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>
          <h1 className="flex-1 text-center text-lg font-bold tracking-[-0.015em] text-white pr-12">{gameName}</h1>
        </div>

        <main className="flex flex-1 flex-col justify-center px-4 pb-4 pt-8 sm:pt-16">
          <div className="flex w-full flex-col items-center gap-4">
            <button
              onClick={onSelectOffline}
              className="flex w-full max-w-[480px] cursor-pointer flex-col items-start gap-2.5 overflow-hidden rounded-xl bg-white/5 p-6 text-left ring-1 ring-white/10 backdrop-blur-sm transition-transform duration-200 ease-in-out hover:scale-[1.02] focus:ring-2 focus:ring-primary active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                <span className="material-symbols-outlined text-3xl text-primary">signal_wifi_off</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white">OFFLINE</h2>
                <p className="text-sm text-white/60">Play solo or with friends nearby</p>
              </div>
            </button>

            <button
              onClick={onSelectOnline}
              className="flex w-full max-w-[480px] cursor-pointer flex-col items-start gap-2.5 overflow-hidden rounded-xl bg-primary p-6 text-left text-white shadow-lg shadow-primary/20 ring-1 ring-primary/50 backdrop-blur-sm transition-transform duration-200 ease-in-out hover:scale-[1.02] focus:ring-2 focus:ring-white active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
                <span className="material-symbols-outlined text-3xl text-white">public</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white">ONLINE</h2>
                <p className="text-sm text-white/80">Challenge players worldwide</p>
              </div>
            </button>
          </div>
        </main>

        <footer className="flex justify-center p-4">
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-transparent text-sm font-bold leading-normal tracking-[0.015em] text-white/70 hover:text-white transition-colors">
            <span className="truncate">How to Play</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ModeSelectionScreen;
