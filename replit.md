# 4-Player Role Game

## Overview

This project is a multiplayer party game built with React and TypeScript, designed to support up to 4 players across various competitive mini-games. The core concept revolves around role-based gameplay (Owner, Police, Robber, Thief) where players compete over multiple rounds to accumulate points. The game features multiple mini-game modes such as "Thief and Police," "Color War," "Tic-Tac-Toe," and "QuadMatch Royale," complete with a comprehensive scoring system and leaderboard.

The application is a single-page application (SPA) with distinct game phases including player setup, role assignment, active gameplay, and results displays. It incorporates immersive audio (background music and sound effects), animated transitions, and a dark-themed user interface. The ambition is to provide an engaging, competitive party game experience with a polished presentation.

## Recent Changes

**December 8, 2025:**
- Fixed critical UI bug in QuadMatch Royale multiplayer mode where the wrong game interface was displayed
- Issue: When starting an online multiplayer game for QuadMatch Royale, the game was incorrectly showing the "Thief and Police" style 4-player card grid (light theme with Player 1-4 cards showing points) instead of the proper QuadMatch Royale dark-themed card passing interface
- Root cause: The multiplayer game start logic was unconditionally setting the game phase to `ASSIGN_ROLES` for all games, which is correct for role-based games but not for QuadMatch Royale
- Fix: Modified `App.tsx` to check if the game is QuadMatch Royale and route to `SETUP` phase instead, allowing the dedicated `QuadMatchRoyale` component to render with its proper dark-themed UI

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool:**
- React 18.2 with TypeScript for type-safe development.
- Vite 5.0 for fast HMR and optimized builds.
- TypeScript 5.3 for enhanced developer experience.

**UI & Styling:**
- Tailwind CSS (via CDN) for utility-first styling with a custom dark mode theme and game-specific color palette.
- Custom fonts: Plus Jakarta Sans, Orbitron, Inter, Material Symbols.
- Responsive design with a mobile-first approach.

**State Management:**
- Component-level state using React hooks. No global state management library is used.
- Game state is managed through TypeScript interfaces (`GameState`, `Player`, `GamePhase`).

**Game Architecture:**
- Phase-based game flow (`HOME` to `LEADERBOARD`).
- Multiple pluggable game modes defined in a `GAMES` constant.
- Configurable point system per game type.
- Supports up to 16 rounds.

**Audio System:**
- Background music and various sound effects for game events.
- Audio assets are sourced from external CDNs.

**Component Design Patterns:**
- Functional components with TypeScript props.
- Custom hooks for complex interactions.
- Animation frame-based interactions for smooth UX.
- Event-driven architecture for game phase transitions.

### Data Architecture

**Type System:**
- Centralized type definitions in `src/types.ts` including `Player`, `GameDefinition`, `GameState`, `GamePhase`, `GameId`.
- Strongly typed game configuration with role-to-points mappings.

**Data Flow:**
- Props drilling for state distribution.
- Immutable state updates.
- Player data includes ID, name, score tracking, current role, color, and AI flag.

**Game Constants:**
- Predefined player configurations, game definitions, and visual constants are centralized in `constants.ts`.

### Multiplayer Architecture

**Real-time Communication:**
- Bun runtime with native WebSocket support for real-time multiplayer.
- Game server runs on port 3001, handling room creation, player joining, and game synchronization.
- `useWebSocket.ts` custom hook manages WebSocket connections.

**Multiplayer Features:**
- Multiplayer screens for mode selection, hosting, joining, and browsing games.
- Room-based lobby system with host controls.
- Vite proxy configuration for seamless frontend-to-backend WebSocket communication.

### Configuration & Build

**Development Environment:**
- Vite dev server configured for Replit deployment (port 5000, host 0.0.0.0, HMR client port 443).
- TypeScript strict mode enabled.

**Production Optimization:**
- Vite's production build provides optimized bundles with tree-shaking and asset optimization.

## External Dependencies

### Core Framework Dependencies
- **React 18.2.0**: Core UI library.
- **React-DOM 18.2.0**: DOM rendering.
- **Vite 5.0.10**: Build tool and dev server.
- **@vitejs/plugin-react 4.2.1**: React support for Vite.
- **TypeScript 5.3.3**: Type system and compiler.

### Type Definitions
- **@types/react 18.2.45**: TypeScript definitions for React.
- **@types/react-dom 18.2.18**: TypeScript definitions for React-DOM.
- **@types/node 20.10.0**: Node.js type definitions.

### External CDN Resources
- **Tailwind CSS**: Loaded via `cdn.tailwindcss.com`.
- **Google Fonts**: Plus Jakarta Sans, Orbitron, Inter, Material Symbols Outlined.

### Audio Assets
- **Background Music**: Pixabay CDN (`fun-life-112188.mp3`).
- **Sound Effects**: Mixkit CDN for various game events.

### Image Assets
- **Unsplash**: High-quality stock photography for thematic game backgrounds.

### Hosting Platform
- **Replit**: Configured for deployment on the Replit platform, utilizing specific Vite and HMR configurations for the environment.