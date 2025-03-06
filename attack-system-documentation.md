# Attack System Documentation

## Overview
The multiplayer attack system allows players to collect item power-ups that immediately send various types of attacks to their opponents, creating an interactive and competitive gameplay experience. This document details the implementation and functionality of the item-based attack system.

## Attack Types

The game supports five different types of attacks (`AttackType` enum):

1. **Spike Platform** (`SPIKE_PLATFORM`)
   - Adds spikes to platforms
   - Visual indicator: ⚡
   - Color theme: Red

2. **Speed Up** (`SPEED_UP`)
   - Increases game speed
   - Visual indicator: 🏃
   - Color theme: Blue

3. **Narrow Platform** (`NARROW_PLATFORM`)
   - Makes platforms narrower
   - Visual indicator: ↔️
   - Color theme: Green

4. **Reverse Controls** (`REVERSE_CONTROLS`)
   - Reverses opponent's controls
   - Visual indicator: 🔄
   - Color theme: Purple

5. **True Reverse** (`TRUE_REVERSE`)
   - Reverses controls without flipping screen
   - Visual indicator: ⇄
   - Color theme: Indigo

## Item-Based Attack System

### 1. Attack Items
- Attack items spawn randomly on platforms in multiplayer mode
- Each attack type has its own distinct color and icon
- When collected, the attack is immediately sent to a random opponent
- No storage or delay - collecting triggers the attack instantly

### 2. Shield Items
- Special purple shield items (🛡️) also spawn on platforms
- When collected, they activate temporary protection (10 seconds)
- Shields automatically block the next incoming attack
- After blocking an attack, the shield is consumed

### 3. Item Spawn Mechanics
- Items appear on approximately 70% of platforms (configurable)
- Items only spawn on normal platforms (not on spike or collapsing platforms)
- Attack and shield items only spawn in multiplayer mode
- Visual highlights make platforms with items easier to spot

## Attack Flow

1. **Sending an Attack**:
   - Player collects an attack item by touching it
   - System automatically selects a random opponent
   - Attack is immediately sent to target player
   - Visual and audio feedback confirms the attack was sent

2. **Receiving an Attack**:
   - Target receives attack notification
   - If target has an active shield, attack is automatically blocked
   - Otherwise, normal defense opportunity window opens
   - Effect applies if defense fails
   - Effect clears after duration (5 seconds)

3. **Defense System**:
   - **Shield Defense**: Automatic blocking with collected shield item
   - **Manual Defense**:
     - Time-based defense chance
     - Decreases by 5% every 200ms
     - Success/failure feedback
     - Effect cleared on successful defense

## Implementation Details

### Item Generation
```typescript
// Inside createPlatform function
if (isMultiplayer) {
  // In multiplayer mode, spawn all power-up types with weighted distribution
  if (rand < 0.4) {
    // Original power-ups (40% chance)
    powerUpType = Math.floor(Math.random() * 3);
  } else if (rand < 0.6) {
    // Shield (20% chance)
    powerUpType = PowerUpType.SHIELD;
  } else {
    // Attack items (40% chance)
    const attackTypes = [
      PowerUpType.ATTACK_SPIKE_PLATFORM,
      PowerUpType.ATTACK_SPEED_UP,
      PowerUpType.ATTACK_NARROW_PLATFORM,
      PowerUpType.ATTACK_REVERSE_CONTROLS,
      PowerUpType.ATTACK_TRUE_REVERSE
    ];
    powerUpType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
  }
}
```

### Attack Processing
```typescript
// When collecting an attack item
if (powerUp.type === PowerUpType.ATTACK_*) {
  // Map to attack type
  let attackType = AttackType.*;
  
  // Get all other players (excluding self)
  const playersArray = Object.entries(otherPlayers)
    .filter(([id]) => id !== localPlayerId)
    .map(([id]) => id);
  
  // Pick random target
  const randomTargetId = playersArray[Math.floor(Math.random() * playersArray.length)];
  
  // Send attack
  onUpdateGameState({
    sendAttack: { attackType, targetId: randomTargetId }
  });
}
```

### Shield Processing
```typescript
// When receiving an attack with shield active
if (gameState.attackNotification && !defended && gameState.hasShield) {
  // Shield blocks the attack automatically
  setShieldBlocked(true);
  setDefended(true);
  setDefenseSuccessful(true);
  
  // Clear shield after use
  setGameState(prev => ({
    ...prev,
    hasShield: false
  }));
}
```

## Network Protocol

### Client to Server
- `sendAttack` event:
  ```typescript
  {
    targetPlayerId: string;
    attackType: AttackType;
  }
  ```

### Server to Client
- `receive_attack` event:
  ```typescript
  {
    attackerId: string;
    attackerName: string;
    attackType: AttackType;
  }
  ```

## User Experience

1. **Visual Feedback**:
   - Distinct colors and icons for different item types
   - Highlighted platforms containing items
   - Clear attack notifications
   - Shield effect around player character
   - Success/failure messages

2. **Audio Feedback**:
   - Sound effects for collecting items
   - Sound effects for sending/receiving attacks
   - Shield activation and defense sounds

## Future Improvements

1. **Item System Enhancements**:
   - More item types
   - Special items with unique effects
   - Item combinations
   - Rare super-items with enhanced effects

2. **Defense System Improvements**:
   - Multiple shield levels
   - Shield regeneration
   - Counter-attack abilities
   - Team defense options

3. **UI/UX Improvements**:
   - Enhanced visual effects
   - More interactive item collection
   - Clearer indicators of active effects
   - Tutorial for new players 