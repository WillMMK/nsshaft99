import { 
  CHARACTER_COLOR, 
  FACE_COLOR, 
  EYES_COLOR,
  INVINCIBILITY_FLASH_RATE 
} from './constants';

export interface Character {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  velocityX: number;
  isJumping: boolean;
  facingDirection: number; // 1 for right, -1 for left
  
  // Power-up effects
  invincibleUntil?: number; // Timestamp when invincibility ends
  isInvincible?: boolean; // Flag to check invincibility state
  slowFallUntil?: number; // Timestamp when slow fall ends
  isSlowFall?: boolean; // Flag to check slow fall state
}

export function drawCharacter(ctx: CanvasRenderingContext2D, character: Character) {
  const { x, y, width, height, facingDirection, isInvincible, isSlowFall } = character;
  
  ctx.save();
  
  // Handle invincibility visual effect (flashing)
  if (isInvincible) {
    // Create more noticeable flashing effect by alternating between visibility states
    const flashRate = INVINCIBILITY_FLASH_RATE;
    const shouldFlash = Math.floor(Date.now() / flashRate) % 2 === 0;
    
    if (shouldFlash) {
      // Add a bright glow effect during flash
      ctx.shadowColor = '#FFD700'; // Gold color
      ctx.shadowBlur = 15;
      
      // Draw a protective aura
      const gradient = ctx.createRadialGradient(
        x + width/2, y + height/2, width/3,
        x + width/2, y + height/2, width
      );
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)'); // Gold with transparency
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');    // Transparent at the edge
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + width/2, y + height/2, width, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Semi-transparent on alternate frames
      ctx.globalAlpha = 0.7;
    }
  }
  
  // Draw the body (a circle)
  ctx.fillStyle = CHARACTER_COLOR;
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw the face (a smaller white circle)
  ctx.fillStyle = FACE_COLOR;
  ctx.beginPath();
  
  // Offset face slightly in direction character is facing
  const faceOffsetX = facingDirection * (width * 0.05);
  ctx.arc(
    x + width / 2 + faceOffsetX, 
    y + height / 2, 
    width / 3, 
    0, 
    Math.PI * 2
  );
  ctx.fill();
  
  // Draw the eyes (a little black oval)
  ctx.fillStyle = EYES_COLOR;
  
  // Offset eyes in direction character is facing
  const eyeOffsetX = facingDirection * (width * 0.1);
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2 + eyeOffsetX, 
    y + height / 2 - height * 0.05, 
    width / 8, 
    height / 10, 
    0, 
    0, 
    Math.PI * 2
  );
  ctx.fill();
  
  // Draw invincibility indicator if active
  if (isInvincible) {
    // Draw a pulsing shield effect
    const pulseRate = 300; // ms
    const pulseAmount = Math.sin(Date.now() / pulseRate) * 0.2 + 0.8; // value between 0.6 and 1.0
    
    ctx.strokeStyle = `rgba(255, 209, 102, ${pulseAmount})`; // Pulsing opacity
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]); // Dashed line for dynamic effect
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add stars/sparkles around character to emphasize invincibility
    const starCount = 3;
    const now = Date.now();
    
    for (let i = 0; i < starCount; i++) {
      const angle = (now / 500 + i * (Math.PI * 2 / starCount)) % (Math.PI * 2);
      const starX = x + width/2 + Math.cos(angle) * (width/2 + 8);
      const starY = y + height/2 + Math.sin(angle) * (height/2 + 8);
      
      // Draw a small star
      ctx.fillStyle = '#FFFFFF';
      drawStar(ctx, starX, starY, 4, 2, 4);
    }
  }
  
  ctx.restore();
}

// Helper function to draw stars for invincibility effect
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, outerRadius: number, innerRadius: number, spikes: number) {
  let rot = Math.PI / 2 * 3;
  let step = Math.PI / spikes;
  
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      x + Math.cos(rot) * outerRadius,
      y + Math.sin(rot) * outerRadius
    );
    rot += step;
    
    ctx.lineTo(
      x + Math.cos(rot) * innerRadius,
      y + Math.sin(rot) * innerRadius
    );
    rot += step;
  }
  
  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();
  ctx.fill();
}
