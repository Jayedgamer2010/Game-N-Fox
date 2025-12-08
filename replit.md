# 4-Player Role Game

## Overview

This is a multiplayer party game built with React and TypeScript that supports 4 players in various competitive mini-games. The application features role-based gameplay where players are assigned different roles (Owner, Police, Robber, Thief) and compete across multiple rounds to earn points. The game includes multiple mini-game modes like "Thief and Police", "Color War", "Tic-Tac-Toe", and others, with a comprehensive scoring system and leaderboard.

The application is designed as a single-page application (SPA) with multiple game phases including player setup, role assignment, gameplay, and results screens. It features immersive audio (background music and sound effects), animated transitions, and a polished dark-themed UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- **React 18.2** with TypeScript for type-safe component development
- **Vite 5.0** as the build tool and development server, chosen for fast Hot Module Replacement (HMR) and optimized production builds
- **TypeScript 5.3** for enhanced developer experience and compile-time type checking

**UI & Styling**
- **Tailwind CSS** (via CDN) for utility-first styling with custom theme configuration
- Custom dark mode theme with game-specific color palette (role-specific colors, game backgrounds, luminous accents)
- Custom fonts: Plus Jakarta Sans (display), Orbitron (digital effects), Inter (body text), Material Symbols (icons)
- Responsive design with mobile-first approach using viewport meta tags

**State Management**
- Component-level state using React hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- No global state management library - intentionally kept simple for a self-contained game
- Game state tracked through TypeScript interfaces: `GameState`, `Player`, `GamePhase`

**Game Architecture**
- Phase-based game flow using enum `GamePhase` (HOME → SETUP → ASSIGN_ROLES → PLAYING → REVEALING → VERDICT → ROUND_RESULTS → LEADERBOARD)
- Multiple game modes defined in `GAMES` constant with pluggable game definitions
- Point system configured per game type with different scoring rules
- Support for 16 rounds maximum (`MAX_ROUNDS`)

**Audio System**
- Background music (BGM) playing throughout gameplay
- Multiple sound effects for different game events (start, role reveal, select, round end, verdict)
- Audio files sourced from external CDNs (Pixabay, Mixkit)

**Component Design Patterns**
- Functional components with TypeScript props
- Custom hooks for complex interactions (e.g., `QuitButton` with hold-to-confirm)
- Animation frame-based interactions for smooth UX
- Event-driven architecture for game phase transitions

### Data Architecture

**Type System**
- Centralized type definitions in `src/types.ts`
- Core interfaces: `Player`, `GameDefinition`, `GameState`
- Enums for finite states: `GamePhase`, `GameId`
- Strongly typed game configuration with role-to-points mappings

**Data Flow**
- Props drilling for state distribution (no context API needed due to shallow component hierarchy)
- Immutable state updates following React best practices
- Player data includes: id, name, score tracking (total + round), current role, color, AI flag

**Game Constants**
- Predefined player configurations with unique colors
- Game definitions stored as record type for O(1) lookup
- Rotation classes for visual variety in card displays
- All magic numbers and strings centralized in `constants.ts`

### Configuration & Build

**Development Environment**
- Vite dev server configured for Replit deployment
  - Port 5000 with host 0.0.0.0 for external access
  - HMR client port set to 443 for Replit's proxy
  - Allowed hosts enabled for Replit domains
- TypeScript strict mode enabled for maximum type safety
- Source maps and debugging support in development

**Production Optimization**
- Vite's production build creates optimized bundles
- Tree-shaking for minimal bundle size
- Code splitting ready (though currently single-bundle)
- Asset optimization through Vite's built-in processors

## External Dependencies

### Core Framework Dependencies
- **React 18.2.0**: Core UI library for component-based architecture
- **React-DOM 18.2.0**: DOM rendering layer for React
- **Vite 5.0.10**: Build tool and dev server with fast HMR
- **@vitejs/plugin-react 4.2.1**: Official Vite plugin for React support
- **TypeScript 5.3.3**: Type system and compiler

### Type Definitions
- **@types/react 18.2.45**: TypeScript definitions for React
- **@types/react-dom 18.2.18**: TypeScript definitions for React-DOM
- **@types/node 20.10.0**: Node.js type definitions for build scripts

