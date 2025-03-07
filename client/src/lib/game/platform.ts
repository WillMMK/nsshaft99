import { 
  PLATFORM_HEIGHT, 
  PLATFORM_COLORS,
  SPIKE_HEIGHT,
  POWER_UP_SIZE,
  POWER_UP_SPAWN_CHANCE,
  ATTACK_ITEM_SPAWN_CHANCE,
  SHIELD_SPAWN_CHANCE,
  ATTACK_ITEM_COLORS,
  ATTACK_ITEM_ICONS
} from './constants';
import { PowerUpType } from '@/types';

// Platform types
export enum PlatformType {
  NORMAL,
  SPIKE,
  COLLAPSING,
  CONVEYOR,
  SPRING
}

// PowerUp interface
export interface PowerUp {
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

// Platform interface
export interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  timer?: number;
  collapsed?: boolean;
  powerUp?: PowerUp;
}

// Counter to generate unique IDs for platforms
let platformIdCounter = 0;

// Create a new platform
export function createPlatform(
  x: number, 
  y: number, 
  width: number, 
  type: PlatformType,
  isMultiplayer: boolean = false
): Platform {
  // Randomly add power-ups to platforms with POWER_UP_SPAWN_CHANCE probability
  let powerUp: PowerUp | undefined;
  
  // Don't spawn power-ups on spike or collapsing platforms
  if (type !== PlatformType.SPIKE && type !== PlatformType.COLLAPSING && Math.random() < POWER_UP_SPAWN_CHANCE) {
    let powerUpType: PowerUpType;
    const rand = Math.random();
    
    if (isMultiplayer) {
      // In multiplayer mode, spawn all power-up types with weighted distribution
      if (rand < 0.4) {
        // Original power-ups (40% chance)
        const originalTypes = [
          PowerUpType.INVINCIBILITY,
          PowerUpType.SLOW_FALL,
          PowerUpType.HEALTH_BOOST
        ];
        powerUpType = originalTypes[Math.floor(Math.random() * originalTypes.length)];
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
    } else {
      // In single player mode, only spawn the original power-ups
      const originalTypes = [
        PowerUpType.INVINCIBILITY,
        PowerUpType.SLOW_FALL,
        PowerUpType.HEALTH_BOOST
      ];
      powerUpType = originalTypes[Math.floor(Math.random() * originalTypes.length)];
    }
    
    // Position the power-up directly above the platform
    const powerUpY = y - PLATFORM_HEIGHT - POWER_UP_SIZE - 5;
    
    powerUp = {
      type: powerUpType,
      x: x + width/2 - POWER_UP_SIZE/2, // center the power-up horizontally
      y: powerUpY,
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      active: true
    };
    
    console.log(`Created power-up of type ${powerUpType} at position (${Math.round(x + width/2)}, ${Math.round(powerUpY)}) on platform at y=${y}`);
  }
  
  return {
    id: platformIdCounter++,
    x,
    y,
    width,
    height: PLATFORM_HEIGHT,
    type,
    collapsed: false,
    powerUp
  };
}

// Draw a platform based on its type
export function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  switch (platform.type) {
    case PlatformType.NORMAL:
      drawNormalPlatform(ctx, platform);
      break;
    case PlatformType.SPIKE:
      drawSpikePlatform(ctx, platform);
      break;
    case PlatformType.COLLAPSING:
      drawCollapsingPlatform(ctx, platform);
      break;
    case PlatformType.CONVEYOR:
      drawConveyorPlatform(ctx, platform);
      break;
    case PlatformType.SPRING:
      drawSpringPlatform(ctx, platform);
      break;
  }
  
  // Draw power-up if the platform has one
  if (platform.powerUp && platform.powerUp.active) {
    drawPowerUp(ctx, platform.powerUp);
  }
}

