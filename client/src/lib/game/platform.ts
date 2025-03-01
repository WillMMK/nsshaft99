import { 
  PLATFORM_HEIGHT, 
  PLATFORM_COLORS,
  SPIKE_HEIGHT,
  PowerUpType,
  POWER_UP_SIZE,
  POWER_UP_SPAWN_CHANCE
} from './constants';

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
  type: PlatformType
): Platform {
  // Randomly add power-ups to platforms with POWER_UP_SPAWN_CHANCE probability
  let powerUp: PowerUp | undefined;
  
  // Don't spawn power-ups on spike or collapsing platforms
  if (type !== PlatformType.SPIKE && type !== PlatformType.COLLAPSING && Math.random() < POWER_UP_SPAWN_CHANCE) {
    // Choose a random power-up type
    const powerUpType = Math.floor(Math.random() * 3);
    
    powerUp = {
      type: powerUpType,
      x: x + width/2 - POWER_UP_SIZE/2, // center the power-up horizontally
      y: y,                            // position at the top of the platform
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      active: true
    };
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
  // Position the power-up above the platform
  const centerX = powerUp.x + powerUp.width / 2;
  const centerY = powerUp.y - 10; // Float above platform
  
  // Draw glowing circle
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, powerUp.width / 2
  );
  
  // Set colors based on power-up type
  switch (powerUp.type) {
    case PowerUpType.INVINCIBILITY:
      // Golden glow for invincibility
      gradient.addColorStop(0, 'rgba(255, 255, 0, 0.9)');
      gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.7)');
      gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
      break;
    case PowerUpType.SLOW_FALL:
      // Blue glow for slow fall
      gradient.addColorStop(0, 'rgba(0, 191, 255, 0.9)');
      gradient.addColorStop(0.7, 'rgba(30, 144, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(65, 105, 225, 0)');
      break;
    case PowerUpType.HEALTH_BOOST:
      // Green glow for health boost
      gradient.addColorStop(0, 'rgba(50, 205, 50, 0.9)');
      gradient.addColorStop(0.7, 'rgba(34, 139, 34, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 100, 0, 0)');
      break;
  }
  
  // Draw the power-up with pulsing animation
  const time = Date.now() * 0.003;
  const pulseFactor = 0.8 + Math.sin(time) * 0.2;
  const radius = powerUp.width / 2 * pulseFactor;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw icon inside based on type
  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let icon = '';
  switch (powerUp.type) {
    case PowerUpType.INVINCIBILITY:
      icon = '★'; // Star for invincibility
      break;
    case PowerUpType.SLOW_FALL:
      icon = '↓'; // Down arrow for slow fall
      break;
    case PowerUpType.HEALTH_BOOST:
      icon = '+'; // Plus for health boost
      break;
  }
  
  ctx.fillText(icon, centerX, centerY);
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
