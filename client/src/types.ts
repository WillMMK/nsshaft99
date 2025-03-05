// Add global declarations
import { NetworkManager } from './lib/game/network';

declare global {
  interface Window {
    networkManager?: NetworkManager;
  }
}

// Player interface
export interface Player {
  id: string;
  name: string;
  score: number;
  isAlive: boolean;
  isAI?: boolean;
}

// Attack types that players can send to others
export enum AttackType {
  SPIKE_PLATFORM = 'spike_platform',
  SPEED_UP = 'speed_up',
  NARROW_PLATFORM = 'narrow_platform',
  REVERSE_CONTROLS = 'reverse_controls'
} 