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
  REVERSE_CONTROLS = 'reverse_controls',
  TRUE_REVERSE = 'true_reverse'
}

export interface NetworkPlayer {
  id: string;
  name: string;
  score: number;
  isAlive: boolean;
  isReady: boolean;
}

// Power-up types that can be collected
export enum PowerUpType {
  INVINCIBILITY = 'invincibility',
  SLOW_FALL = 'slow_fall',
  HEALTH_BOOST = 'health_boost',
  SHIELD = 'shield',
  ATTACK_SPIKE_PLATFORM = 'attack_spike_platform',
  ATTACK_SPEED_UP = 'attack_speed_up',
  ATTACK_NARROW_PLATFORM = 'attack_narrow_platform',
  ATTACK_REVERSE_CONTROLS = 'attack_reverse_controls',
  ATTACK_TRUE_REVERSE = 'attack_true_reverse'
} 