// Draw a power-up
export function drawPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUp) {
  if (!powerUp.active) return;
  
  // Set color based on power-up type
  let color = '#FFFFFF';
  let text = '';
  let isAttackItem = false;
  
  switch (powerUp.type) {
    case PowerUpType.INVINCIBILITY:
      color = '#FFD700'; // Gold
      text = '★';
      break;
    case PowerUpType.SLOW_FALL:
      color = '#87CEEB'; // Sky Blue
      text = '☂';
      break;
    case PowerUpType.HEALTH_BOOST:
      color = '#FF6B6B'; // Red
      text = '♥';
      break;
    case PowerUpType.SHIELD:
      color = ATTACK_ITEM_COLORS['shield'];
      text = ATTACK_ITEM_ICONS['shield'];
      isAttackItem = true;
      break;
    case PowerUpType.ATTACK_SPIKE_PLATFORM:
      color = ATTACK_ITEM_COLORS['attack_spike_platform'];
      text = ATTACK_ITEM_ICONS['attack_spike_platform'];
      isAttackItem = true;
      break;
    case PowerUpType.ATTACK_SPEED_UP:
      color = ATTACK_ITEM_COLORS['attack_speed_up'];
      text = ATTACK_ITEM_ICONS['attack_speed_up'];
      isAttackItem = true;
      break;
    case PowerUpType.ATTACK_NARROW_PLATFORM:
      color = ATTACK_ITEM_COLORS['attack_narrow_platform'];
      text = ATTACK_ITEM_ICONS['attack_narrow_platform'];
      isAttackItem = true;
      break;
    case PowerUpType.ATTACK_REVERSE_CONTROLS:
      color = ATTACK_ITEM_COLORS['attack_reverse_controls'];
      text = ATTACK_ITEM_ICONS['attack_reverse_controls'];
      isAttackItem = true;
      break;
    case PowerUpType.ATTACK_TRUE_REVERSE:
      color = ATTACK_ITEM_COLORS['attack_true_reverse'];
      text = ATTACK_ITEM_ICONS['attack_true_reverse'];
      isAttackItem = true;
      break;
    default:
      console.warn('Unknown power-up type:', powerUp.type);
      break;
  }
  
  // Draw the power-up with a pulsing animation to make it more visible
  const time = Date.now() * 0.003;
  const pulseFactor = 0.9 + Math.sin(time) * 0.1; // Subtle pulsing
  
  // Make attack items slightly larger for better visibility and easier collection
  const sizeMultiplier = isAttackItem ? 1.2 : 1.0;
  const radius = (powerUp.width / 2) * pulseFactor * sizeMultiplier;
  
  // Draw the power-up circle
  ctx.beginPath();
  ctx.arc(
    powerUp.x + powerUp.width / 2,
    powerUp.y + powerUp.height / 2,
    radius,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw the power-up icon/text
  ctx.fillStyle = '#000000';
  ctx.font = isAttackItem ? 'bold 16px Arial' : '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    text,
    powerUp.x + powerUp.width / 2,
    powerUp.y + powerUp.height / 2
  );
  
  // Draw a subtle glow effect for better visibility
  const glowRadius = radius * 1.3;
  const gradient = ctx.createRadialGradient(
    powerUp.x + powerUp.width / 2,
    powerUp.y + powerUp.height / 2,
    radius,
    powerUp.x + powerUp.width / 2,
    powerUp.y + powerUp.height / 2,
    glowRadius
  );
  
  // Make attack items glow more intensely
  if (isAttackItem) {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.7, `rgba(${hexToRgb(color)}, 0.3)`);
    gradient.addColorStop(1, `rgba(${hexToRgb(color)}, 0.5)`);
  } else {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
  }
  
  ctx.beginPath();
  ctx.arc(
    powerUp.x + powerUp.width / 2,
    powerUp.y + powerUp.height / 2,
    glowRadius,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // If it's an attack item, expand the hitbox for easier collection
  if (isAttackItem) {
    powerUp.width = POWER_UP_SIZE * 1.2;
    powerUp.height = POWER_UP_SIZE * 1.2;
  }
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): string {
  // Remove the # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
}

