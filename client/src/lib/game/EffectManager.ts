import { AttackType } from '@/types';
import { PowerUpType } from './constants';
import { playSound } from './audio';

export interface Effect {
  type: AttackType;
  startTime: number;
  duration: number;
  targetId: string;
}

export class EffectManager {
  private activeEffects: Map<string, Effect>;
  private onUpdateGameState: (state: any) => void;

  constructor(onUpdateGameState: (state: any) => void) {
    this.activeEffects = new Map();
    this.onUpdateGameState = onUpdateGameState;
  }

  public handleAttackItem(powerUpType: PowerUpType, otherPlayers: Record<string, any>): void {
    // Map power-up type to attack type
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
        console.error("Unknown attack type:", powerUpType);
        return;
    }

    // Get all other players
    const playersArray = Object.keys(otherPlayers);
    
    if (playersArray.length > 0) {
      // Pick random target
      const randomTargetId = playersArray[Math.floor(Math.random() * playersArray.length)];
      const targetName = otherPlayers[randomTargetId]?.name || "Unknown";
      
      console.log(`Sending ${AttackType[attackType]} attack to player ${targetName} (${randomTargetId})`);
      
      // Send attack through game state
      this.onUpdateGameState({
        sendAttack: { attackType, targetId: randomTargetId }
      });
      
      // Play attack sound
      playSound('attack');
      
      // Add to active effects
      this.addEffect({
        type: attackType,
        startTime: Date.now(),
        duration: 5000, // 5 seconds default duration
        targetId: randomTargetId
      });
    } else {
      console.log("No other players to attack!");
    }
  }

  private addEffect(effect: Effect): void {
    const effectKey = `${effect.type}-${effect.targetId}`;
    this.activeEffects.set(effectKey, effect);
    
    // Set timeout to remove effect
    setTimeout(() => {
      this.removeEffect(effectKey);
    }, effect.duration);
  }

  private removeEffect(effectKey: string): void {
    if (this.activeEffects.has(effectKey)) {
      this.activeEffects.delete(effectKey);
      
      // Update game state to remove effect
      const [type, targetId] = effectKey.split('-');
      this.onUpdateGameState({
        activeEffects: {
          [type]: false
        }
      });
    }
  }

  public getActiveEffects(): Map<string, Effect> {
    return this.activeEffects;
  }

  public clearAllEffects(): void {
    this.activeEffects.clear();
  }
} 