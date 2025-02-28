import { 
  CHARACTER_SIZE, 
  GRAVITY, 
  TERMINAL_VELOCITY, 
  CHARACTER_SPEED,
  PLATFORM_VERTICAL_GAP, 
  MIN_PLATFORM_WIDTH, 
  MAX_PLATFORM_WIDTH,
  INITIAL_PROBABILITIES,
  PLATFORM_HEIGHT,
  CEILING_HEIGHT,
  CEILING_SPIKE_COUNT,
  SPIKE_HEIGHT,
  HEALTH_GAIN,
  DAMAGE_AMOUNT,
  SCORE_PER_PLATFORM,
  SCORE_PER_DISTANCE,
  INVINCIBILITY_DURATION
} from './constants';
import { Platform, PlatformType, createPlatform, drawPlatform } from './platform';
import { drawCharacter, Character } from './character';
import { playSound } from './audio';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  score: number = 0;
  health: number = 100;
  gameActive: boolean = true;
  character: Character;
  isMovingLeft: boolean = false;
  isMovingRight: boolean = false;
  lastPlatformLanded: Platform | null = null;
  platforms: Platform[] = [];
  totalDistanceTraveled: number = 0;
  cameraY: number = 0;
  private MOVE_SPEED = 5;
  private GRAVITY_FORCE = 0.5;
  private SCROLL_SPEED = 2;
  onUpdateHealth: (health: number) => void;
  onUpdateScore: (score: number) => void;
  onGameOver: () => void;

  constructor(
    canvas: HTMLCanvasElement, 
    onUpdateHealth: (health: number) => void,
    onUpdateScore: (score: number) => void,
    onGameOver: () => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onUpdateHealth = onUpdateHealth;
    this.onUpdateScore = onUpdateScore;
    this.onGameOver = onGameOver;

    // Increase difficulty parameters
    this.MOVE_SPEED = 5.5;      // Faster horizontal movement (was 5)
    this.GRAVITY_FORCE = 0.6;   // Stronger gravity (was 0.5)
    this.SCROLL_SPEED = 2.5;    // Faster screen scrolling (was 2)

    console.log("Canvas dimensions:", canvas.width, canvas.height);

    // Position character slightly above the start platform at 60% canvas height
    this.character = {
      x: canvas.width / 2 - CHARACTER_SIZE / 2,
      y: canvas.height * 0.6 - CHARACTER_SIZE - 5, // 5px above platform
      width: CHARACTER_SIZE,
      height: CHARACTER_SIZE,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      facingDirection: 1,
      isInvincible: false,
      invincibleUntil: 0
    };

    console.log("Character initialized at:", this.character.x, this.character.y);
    this.cameraY = this.character.y - this.canvas.height / 2;
    this.initializePlatforms();
    this.health = 100;
    this.onUpdateHealth(this.health);
    this.score = 0;
    this.onUpdateScore(this.score);
    this.totalDistanceTraveled = 0;
    this.gameActive = true;
  }

  initializePlatforms() {
    this.platforms = [];
    
    // Place the start platform at 60% of canvas height for better positioning
    const startX = this.canvas.width / 2 - 50;
    const startY = this.canvas.height * 0.6;
    console.log("Adding start platform at:", startX, startY);
    
    // Create a wider platform for the starting position to make it easier
    const startPlatform = createPlatform(startX, startY, 100, PlatformType.NORMAL);
    this.platforms.push(startPlatform);

    // Generate additional platforms with appropriate spacing - one per level
    // Start from the first platform position
    let yPos = startY;
    
    // Generate platforms all the way to double the canvas height,
    // with exactly one platform per level
    while (yPos < this.canvas.height * 2) {
      // Move to next level with fixed distance
      yPos += PLATFORM_VERTICAL_GAP;
      
      // Calculate a random horizontal position for the platform
      // Ensure platforms aren't too close to the edges
      const edgeMargin = MIN_PLATFORM_WIDTH * 0.5;
      const availableWidth = this.canvas.width - (2 * edgeMargin) - MIN_PLATFORM_WIDTH;
      const randomX = edgeMargin + (Math.random() * availableWidth);
      
      // Create just one platform at each level with randomized horizontal position
      const platform = createPlatform(
        randomX, 
        yPos, 
        MIN_PLATFORM_WIDTH + Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH),
        PlatformType.NORMAL
      );
      
      // Add the platform to our collection
      this.platforms.push(platform);
    }
    
    console.log("Initialized", this.platforms.length, "platforms");
  }

  addPlatform(yPos: number, xOffset: number = 0): Platform {
    // Restrict platform width to prevent excessively long platforms
    // that might trap the player or make navigation difficult
    // Use a much stricter maximum width to ensure platforms aren't too long
    const maxAllowedWidth = Math.min(MAX_PLATFORM_WIDTH, this.canvas.width * 0.4);
    const width = MIN_PLATFORM_WIDTH + Math.random() * (maxAllowedWidth - MIN_PLATFORM_WIDTH);
    
    // Calculate x position with the offset, ensuring platforms stay on screen
    let xPos = Math.random() * (this.canvas.width - width);
    
    if (xOffset !== 0) {
      // Apply the offset, but make sure the platform stays within bounds
      xPos = xPos + xOffset;
      xPos = Math.max(0, Math.min(this.canvas.width - width, xPos));
    }
    
    // Check for any platforms at exactly the same height and skip if found
    const exactSameHeightPlatforms = this.platforms.filter(p => 
      Math.abs(p.y - yPos) < 1
    );
    
    if (exactSameHeightPlatforms.length > 0) {
      // Shift height slightly to avoid exact same position
      yPos += PLATFORM_HEIGHT * 1.2;
    }
    
    // Check for platforms at similar heights that might overlap
    const similarHeightPlatforms = this.platforms.filter(p => 
      Math.abs(p.y - yPos) < PLATFORM_HEIGHT * 2
    );
    
    if (similarHeightPlatforms.length > 0) {
      // Check if our new platform would overlap with any existing platform
      const wouldOverlap = similarHeightPlatforms.some(p => {
        // More precise overlap detection
        const overlapLeft = xPos <= (p.x + p.width) && xPos >= p.x;
        const overlapRight = (xPos + width) >= p.x && (xPos + width) <= (p.x + p.width);
        const containsLeft = xPos <= p.x && (xPos + width) >= p.x;
        const containsRight = xPos <= (p.x + p.width) && (xPos + width) >= (p.x + p.width);
        
        return overlapLeft || overlapRight || containsLeft || containsRight;
      });
      
      if (wouldOverlap) {
        // Try multiple positions to find a non-overlapping spot
        let attempts = 5;
        let foundSpace = false;
        
        while (attempts > 0 && !foundSpace) {
          // Try different positions across the screen width
          xPos = Math.random() * (this.canvas.width - width);
          
          // Check if this new position would still overlap
          foundSpace = !similarHeightPlatforms.some(p => {
            const overlapLeft = xPos <= (p.x + p.width) && xPos >= p.x;
            const overlapRight = (xPos + width) >= p.x && (xPos + width) <= (p.x + p.width);
            const containsLeft = xPos <= p.x && (xPos + width) >= p.x;
            const containsRight = xPos <= (p.x + p.width) && (xPos + width) >= (p.x + p.width);
            
            return overlapLeft || overlapRight || containsLeft || containsRight;
          });
          
          attempts--;
        }
        
        // If still can't find space, shift the y position further down
        if (!foundSpace) {
          yPos += PLATFORM_VERTICAL_GAP * 0.4;
        }
        
        // Final bounds check
        xPos = Math.max(0, Math.min(this.canvas.width - width, xPos));
      }
    }
    
    let platformType = this.getPlatformType();
    
    // For the first 200 distance traveled, avoid spike platforms at lower positions
    // This gives the player time to learn the game before facing dangerous obstacles
    if (this.totalDistanceTraveled < 200 && platformType === PlatformType.SPIKE) {
      platformType = PlatformType.NORMAL;
    }
    
    const platform = createPlatform(xPos, yPos, width, platformType);
    this.platforms.push(platform);
    return platform;
  }

  getPlatformType(): PlatformType {
    // More challenging platform type distribution
    const rand = Math.random();
    const score = this.score;
    
    // As score increases, make game harder by spawning more special platforms
    if (score < 100) {
      // Early game: still moderately challenging
      if (rand < 0.7) return PlatformType.NORMAL;  // Reduced normal platforms
      if (rand < 0.8) return PlatformType.SPRING;
      if (rand < 0.9) return PlatformType.CONVEYOR;
      if (rand < 0.95) return PlatformType.COLLAPSING;
      return PlatformType.SPIKE;
    } else if (score < 400) {  // Reduced the mid-game threshold for faster progression
      // Mid game: more hazards
      if (rand < 0.55) return PlatformType.NORMAL;  // Less than half are normal platforms
      if (rand < 0.7) return PlatformType.CONVEYOR;
      if (rand < 0.8) return PlatformType.SPRING;
      if (rand < 0.9) return PlatformType.COLLAPSING;
      return PlatformType.SPIKE;
    } else {
      // Late game: very challenging
      if (rand < 0.4) return PlatformType.NORMAL;  // Only 40% normal platforms
      if (rand < 0.55) return PlatformType.CONVEYOR;
      if (rand < 0.7) return PlatformType.COLLAPSING;
      if (rand < 0.85) return PlatformType.SPIKE; // More spikes
      return PlatformType.SPRING;
    }
  }

  updateMovement(isMovingLeft: boolean, isMovingRight: boolean) {
    this.isMovingLeft = isMovingLeft;
    this.isMovingRight = isMovingRight;
    if (isMovingLeft && !isMovingRight) {
      this.character.facingDirection = -1;
    } else if (isMovingRight && !isMovingLeft) {
      this.character.facingDirection = 1;
    }
  }

  update() {
    if (!this.gameActive) return;
    this.updatePlatforms(); // Move platforms first
    this.updateCharacter();
    this.updateCamera();
    this.checkCollisions();
    this.checkGameOver();
    this.draw();
  }

  updateCamera() {
    // Use smooth camera following for better gameplay experience
    const targetCameraY = this.character.y - this.canvas.height / 3;
    
    // Smoothly interpolate camera position (lerp)
    this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    
    // Ensure camera doesn't go below zero (prevents seeing above ceiling)
    if (this.cameraY < 0) {
      this.cameraY = 0;
    }
  }

  updateCharacter() {
    // Movement based on input
    if (this.isMovingLeft && !this.isMovingRight) {
      this.character.x -= this.MOVE_SPEED;
    } 
    if (this.isMovingRight && !this.isMovingLeft) {
      this.character.x += this.MOVE_SPEED;
    }

    // Apply gravity and update position
    this.character.velocityY += this.GRAVITY_FORCE;
    if (this.character.velocityY > TERMINAL_VELOCITY) {
      this.character.velocityY = TERMINAL_VELOCITY;
    }
    this.character.y += this.character.velocityY;

    // Handle screen bounds
    if (this.character.x < 0) {
      this.character.x = 0;
    } else if (this.character.x + this.character.width > this.canvas.width) {
      this.character.x = this.canvas.width - this.character.width;
    }

    // Handle conveyor belt platforms
    if (this.lastPlatformLanded && this.lastPlatformLanded.type === PlatformType.CONVEYOR) {
      const conveyorDirection = this.lastPlatformLanded.id % 2 === 0 ? 1 : -1;
      this.character.x += conveyorDirection * 2.0;
    }
    
    // Update invincibility status
    if (this.character.isInvincible) {
      if (Date.now() > this.character.invincibleUntil!) {
        this.character.isInvincible = false;
      }
    }
  }

  updatePlatforms() {
    // Move all platforms upward at the scroll speed
    for (const platform of this.platforms) {
      platform.y -= this.SCROLL_SPEED;
      if (platform.timer !== undefined) {
        platform.timer -= 16;
      }
    }

    // Move character with the platform if standing on it
    if (this.lastPlatformLanded && !this.lastPlatformLanded.collapsed) {
      this.character.y -= this.SCROLL_SPEED;
    }

    this.totalDistanceTraveled += this.SCROLL_SPEED;
    this.score = Math.floor(this.totalDistanceTraveled * SCORE_PER_DISTANCE);
    this.onUpdateScore(this.score);

    // Remove platforms that are off the top of the screen
    this.platforms = this.platforms.filter(platform => platform.y + PLATFORM_HEIGHT > 0);

    // Find the lowest platform (furthest down the screen)
    if (this.platforms.length > 0) {
      const lowestPlatform = this.platforms.reduce(
        (lowest, current) => current.y > lowest.y ? current : lowest, 
        this.platforms[0]
      );
      
      // Calculate how far down we should generate platforms
      // We want to ensure platforms are generated well ahead of the player's descent
      const viewportBottom = this.cameraY + this.canvas.height;
      const extraDistance = this.canvas.height; // Generate one full screen height extra platforms
      
      // Keep generating platforms until we have enough below the viewport
      while (lowestPlatform.y < viewportBottom + extraDistance) {
        const newY = lowestPlatform.y + PLATFORM_VERTICAL_GAP;
        
        // Always generate exactly one platform per level as requested
        // This makes the game more challenging as there are fewer options
        
        // Randomize the horizontal position for variety
        // Ensure platforms aren't too close to the edges
        const edgeMargin = MIN_PLATFORM_WIDTH * 0.5;
        const availableWidth = this.canvas.width - (2 * edgeMargin) - MIN_PLATFORM_WIDTH;
        const randomX = edgeMargin + (Math.random() * availableWidth);
        
        // Create just one platform with a random horizontal position
        this.addPlatform(newY, randomX - this.canvas.width/2);
        
        // Log platform creation for debugging
        console.log(`Created platform at y=${Math.round(newY)}, with randomX=${Math.round(randomX)}`)
        
        // Update our reference to the new lowest platform
        const updatedLowestPlatform = this.platforms.reduce(
          (lowest, current) => current.y > lowest.y ? current : lowest, 
          this.platforms[0]
        );
        
        // If we didn't actually get a lower platform, manually increment to avoid infinite loop
        if (updatedLowestPlatform.y <= lowestPlatform.y) {
          break;
        }
        
        // Update for next iteration
        lowestPlatform.y = updatedLowestPlatform.y;
      }
    } else {
      // If no platforms exist, create one at 80% of canvas height
      this.addPlatform(this.canvas.height * 0.8);
    }
    
    // Debug log for platform count (can be removed in production)
    if (this.score % 100 === 0) {
      console.log(`Platforms: ${this.platforms.length}, Character Y: ${Math.round(this.character.y)}`);
    }
  }

  checkCollisions() {
    let isOnPlatform = false;
    this.lastPlatformLanded = null;

    // Get ceiling position that's pursuing the player (same calculation as in drawCeiling)
    const targetCeilingDistance = 180; // Distance to maintain above player
    const pursuingCeilingY = Math.max(0, this.character.y - targetCeilingDistance);
    const ceilingYPos = Math.min(this.cameraY, pursuingCeilingY);
    const ceilingBottomY = ceilingYPos + CEILING_HEIGHT;
    
    // Ceiling collision handling - ceiling follows the character with the camera
    if (this.character.y <= ceilingBottomY) {
      // If character tries to go above ceiling, stop upward movement
      if (this.character.velocityY < 0) {
        this.character.velocityY = 0;
      }
      
      // Prevent character from going above ceiling - just stop them at the border
      if (this.character.y < ceilingBottomY) {
        this.character.y = ceilingBottomY;
        
        // Apply instantaneous and deadly damage when hitting the ceiling
        if (!this.character.isInvincible) {
          // Kill the character instantly for touching ceiling
          this.health = 0;  // Set health to 0 directly
          this.onUpdateHealth(this.health);
          playSound('hurt');
          
          // Trigger game over immediately
          this.gameActive = false;
          this.onGameOver();
        }
      }
    }
    
    // Check for collision with ceiling spikes
    // We need a separate check since they point downward from the ceiling
    const spikeWidth = this.canvas.width / CEILING_SPIKE_COUNT;
    const spikeIndex = Math.floor(this.character.x / spikeWidth);
    const spikeXCenter = spikeIndex * spikeWidth + spikeWidth / 2;
    
    // Calculate a more aggressive triangle hit area for each spike
    const charMidX = this.character.x + this.character.width/2;
    const distanceFromSpikeCenter = Math.abs(charMidX - spikeXCenter);
    const hitAreaWidth = spikeWidth; // Full spike width for more challenging gameplay
    
    // Calculate spike tip position (doubled size to match visual spikes)
    const spikeLength = SPIKE_HEIGHT * 2;
    
    // Character is touching a spike if they're below ceiling but close enough to a spike
    if (
      this.character.y <= ceilingBottomY + spikeLength &&  // Within vertical range of spikes
      this.character.y > ceilingBottomY &&                 // Below the ceiling itself
      distanceFromSpikeCenter < hitAreaWidth/2 &&          // Within horizontal hit range
      !this.character.isInvincible                         // Not invincible
    ) {
      // Instant death for spike contact
      this.health = 0;  // Set health to 0 directly
      this.onUpdateHealth(this.health);
      playSound('hurt');
      
      // Trigger game over immediately
      this.gameActive = false;
      this.onGameOver();
    }

    // Check platform collisions
    for (const platform of this.platforms) {
      if (platform.collapsed) continue;

      const onPlatformX = this.character.x + this.character.width > platform.x && 
                          this.character.x < platform.x + platform.width;
      const onPlatformY = this.character.y + this.character.height <= platform.y + 5 && 
                          this.character.y + this.character.height + this.character.velocityY >= platform.y;

      if (onPlatformX && onPlatformY && this.character.velocityY >= 0) {
        this.character.y = platform.y - this.character.height;
        this.character.velocityY = 0;
        isOnPlatform = true;
        this.lastPlatformLanded = platform;

        switch (platform.type) {
          case PlatformType.NORMAL:
            this.heal();
            this.score += SCORE_PER_PLATFORM;
            this.onUpdateScore(this.score);
            break;
          case PlatformType.SPIKE:
            this.takeDamage();
            break;
          case PlatformType.COLLAPSING:
            if (platform.timer === undefined) {
              platform.timer = 300;
              playSound('collapse');
            }
            break;
          case PlatformType.SPRING:
            this.character.velocityY = -TERMINAL_VELOCITY * 1.2;
            playSound('jump');
            break;
        }
      }
    }

    // Update collapsing platforms
    for (const platform of this.platforms) {
      if (platform.type === PlatformType.COLLAPSING && platform.timer !== undefined && platform.timer <= 0) {
        platform.collapsed = true;
      }
    }
  }

  checkGameOver() {
    const lowestPlatformY = this.platforms.length > 0
      ? this.platforms.reduce((lowest, current) => current.y > lowest.y ? current : lowest, this.platforms[0]).y
      : this.canvas.height;
    if (this.character.y > lowestPlatformY + this.canvas.height) {
      this.gameActive = false;
      this.onGameOver();
    }
    if (this.health <= 0) {
      this.gameActive = false;
      this.onGameOver();
    }
  }

  takeDamage() {
    // Skip damage if character is invincible
    if (this.character.isInvincible) {
      return;
    }
    
    // Apply damage
    this.health -= DAMAGE_AMOUNT;
    if (this.health < 0) this.health = 0;
    this.onUpdateHealth(this.health);
    playSound('hurt');
    
    // Make character invincible for a short period
    this.character.isInvincible = true;
    this.character.invincibleUntil = Date.now() + INVINCIBILITY_DURATION;
    
    // Visual feedback for taking damage
    this.character.velocityY = -TERMINAL_VELOCITY * 0.5; // Small bounce to avoid consecutive hits
  }

  heal() {
    this.health += HEALTH_GAIN;
    if (this.health > 100) this.health = 100;
    this.onUpdateHealth(this.health);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(0, -this.cameraY);

    this.drawCeiling();
    for (const platform of this.platforms) {
      if (!platform.collapsed) {
        drawPlatform(ctx, platform);
      }
    }
    drawCharacter(ctx, this.character);

    ctx.restore();

    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.fillText(`Char: (${Math.round(this.character.x)}, ${Math.round(this.character.y)})`, 10, 60);
    ctx.fillText(`CameraY: ${Math.round(this.cameraY)}`, 10, 70);
    ctx.fillText(`Moving: ${this.isMovingLeft ? 'LEFT' : ''}${this.isMovingRight ? 'RIGHT' : ''}`, 10, 80);
    ctx.fillText(`Platforms: ${this.platforms.length}`, 10, 90); // Adjusted position
    ctx.fillText(`Score: ${this.score}`, 10, 100); // Added score display
  }

  drawCeiling() {
    const ctx = this.ctx;
    
    // Make ceiling pursue the player - keep it a fixed distance above the player
    // This ensures player can't escape it, adding constant pressure
    const targetCeilingDistance = 180; // Distance to maintain above player
    const pursuingCeilingY = Math.max(0, this.character.y - targetCeilingDistance);
    
    // Apply the ceiling position - either camera-based or actively pursuing
    // Choose the lower ceiling position to be more aggressive (closer to player)
    const ceilingY = Math.min(this.cameraY, pursuingCeilingY);
    
    // Draw ceiling background
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, ceilingY, this.canvas.width, CEILING_HEIGHT);

    // Draw spikes along the bottom of the ceiling
    ctx.fillStyle = '#F25C54'; // Red color for danger
    const spikeWidth = this.canvas.width / CEILING_SPIKE_COUNT;
    
    for (let i = 0; i < CEILING_SPIKE_COUNT; i++) {
      const x = i * spikeWidth;
      
      // Draw even larger triangle spikes for more challenge
      ctx.beginPath();
      ctx.moveTo(x, ceilingY + CEILING_HEIGHT); // Left corner
      ctx.lineTo(x + spikeWidth / 2, ceilingY + CEILING_HEIGHT + SPIKE_HEIGHT * 2); // Bottom tip (doubled size)
      ctx.lineTo(x + spikeWidth, ceilingY + CEILING_HEIGHT); // Right corner
      ctx.closePath();
      ctx.fill();
      
      // Add highlight/shadow effect to spikes for better visibility
      ctx.beginPath();
      ctx.moveTo(x, ceilingY + CEILING_HEIGHT);
      ctx.lineTo(x + spikeWidth / 2, ceilingY + CEILING_HEIGHT + SPIKE_HEIGHT * 2);
      ctx.strokeStyle = '#FF8080'; // Lighter red for highlight
      ctx.lineWidth = 1.5; // Slightly thicker line
      ctx.stroke();
      
      // Add a pulsing glow effect to make spikes more threatening
      const glowIntensity = (Math.sin(Date.now() / 200) + 1) / 2; // Pulsing value between 0 and 1
      ctx.beginPath();
      ctx.moveTo(x, ceilingY + CEILING_HEIGHT);
      ctx.lineTo(x + spikeWidth / 2, ceilingY + CEILING_HEIGHT + SPIKE_HEIGHT * 2);
      ctx.lineTo(x + spikeWidth, ceilingY + CEILING_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 50, 50, ${glowIntensity * 0.3})`; // Semi-transparent red with pulsing alpha
      ctx.fill();
    }
  }
}