### External CDN Resources
- **Tailwind CSS**: Loaded via CDN (cdn.tailwindcss.com) with plugins enabled
- **Google Fonts**: 
  - Plus Jakarta Sans (primary display font)
  - Orbitron (digital/tech aesthetic)
  - Inter (body text)
  - Material Symbols Outlined (icon font)

### Audio Assets
- **Background Music**: Pixabay CDN (fun-life-112188.mp3)
- **Sound Effects**: Mixkit CDN
  - Game start sound
  - Card flip/role reveal
  - UI selection clicks
  - Round completion
  - Verdict reveal

### Image Assets
- **Unsplash**: Game background images loaded from Unsplash CDN
  - Used for thematic game backgrounds
  - High-quality stock photography (2K resolution)

### Multiplayer Architecture

**WebSocket Server**
- **Bun runtime** with native WebSocket support for real-time multiplayer
- Game server runs on port 3001 (`server/index.ts`)
- Handles room creation, player joining, game synchronization

**Multiplayer Components** (`src/multiplayer/`)
- `useWebSocket.ts`: Custom hook for WebSocket connection management
- Multiplayer screens: ModeSelectionScreen, HostGameScreen, JoinGameScreen, BrowseGamesScreen, GameLobbyScreen
- Room-based lobby system with host controls

**Vite Proxy Configuration**
- WebSocket connections proxied from `/ws` to `ws://localhost:3001`
- Enables seamless frontend-to-backend communication

### Hosting Platform
- **Replit**: Configured for deployment on Replit platform
  - Special Vite configuration for Replit's networking
  - HMR proxy configuration for live updates
  - Dual workflow: Vite dev server (port 5000) + WebSocket game server (port 3001)

## Recent Changes (December 2024)

### Multiplayer Bug Fixes
- **Fixed WebSocket message handlers**: Added missing handlers for `game_action` and `game_state_updated` messages in `useWebSocket.ts`
- **Added multiplayer callbacks**: Introduced `onGameAction`, `onGameStateUpdate`, `onGameStarted`, and `onGameEnded` callback options to the `useWebSocket` hook for proper event handling
- **Fixed Tic-Tac-Toe sync**: Player moves in Tic-Tac-Toe now broadcast to all players via WebSocket when in multiplayer mode. Both xMoves and oMoves arrays are sent together to ensure consistent state across all clients
- **Fixed Color War sync**: Color War moves now properly synchronize across all connected players
- **Fixed stale closure issue**: Resolved reconnection logic using `useRef` to avoid stale state references in WebSocket callbacks
- **Real-time game state sync**: Both `ttt_move` and `color_war_move` game actions now properly transmit and receive board state, turn information, player scores, and game phase transitions

### Technical Improvements
- Refactored game move handlers (`handleTicTacToeCellClick`, `executeColorWarMove`) to calculate state outside of `setGameState` for proper WebSocket broadcasting
- Added `modeRef` and `optionsRef` refs to avoid stale closures in WebSocket event handlers
- Improved multiplayer state management with dedicated action handlers for each game type

## Recent Changes (December 7, 2024)

### Tic-Tac-Toe Multiplayer Turn Validation Fix
- **Fixed turn validation bug**: Implemented stable ref-based player index tracking (`myMultiplayerGameIndexRef`) to prevent players from selecting cells during opponent's turn
- **Root cause**: Previous implementation relied on name matching which could fail when multiple players had similar names or during race conditions
- **Solution**: Player's game index is now captured from room.players array when game enters 'playing' status, stored in a ref, and used for turn validation
- **Key implementation**: Ref is populated whenever `room.status === 'playing'` regardless of local game phase to handle race conditions between host and joiners

### QuadMatch Royale UI Improvements
- **Complete UI rewrite**: Redesigned component to match reference HTML with improved layout and visual presentation
- **Compass-style layout**: Player hands arranged in North/South/East/West positions with proper rotation
- **Card set names display**: Added actual card set names (Fruit cards, Animal cards, etc.) instead of generic "Card Set" labels
- **Player name presentation**: Enhanced player name display with proper positioning and styling
- **Preserved game logic**: All AI opponent logic and win condition detection remains intact

## Recent Changes (December 8, 2024)