// Draw a normal platform
function drawNormalPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  ctx.fillStyle = PLATFORM_COLORS.NORMAL;
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
}

// Draw a platform with spikes
function drawSpikePlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  // Draw base platform
  ctx.fillStyle = PLATFORM_COLORS.NORMAL;
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  
  // Draw spikes
  ctx.fillStyle = PLATFORM_COLORS.SPIKE;
  const spikeCount = Math.floor(platform.width / 15);
  const spikeWidth = platform.width / spikeCount;
  
  for (let i = 0; i < spikeCount; i++) {
    const x = platform.x + i * spikeWidth;
    
    ctx.beginPath();
    ctx.moveTo(x, platform.y);
    ctx.lineTo(x + spikeWidth / 2, platform.y - SPIKE_HEIGHT);
    ctx.lineTo(x + spikeWidth, platform.y);
    ctx.closePath();
    ctx.fill();
  }
}

// Draw a collapsing platform
function drawCollapsingPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  ctx.fillStyle = PLATFORM_COLORS.COLLAPSING;
  
  // If timer is active, show visual indicator of collapse
  if (platform.timer !== undefined) {
    const alpha = Math.max(0.2, platform.timer / 300);
    ctx.globalAlpha = alpha;
    
    // Add a "cracking" effect as platform collapses
    const crackProgress = 1 - alpha;
    if (crackProgress > 0.3) {
      // Draw cracks as platform is about to collapse
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 1;
      
      const segments = Math.floor(platform.width / 10);
      for (let i = 0; i < segments; i++) {
        const x = platform.x + i * 10;
        const offsetY = Math.sin(i * 0.7) * 2 * crackProgress;
        
        ctx.beginPath();
        ctx.moveTo(x, platform.y + offsetY);
        ctx.lineTo(x + 10, platform.y - offsetY);
        ctx.stroke();
      }
    }
  }
  
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  ctx.globalAlpha = 1;
}

// Draw a conveyor belt platform
function drawConveyorPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  // Draw base platform
  ctx.fillStyle = PLATFORM_COLORS.NORMAL;
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  
  // Draw conveyor belt pattern
  const time = Date.now() * 0.001;
  const direction = platform.id % 2 === 0 ? 1 : -1;
  const offset = (time * direction * 30) % 30;
  
  ctx.fillStyle = PLATFORM_COLORS.CONVEYOR;
  const stripeCount = Math.ceil(platform.width / 15);
  
  for (let i = -1; i < stripeCount + 1; i++) {
    const x = platform.x + (i * 15 + offset * direction) % platform.width;
    
    if (x >= platform.x && x + 7 <= platform.x + platform.width) {
      ctx.fillRect(x, platform.y, 7, platform.height);
    }
  }
}

// Draw a spring platform
function drawSpringPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  // Draw base
  ctx.fillStyle = PLATFORM_COLORS.NORMAL;
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height / 2);
  
  // Draw spring
  ctx.fillStyle = PLATFORM_COLORS.SPRING;
  const springWidth = platform.width * 0.5;
  const springX = platform.x + platform.width / 2 - springWidth / 2;
  
  // Draw spring coil
  const springHeight = platform.height * 1.5;
  const springY = platform.y - springHeight + platform.height / 2;
  
  // Spring base
  ctx.fillRect(springX, platform.y - platform.height / 2, springWidth, platform.height / 2);
  
  // Spring top
  ctx.beginPath();
  ctx.moveTo(springX, springY + springHeight);
  ctx.lineTo(springX + springWidth, springY + springHeight);
  ctx.lineTo(springX + springWidth * 0.8, springY);
  ctx.lineTo(springX + springWidth * 0.2, springY);
  ctx.closePath();
  ctx.fill();
}
