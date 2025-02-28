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
  invincibleUntil?: number; // Timestamp when invincibility ends
  isInvincible?: boolean; // Flag to check invincibility state
}

export function drawCharacter(ctx: CanvasRenderingContext2D, character: Character) {
  const { x, y, width, height, facingDirection, isInvincible } = character;
  
  ctx.save();
  
  // Handle invincibility visual effect (flashing)
  if (isInvincible) {
    // Create flashing effect by alternating opacity based on timestamp
    const flashRate = INVINCIBILITY_FLASH_RATE;
    const shouldFlash = Math.floor(Date.now() / flashRate) % 2 === 0;
    
    if (shouldFlash) {
      ctx.globalAlpha = 0.5; // Half transparency for flash effect
    }
    
    // Add a glow effect to show invincibility
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;
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
    // Draw a halo effect around the character
    ctx.strokeStyle = '#FFD166';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]); // Dashed line for dynamic effect
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}