### Thief and Police Multiplayer Implementation
- **Host-only role assignment**: Only the host assigns roles and broadcasts them via `thief_police_round_start` WebSocket action to prevent race conditions
- **Police task sync**: Added `thief_police_task_revealed` and `thief_police_task_done` actions to sync police task reveal phase across all players
- **Police selection sync**: Added `thief_police_selection` action to broadcast when police selects a target player
- **Verdict sync**: Added `thief_police_verdict` action to sync the verdict result (correct/incorrect guess) and updated player scores
- **Round results sync**: Added `thief_police_round_results` and `thief_police_next_round` actions for round transitions
- **Host detection**: Uses `isHostRef` to track if current player is the room host, preventing non-hosts from assigning roles

### QuadMatch Royale Multiplayer Implementation
- **Multiplayer props**: Added `isMultiplayer`, `sendGameAction`, `myPosition`, `isHost`, and `onGameAction` props to QuadMatchRoyale component
- **Game start broadcast**: Host broadcasts `quadmatch_game_started` with initial hands and player names to all players
- **Card selection sync**: Players broadcast `quadmatch_card_selected` when selecting a card to pass; host tracks all selections via `pendingSelectionsRef`
- **Card pass execution**: When all 4 players have selected, host executes card pass and broadcasts `quadmatch_cards_passed` with new hands, winner, and rankings
- **Play again sync**: Added `quadmatch_play_again` action for synchronized game restart
- **Stale closure fix**: Uses `executeCardPassRef` to store latest function reference, preventing stale closures in WebSocket callbacks
- **Host tracking fix**: Added `isHost` prop from App.tsx based on `room.hostId === playerId` comparison, with `isHostRef` updated via useEffect

### Technical Improvements
- **Ref-based callback pattern**: QuadMatchRoyale uses `quadMatchActionCallbackRef` in App.tsx to receive game actions from WebSocket handler
- **Position mapping**: Added `getMyQuadMatchPosition()` function to map player index (0-3) to compass positions (south/west/north/east)
- **Host detection consistency**: Both Thief & Police and QuadMatch use consistent host detection via room.hostId comparison

### QuadMatch Royale Complete UI Rebuild
- **New polished dark mode design**: Dark theme (#101622 background) with Spline Sans font and Material Symbols icons
- **Compass layout**: Player hands arranged in North/South/East/West positions with proper rotation for side players
- **Card color themes**: Ruby Red, Sapphire Blue, Emerald Green, and Amethyst Purple preset themes
- **Module-scoped constants**: `POSITIONS` and `POSITION_LABELS` hoisted to module scope to prevent multiplayer event handler re-registration issues
- **Optimized dependency arrays**: Removed stable constants from useEffect/useCallback dependency arrays to prevent unnecessary re-renders

### Space Race Game Unlocked
- Removed `isComingSoon: true` flag from Space Race game definition in constants.ts
- Game is now playable from the game selection screen

### QuadMatch Royale Complete Game Rebuild
- **Complete code rewrite**: Rebuilt QuadMatchRoyale.tsx from scratch with all three game phases (setup, playing, gameOver)
- **Setup Phase**: 4 name inputs with validation, preset themes (Animals, Cities, Movies), disabled start button until names are valid
- **Playing Phase**: Compass layout (South=You, West=Player 2, North=Player 3, East=Player 4) with face-up cards for player, face-down for AI
- **AI Strategy Implementation**:
  - Priority 1: Keep 3-of-a-kind (pass singleton with highest index)
  - Priority 2: Keep pairs (pass from non-pair cards with highest index)
  - Priority 3: Pass least frequent card type (highest index as tie-breaker)
  - Deterministic tie-breaking: Always pass card at highest array index (most recently received)
- **Win Detection**: First player to collect 4 identical cards wins
- **Ranking System**: 4-of-a-kind > 3-of-a-kind > 2-of-a-kind > no matches, ties broken by round when match was first achieved
- **Match History**: Now tracks all match levels ≥1 (not just ≥2) for proper ranking tie-breaks
- **Game Over Phase**: Winner celebration display, rankings for all players, statistics (rounds, cards passed), Play Again/Change Names buttons
- **Multiplayer Support**: Preserved WebSocket handlers for game_started, card_selected, cards_passed, play_again actions