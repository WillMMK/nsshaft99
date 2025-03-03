import { AttackType } from './constants';

// Player interface
export interface Player {
  id: string;
  name: string;
  score: number;
  isAlive: boolean;
}

// Game room interface
export interface GameRoom {
  id: string;
  players: Record<string, Player>;
  isActive: boolean;
  startTime: number | null;
}

// Re-export AttackType for convenience
export { AttackType }; 