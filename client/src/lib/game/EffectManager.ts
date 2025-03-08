import { AttackType, PowerUpType } from '@/types';
import { GameState } from '@/contexts/GameStateContext';
import { playSound } from './audio';

export class EffectManager {
  private updateGameState: (state: Partial<GameState>) => void;

  constructor(updateGameState: (state: Partial<GameState>) => void) {
    this.updateGameState = updateGameState;
    console.log("EffectManager initialized");
  }

  handleAttackItem(powerUpType: PowerUpType, otherPlayers: Record<string, any>) {
    console.log("handleAttackItem called with powerUpType:", powerUpType);
    
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
    const targetName = otherPlayers[randomTarget]?.name || "Unknown";
    console.log(`Selected target ${targetName} (${randomTarget}) for ${attackType} attack`);

    // Play attack sound
    playSound('attack');

    // Get the network manager from window
    const networkManager = (window as any).networkManager;
    if (networkManager) {
      console.log("Sending attack through network manager", {
        targetId: randomTarget,
        attackType: attackType,
        targetName: targetName
      });
      
      if (!networkManager.socket?.connected) {
        console.error("Network manager socket not connected!");
        return;
      }
      
      networkManager.sendAttack(randomTarget, attackType);
      
      // Update game state to show attack was sent
      this.updateGameState({
        lastAttackSent: {
          type: attackType,
          targetId: randomTarget,
          targetName: targetName,
          timestamp: Date.now()
        }
      });
    } else {
      console.error("Network manager not found - attack cannot be sent");
    }
  }
}