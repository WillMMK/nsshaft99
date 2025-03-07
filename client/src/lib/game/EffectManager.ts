import { AttackType } from '@/types';
import { GameState } from '@/contexts/GameStateContext';

// Define PowerUpType enum properly
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

export class EffectManager {
  private updateGameState: (state: Partial<GameState>) => void;

  constructor(updateGameState: (state: Partial<GameState>) => void) {
    this.updateGameState = updateGameState;
  }

  handleAttackItem(powerUpType: PowerUpType, otherPlayers: Record<string, Player>) {
    // Map power-up to attack type
    let attackType: AttackType;

    switch (powerUpType) {
      case PowerUpType.ATTACK_SPIKE_PLATFORM:
        attackType = AttackType.SPIKE_PLATFORM;
        break;
      case PowerUpType.ATTACK_SPEED_UP:
        attackType = AttackType.SPEED_UP;
        break;
      case PowerUpType.ATTACK_NARROW_PLATFORM:
        attackType = AttackType.NARROW_PLATFORM;
        break;
      case PowerUpType.ATTACK_REVERSE_CONTROLS:
        attackType = AttackType.REVERSE_CONTROLS;
        break;
      case PowerUpType.ATTACK_TRUE_REVERSE:
        attackType = AttackType.TRUE_REVERSE;
        break;
      default:
        console.error("Invalid attack power-up type:", powerUpType);
        return;
    }

    // Select random target
    const targets = Object.keys(otherPlayers);
    if (targets.length === 0) {
      console.log("No targets available for attack");
      return;
    }

    const randomTarget = targets[Math.floor(Math.random() * targets.length)];
    console.log(`Sending ${attackType} attack to player ${randomTarget}`);

    // Trigger attack via network
    if (window.__gameEngine?.effectManager) {
      const networkManager = (window as any).networkManager;
      if (networkManager) {
        networkManager.sendAttack(randomTarget, attackType);
        console.log(`Attack ${attackType} sent to ${randomTarget}`);
      } else {
        console.error("Network manager not found, can't send attack");
      }
    }
  }
}