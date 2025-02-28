import { CHARACTER_COLOR, FACE_COLOR, EYES_COLOR } from './constants';

export interface Character {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  velocityX: number;
  isJumping: boolean;
  facingDirection: number; // 1 for right, -1 for left
}

export function drawCharacter(ctx: CanvasRenderingContext2D, character: Character) {
  const { x, y, width, height, facingDirection } = character;
  
  ctx.save();
  
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
  
  ctx.restore();
}
