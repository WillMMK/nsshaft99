import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AttackType } from '@/types';

interface ActiveEffects {
  spikePlatforms: boolean;
  speedUp: boolean;
  narrowPlatforms: boolean;
  reverseControls: boolean;
  trueReverse: boolean;
}

interface AttackNotification {
  attackerName: string;
  attackType: AttackType;
  timestamp: number;
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  health: number;
  activeEffects: ActiveEffects;
  attackNotification: AttackNotification | null;
  isMovingLeft: boolean;
  isMovingRight: boolean;
}

interface GameStateContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  resetGame: () => void;
}

const initialGameState: GameState = {
  isRunning: false,
  isPaused: false,
  score: 0,
  health: 100,
  activeEffects: {
    spikePlatforms: false,
    speedUp: false,
    narrowPlatforms: false,
    reverseControls: false,
    trueReverse: false
  },
  attackNotification: null,
  isMovingLeft: false,
  isMovingRight: false
};

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const resetGame = () => {
    console.log('Resetting game state completely');
    // Create a fresh copy of the initial state to avoid reference issues
    setGameState({
      isRunning: false,
      isPaused: false,
      score: 0,
      health: 100,
      activeEffects: {
        spikePlatforms: false,
        speedUp: false,
        narrowPlatforms: false,
        reverseControls: false,
        trueReverse: false
      },
      attackNotification: null,
      isMovingLeft: false,
      isMovingRight: false
    });
  };

  return (
    <GameStateContext.Provider
      value={{
        gameState,
        setGameState,
        resetGame
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}; 