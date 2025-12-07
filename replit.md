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

### Hosting Platform
- **Replit**: Configured for deployment on Replit platform
  - Special Vite configuration for Replit's networking
  - HMR proxy configuration for live updates
  - No backend server required - pure frontend application