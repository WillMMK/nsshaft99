import { 
  PLATFORM_HEIGHT, 
  PLATFORM_COLORS,
  SPIKE_HEIGHT
} from './constants';

// Platform types
export enum PlatformType {
  NORMAL,
  SPIKE,
  COLLAPSING,
  CONVEYOR,
  SPRING
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
  return {
    id: platformIdCounter++,
    x,
    y,
    width,
    height: PLATFORM_HEIGHT,
    type,
    collapsed: false
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
