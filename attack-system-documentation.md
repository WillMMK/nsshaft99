# Attack System Documentation

## Overview
The multiplayer attack system allows players to send various types of attacks to their opponents, creating an interactive and competitive gameplay experience. This document details the implementation and functionality of the attack system.

## Attack Types

The game supports four different types of attacks (`AttackType` enum):

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

## Attack System Components

### 1. Attack Button (client/src/components/multiplayer/AttackButton.tsx)
- Floating action button in the game UI
- Shows attack menu when clicked
- Features:
  - Cooldown system
  - Score threshold requirement
  - Visual feedback
  - Attack type selection

### 2. Attack Notification (client/src/components/multiplayer/AttackNotification.tsx)
- Displays incoming attacks
- Defense system:
  - Time-based defense chance (starts at 100%, decreases over time)
  - Visual feedback for successful/failed defense
  - Attack effect clearing on successful defense

### 3. Player List Attacks (client/src/components/multiplayer/PlayerList.tsx)
- Allows targeting specific players
- Shows player scores and status
- Integrated attack menu for player targeting

## Attack Flow

1. **Sending an Attack**:
   ```typescript
   sendAttack(attackType: AttackType, targetId?: string)
   ```
   - Player initiates attack through UI
   - NetworkManager sends attack to server
   - Server validates and forwards to target
   - Attack notification appears for target player

2. **Receiving an Attack**:
   ```typescript
   onReceiveAttack(callback: (data: { 
     attackerId: string;
     attackerName: string;
     attackType: AttackType 
   }) => void)
   ```
   - Target receives attack notification
   - Defense opportunity window opens
   - Effect applies if defense fails
   - Effect clears after duration (5 seconds)

3. **Defense System**:
   - Time-based defense chance
   - Decreases by 5% every 200ms
   - Success/failure feedback
   - Effect cleared on successful defense

## Attack Effects Implementation

### Effect Duration
- Default duration: 5000ms (5 seconds)
- Effects automatically clear after duration
- Can be cleared early with successful defense

### Effect States
```typescript
activeEffects: {
  spikePlatforms: boolean;
  speedUp: boolean;
  narrowPlatforms: boolean;
  reverseControls: boolean;
}
```

## Network Protocol

### Client to Server
- `sendAttack` event:
  ```typescript
  {
    targetPlayerId?: string;
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

## AI Player Attack System

AI players can also participate in the attack system:
- Random attack generation
- 5% chance to attack per update cycle
- Random target selection
- All attack types available to AI

## Security Considerations

1. **Server-side Validation**:
   - Attack sender verification
   - Target player existence check
   - Game state validation
   - Score threshold verification

2. **Rate Limiting**:
   - Cooldown system
   - Score requirements
   - Server-side verification

## Best Practices

1. **Attack Implementation**:
   - Clear visual feedback
   - Consistent effect duration
   - Balanced defense system
   - Fair cooldown periods

2. **User Experience**:
   - Clear attack notifications
   - Visual effect indicators
   - Defense opportunity window
   - Attack status feedback

3. **Error Handling**:
   - Connection loss handling
   - Invalid target handling
   - Effect cleanup on game reset
   - Proper state management

## Debugging

The system includes comprehensive logging:
- Attack sending/receiving
- Defense attempts
- Effect application/removal
- Player state changes

## Future Improvements

1. **Attack System Enhancements**:
   - New attack types
   - Combo attack system
   - Power-up based attacks
   - Team-based attacks

2. **Defense System Improvements**:
   - Skill-based defense mechanics
   - Defense power-ups
   - Team defense options
   - Defense cooldown system

3. **UI/UX Improvements**:
   - Enhanced visual effects
   - Better feedback systems
   - More interactive defense mechanics
   - Advanced targeting system 