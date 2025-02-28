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

    // Generate additional platforms with appropriate spacing and variation
    // Start from the first platform position
    let yPos = startY + PLATFORM_VERTICAL_GAP;
    
    // Track the last generated Y position to prevent duplicate heights
    let lastYPositions: number[] = [startY];
    
    // Increase initial platform count to ensure more floors are available
    // Generate platforms all the way to double the canvas height
    while (yPos < this.canvas.height * 2) {
      // Add some slight vertical variation to avoid exact spacing
      const variance = PLATFORM_VERTICAL_GAP * 0.15; // 15% variance
      yPos += (Math.random() * variance) - (variance / 2);
      
      // Skip if too close to any recent platform's height
      const tooClose = lastYPositions.some(lastY => Math.abs(lastY - yPos) < PLATFORM_HEIGHT * 1.5);
      if (tooClose) {
        yPos += PLATFORM_HEIGHT * 2; // Skip ahead if too close
      }
      
      // Add more platforms at each level for better horizontal distribution
      // This gives the player more landing options
      const platformCount = Math.random() < 0.4 ? 2 : 1; // 40% chance of 2 platforms at same level
      
      // Store x positions of platforms at this level to prevent overlap
      const xPositionsAtThisLevel: number[] = [];
      
      for (let i = 0; i < platformCount; i++) {
        // For multiple platforms, ensure better horizontal distribution
        let xOffset = 0;
        if (i > 0) {
          // If second platform, place it on the opposite side
          const firstX = xPositionsAtThisLevel[0];
          const firstIsLeft = firstX < this.canvas.width / 2;
          
          // Place opposite to first platform with some randomness
          xOffset = firstIsLeft ? 
            this.canvas.width * (0.5 + Math.random() * 0.3) : // Right side
            -(this.canvas.width * (0.5 + Math.random() * 0.3)); // Left side
        } else {
          // Alternate sides for first platform at each level for variety
          xOffset = Math.random() < 0.5 ? 
            -(this.canvas.width * 0.25 * Math.random()) : // Left side bias
            (this.canvas.width * 0.25 * Math.random());   // Right side bias
        }
        
        // Create platform and track its position
        const platform = this.addPlatform(yPos, xOffset);
        xPositionsAtThisLevel.push(platform.x);
      }
      
      // Remember this Y position to avoid duplicates
      lastYPositions.push(yPos);
      if (lastYPositions.length > 3) { // Only keep track of the 3 most recent
        lastYPositions.shift();
      }
      
      // Move to next level
      yPos += PLATFORM_VERTICAL_GAP;
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
    // More balanced platform type distribution with more normal platforms at the start
    // This is more forgiving for new players
    const rand = Math.random();
    const score = this.score;
    
    // As score increases, make game harder by spawning more special platforms
    if (score < 100) {
      // Early game: mostly normal platforms
      if (rand < 0.85) return PlatformType.NORMAL;
      if (rand < 0.9) return PlatformType.SPRING;
      if (rand < 0.95) return PlatformType.CONVEYOR;
      if (rand < 0.98) return PlatformType.COLLAPSING;
      return PlatformType.SPIKE;
    } else if (score < 500) {
      // Mid game: increased difficulty
      if (rand < 0.7) return PlatformType.NORMAL;
      if (rand < 0.8) return PlatformType.CONVEYOR;
      if (rand < 0.9) return PlatformType.SPRING;
      if (rand < 0.95) return PlatformType.COLLAPSING;
      return PlatformType.SPIKE;
    } else {
      // Late game: challenging
      if (rand < 0.5) return PlatformType.NORMAL;
      if (rand < 0.65) return PlatformType.CONVEYOR;
      if (rand < 0.8) return PlatformType.COLLAPSING;
      if (rand < 0.9) return PlatformType.SPIKE;
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
        
        // Chance to generate multiple platforms at the same height increases with score
        const multiPlatformChance = Math.min(0.4, 0.2 + this.score / 1000);
        const platformCount = Math.random() < multiPlatformChance ? 2 : 1;
        
        for (let i = 0; i < platformCount; i++) {
          // For multiple platforms, offset them horizontally
          const xOffset = i === 0 ? 0 : (Math.random() > 0.5 ? 
                         this.canvas.width / 2 : -this.canvas.width / 2);
          this.addPlatform(newY, xOffset);
        }
        
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

    // Ceiling collision handling
    if (this.character.y <= CEILING_HEIGHT) {
      // If character tries to go above ceiling, stop upward movement
      if (this.character.velocityY < 0) {
        this.character.velocityY = 0;
      }
      
      // Prevent character from going above ceiling - just stop them at the border
      if (this.character.y < CEILING_HEIGHT) {
        this.character.y = CEILING_HEIGHT;
        
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
    
    // Calculate a more precise triangle hit area for each spike
    const charMidX = this.character.x + this.character.width/2;
    const distanceFromSpikeCenter = Math.abs(charMidX - spikeXCenter);
    const hitAreaWidth = spikeWidth * 0.8; // 80% of spike width for more forgiving hit detection
    
    // Character is touching a spike if they're below ceiling but close enough to a spike
    if (
      this.character.y <= CEILING_HEIGHT + SPIKE_HEIGHT &&  // Within vertical range of spikes
      this.character.y > CEILING_HEIGHT &&                  // Below the ceiling itself
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
    
    // Draw ceiling background
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, 0, this.canvas.width, CEILING_HEIGHT);

    // Draw spikes along the bottom of the ceiling
    ctx.fillStyle = '#F25C54'; // Red color for danger
    const spikeWidth = this.canvas.width / CEILING_SPIKE_COUNT;
    
    for (let i = 0; i < CEILING_SPIKE_COUNT; i++) {
      const x = i * spikeWidth;
      
      // Draw triangle spikes
      ctx.beginPath();
      ctx.moveTo(x, CEILING_HEIGHT); // Left corner
      ctx.lineTo(x + spikeWidth / 2, CEILING_HEIGHT + SPIKE_HEIGHT); // Bottom tip
      ctx.lineTo(x + spikeWidth, CEILING_HEIGHT); // Right corner
      ctx.closePath();
      ctx.fill();
      
      // Add highlight/shadow effect to spikes for better visibility
      ctx.beginPath();
      ctx.moveTo(x, CEILING_HEIGHT);
      ctx.lineTo(x + spikeWidth / 2, CEILING_HEIGHT + SPIKE_HEIGHT);
      ctx.strokeStyle = '#FF8080'; // Lighter red for highlight
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}