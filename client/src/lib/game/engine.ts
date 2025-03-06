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
  INVINCIBILITY_DURATION,
  BASE_SCROLL_SPEED,
  SCROLL_SPEED_INCREMENT,
  MAX_SCROLL_SPEED,
  SCORE_PER_INCREMENT,
  PowerUpType,
  POWER_UP_SIZE,
  POWER_UP_SPAWN_CHANCE,
  INVINCIBILITY_POWER_UP_DURATION,
  SLOW_FALL_POWER_UP_DURATION,
  SLOW_FALL_FACTOR,
  HEALTH_BOOST_AMOUNT,
  PLAYER_COLORS
} from './constants';
import { Platform, PlatformType, createPlatform, drawPlatform } from './platform';
import { drawCharacter, Character } from './character';
import { playSound, playAttackSound } from './audio';
import { Player, AttackType } from '@/types';
import { GameState } from '@/contexts/GameStateContext';

// Define a NetworkPlayer interface for backward compatibility
interface NetworkPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  score: number;
  velocityY: number;
  velocityX: number;
  isJumping: boolean;
  facingDirection: number;
  isInvincible?: boolean;
  isSlowFall?: boolean;
}

// Define an Attack interface for backward compatibility
interface Attack {
  type: AttackType;
  fromPlayerId: string;
  toPlayerId: string;
  duration?: number;
}

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
  isMultiplayer: boolean = false;
  otherPlayers: Record<string, NetworkPlayer> = {};
  localPlayerId: string = '';
  playerColors: Record<string, string> = {};
  activeAttacks: Attack[] = [];
  isControlsReversed: boolean = false;
  isTrueReverse: boolean = false;
  narrowNextPlatforms: number = 0;
  private frameCount: number = 0;
  private onUpdateGameState?: (state: Partial<GameState>) => void;

  constructor(
    canvas: HTMLCanvasElement, 
    onUpdateHealth: (health: number) => void,
    onUpdateScore: (score: number) => void,
    onGameOver: () => void,
    isMultiplayer: boolean = false,
    onUpdateGameState?: (state: Partial<GameState>) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onUpdateHealth = onUpdateHealth;
    this.onUpdateScore = onUpdateScore;
    this.onGameOver = onGameOver;
    this.onUpdateGameState = onUpdateGameState;

    // Increase difficulty parameters
    this.MOVE_SPEED = 5.5;              // Faster horizontal movement (was 5)
    this.GRAVITY_FORCE = 0.6;           // Stronger gravity (was 0.5)
    this.SCROLL_SPEED = BASE_SCROLL_SPEED;  // Initialize with base scroll speed

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
      invincibleUntil: 0,
      isSlowFall: false,
      slowFallUntil: 0
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

    // Initialize multiplayer
    this.isMultiplayer = isMultiplayer;
  }

  initializePlatforms() {
    this.platforms = [];
    
    // Place the start platform at 60% of canvas height for better positioning
    const startX = this.canvas.width / 2 - 50;
    const startY = this.canvas.height * 0.6;
    console.log("Adding start platform at:", startX, startY);
    
    // Create a wider platform for the starting position to make it easier
    const startPlatform = createPlatform(startX, startY, 100, PlatformType.NORMAL);
    
    // Add a test power-up to the starting platform to ensure power-ups work
    startPlatform.powerUp = {
      type: PowerUpType.INVINCIBILITY,
      x: startX + 50 - POWER_UP_SIZE / 2,
      y: startY - POWER_UP_SIZE - 5,
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      active: true
    };
    
    console.log("Added test power-up to starting platform");
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
    // Reduce max width as score increases, as specified in requirements
    // Implement the formula: Math.max(MIN_PLATFORM_WIDTH, MAX_PLATFORM_WIDTH - (this.score / 100))
    const platformWidthReduction = Math.min(MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH, this.score / 100);
    const maxAllowedWidth = Math.max(
      MIN_PLATFORM_WIDTH,
      MAX_PLATFORM_WIDTH - platformWidthReduction
    );
    
    // Calculate width between min and max allowed (which now decreases with score)
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
    // Implementing the platform type distribution with adjusted score thresholds
    // Since we reduced score accumulation 10x, we need to adjust the thresholds accordingly
    const rand = Math.random();
    const score = this.score;
    
    if (score < 200) {
      // Early game: mostly safe platforms (0-200)
      if (rand < 0.7) return PlatformType.NORMAL;
      if (rand < 0.8) return PlatformType.SPRING;
      if (rand < 0.9) return PlatformType.CONVEYOR;
      return PlatformType.COLLAPSING;
    } else if (score < 500) {
      // Mid game: introduce some hazards (200-500)
      if (rand < 0.5) return PlatformType.NORMAL;
      if (rand < 0.65) return PlatformType.SPRING;
      if (rand < 0.8) return PlatformType.CONVEYOR;
      if (rand < 0.9) return PlatformType.COLLAPSING;
      return PlatformType.SPIKE;
    } else {
      // Late game: high risk (500+)
      if (rand < 0.3) return PlatformType.NORMAL;
      if (rand < 0.45) return PlatformType.SPRING;
      if (rand < 0.6) return PlatformType.CONVEYOR;
      if (rand < 0.8) return PlatformType.COLLAPSING;
      return PlatformType.SPIKE;
    }
  }

  updateMovement(isMovingLeft: boolean, isMovingRight: boolean) {
    // Handle both reverse effects
    if (this.isControlsReversed || this.isTrueReverse) {
      // If controls are reversed by either effect, swap left and right
      const temp = isMovingLeft;
      isMovingLeft = isMovingRight;
      isMovingRight = temp;
      console.log('Movement reversed: left =', isMovingLeft, 'right =', isMovingRight);
    }
    
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
    
    // Increment frame counter
    this.frameCount++;
    
    // Critical updates that run every frame
    this.updateCharacter();
    
    // Platform scrolling needs to happen every frame for smooth movement
    // Move platforms and update score
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
    
    this.checkCollisions();
    this.checkGameOver();
    
    // Non-critical updates that run every 2nd frame
    if (this.frameCount % 2 === 0) {
      // Platform cleanup and generation
      this.updatePlatforms();
      this.updateCamera();
    }
    
    // Visual updates
    this.draw();

    // After updating the local player and game state, render other players
    if (this.isMultiplayer) {
      this.renderOtherPlayers();
    }
  }

  updateCamera() {
    // Use smooth camera following for better gameplay experience
    const targetCameraY = this.character.y - this.canvas.height / 3;
    
    // Smoothly interpolate camera position (lerp)
    //this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    this.cameraY -= this.SCROLL_SPEED;
    
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
    
    // Apply slow fall effect if active
    if (this.character.isSlowFall && this.character.velocityY > 0) {
      // Apply slow fall factor to downward movement only
      this.character.velocityY *= SLOW_FALL_FACTOR;
    }
    
    // Apply terminal velocity
    if (this.character.velocityY > TERMINAL_VELOCITY) {
      // If slow fall is active, reduce terminal velocity
      const effectiveTerminalVelocity = this.character.isSlowFall ? 
        TERMINAL_VELOCITY * SLOW_FALL_FACTOR : TERMINAL_VELOCITY;
      
      this.character.velocityY = effectiveTerminalVelocity;
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
    
    // Update power-up statuses
    
    // Update invincibility
    if (this.character.isInvincible) {
      if (Date.now() > this.character.invincibleUntil!) {
        this.character.isInvincible = false;
        console.log("Invincibility expired!");
      }
    }
    
    // Update slow fall
    if (this.character.isSlowFall) {
      if (Date.now() > this.character.slowFallUntil!) {
        this.character.isSlowFall = false;
        console.log("Slow Fall expired!");
      }
    }
  }

  updatePlatforms() {
    // Adjust scroll speed based on score
    const increments = Math.floor(this.score / SCORE_PER_INCREMENT);
    
    // Calculate new scroll speed based on score milestones
    this.SCROLL_SPEED = Math.min(
      BASE_SCROLL_SPEED + increments * SCROLL_SPEED_INCREMENT,
      MAX_SCROLL_SPEED
    );
    
    // Remove platforms that are far above the camera view
    const cleanupThreshold = this.cameraY - this.canvas.height * 2;
    this.platforms = this.platforms.filter(platform => platform.y >= cleanupThreshold);

    // Find the lowest platform
    if (this.platforms.length > 0) {
      const lowestPlatform = this.platforms.reduce(
        (lowest, current) => current.y > lowest.y ? current : lowest,
        this.platforms[0]
      );
      
      // Calculate how far down we should generate platforms
      const viewportBottom = this.cameraY + this.canvas.height;
      const extraDistance = this.canvas.height; // Generate one full screen height extra platforms
      
      // Keep generating platforms until we have enough below the viewport
      while (lowestPlatform.y < viewportBottom + extraDistance) {
        const newY = lowestPlatform.y + PLATFORM_VERTICAL_GAP;
        
        // Randomize the horizontal position with edge margins
        const edgeMargin = MIN_PLATFORM_WIDTH * 0.5;
        const availableWidth = this.canvas.width - (2 * edgeMargin) - MIN_PLATFORM_WIDTH;
        const randomX = edgeMargin + (Math.random() * availableWidth);
        
        // Create platform with optimized width calculation
        this.addPlatform(newY, randomX - this.canvas.width/2);
        
        // Update our reference to the new lowest platform
        const updatedLowestPlatform = this.platforms.reduce(
          (lowest, current) => current.y > lowest.y ? current : lowest,
          this.platforms[0]
        );
        
        // Break if we didn't get a lower platform to avoid infinite loop
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
  }

  checkCollisions() {
    let isOnPlatform = false;
    this.lastPlatformLanded = null;
    
    // Check for power-up collisions with nearby platforms only
    const playerVerticalRange = 200; // Only check platforms within this range of the player
    const nearbyPlatforms = this.platforms.filter(platform => 
      Math.abs(platform.y - this.character.y) <= playerVerticalRange
    );

    // Check power-up collisions only for nearby platforms
    for (const platform of nearbyPlatforms) {
      if (!platform.powerUp || !platform.powerUp.active) continue;
      
      const powerUp = platform.powerUp;
      
      const collidesX = this.character.x + this.character.width > powerUp.x && 
                     this.character.x < powerUp.x + powerUp.width;
      const collidesY = this.character.y + this.character.height > powerUp.y && 
                     this.character.y < powerUp.y + powerUp.height;
      
      if (collidesX && collidesY) {
        platform.powerUp.active = false;
        
        switch (powerUp.type) {
          case PowerUpType.INVINCIBILITY:
            this.character.isInvincible = true;
            this.character.invincibleUntil = Date.now() + INVINCIBILITY_POWER_UP_DURATION;
            playSound('jump');
            break;
            
          case PowerUpType.SLOW_FALL:
            this.character.isSlowFall = true;
            this.character.slowFallUntil = Date.now() + SLOW_FALL_POWER_UP_DURATION;
            playSound('jump');
            break;
            
          case PowerUpType.HEALTH_BOOST:
            const healthToAdd = HEALTH_BOOST_AMOUNT;
            this.health = Math.min(100, this.health + healthToAdd);
            this.onUpdateHealth(this.health);
            playSound('jump');
            break;
        }
      }
    }

    // Get ceiling position
    const targetCeilingDistance = 180;
    const pursuingCeilingY = Math.max(0, this.character.y - targetCeilingDistance);
    const ceilingYPos = Math.min(this.cameraY, pursuingCeilingY);
    const ceilingBottomY = ceilingYPos + CEILING_HEIGHT;
    
    // Ceiling collision handling
    if (this.character.y <= ceilingBottomY) {
      if (this.character.velocityY < 0) {
        this.character.velocityY = 0;
      }
      
      if (this.character.y < ceilingBottomY) {
        this.character.y = ceilingBottomY;
        
        if (!this.character.isInvincible) {
          this.health = 0;
          this.onUpdateHealth(this.health);
          playSound('hurt');
          this.gameActive = false;
          this.onGameOver();
        }
      }
    }
    
    // Check for collision with ceiling spikes
    const spikeWidth = this.canvas.width / CEILING_SPIKE_COUNT;
    const spikeIndex = Math.floor(this.character.x / spikeWidth);
    const spikeXCenter = spikeIndex * spikeWidth + spikeWidth / 2;
    const charMidX = this.character.x + this.character.width/2;
    const distanceFromSpikeCenter = Math.abs(charMidX - spikeXCenter);
    const hitAreaWidth = spikeWidth;
    const spikeLength = SPIKE_HEIGHT * 2;
    
    if (
      this.character.y <= ceilingBottomY + spikeLength &&
      this.character.y > ceilingBottomY &&
      distanceFromSpikeCenter < hitAreaWidth/2 &&
      !this.character.isInvincible
    ) {
      this.health = 0;
      this.onUpdateHealth(this.health);
      playSound('hurt');
      this.gameActive = false;
      this.onGameOver();
    }

    // Check platform collisions only for nearby platforms
    for (const platform of nearbyPlatforms) {
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

    // Update collapsing platforms only for nearby ones
    for (const platform of nearbyPlatforms) {
      if (platform.type === PlatformType.COLLAPSING && platform.timer !== undefined && platform.timer <= 0) {
        platform.collapsed = true;
      }
    }
  }

  checkGameOver() {
    const lowestPlatformY = this.platforms.length > 0
      ? this.platforms.reduce((lowest, current) => current.y > lowest.y ? current : lowest, this.platforms[0]).y
      : this.canvas.height;
    
    // In single player, any death condition triggers game over
    if (!this.isMultiplayer) {
      if (this.character.y > lowestPlatformY + this.canvas.height ||
          this.health <= 0 ||
          this.character.y > this.cameraY + this.canvas.height) {
        this.gameActive = false;
        this.onGameOver();
      }
    } else {
      // In multiplayer, only trigger game over if player falls off screen
      // Health reaching 0 is handled separately to keep game running
      if (this.character.y > lowestPlatformY + this.canvas.height ||
          this.character.y > this.cameraY + this.canvas.height) {
        this.gameActive = false;
        this.onGameOver();
      }
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

    // Calculate visible area bounds
    const visibleTop = this.cameraY - 50; // Small buffer above
    const visibleBottom = this.cameraY + this.canvas.height + 50; // Small buffer below

    this.drawCeiling();
    
    // Only draw platforms that are visible on screen
    for (const platform of this.platforms) {
      if (!platform.collapsed && 
          platform.y >= visibleTop && 
          platform.y <= visibleBottom) {
        drawPlatform(ctx, platform);
      }
    }
    
    drawCharacter(ctx, this.character);
    ctx.restore();

    // Draw active power-up indicators at the top of the screen
    this.drawPowerUpIndicators(ctx);
  }
  
  // Draw indicator icons for active power-ups
  drawPowerUpIndicators(ctx: CanvasRenderingContext2D) {
    const iconSize = 22;
    const padding = 5;
    let xPos = 10;
    const yPos = 30;
    
    // Draw invincibility indicator
    if (this.character.isInvincible) {
      // Draw invincibility icon
      const timeRemaining = Math.max(0, this.character.invincibleUntil! - Date.now()) / 1000;
      
      // Gold star for invincibility
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      ctx.arc(xPos + iconSize/2, yPos, iconSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw star shape 
      ctx.fillStyle = 'white';
      const starSize = iconSize * 0.4;
      const starX = xPos + iconSize/2;
      const starY = yPos;
      
      // Draw a star shape manually
      const spikes = 5;
      const outerRadius = starSize;
      const innerRadius = starSize/2;
      let rot = Math.PI / 2 * 3;
      let step = Math.PI / spikes;
      
      ctx.beginPath();
      ctx.moveTo(starX, starY - outerRadius);
      
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(
          starX + Math.cos(rot) * outerRadius,
          starY + Math.sin(rot) * outerRadius
        );
        rot += step;
        
        ctx.lineTo(
          starX + Math.cos(rot) * innerRadius,
          starY + Math.sin(rot) * innerRadius
        );
        rot += step;
      }
      
      ctx.lineTo(starX, starY - outerRadius);
      ctx.closePath();
      ctx.fill();
      
      // Draw timer text
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(timeRemaining.toFixed(1) + 's', xPos + iconSize/2, yPos + iconSize/2 + 12);
      
      xPos += iconSize + padding;
    }
    
    // Draw slow fall indicator
    if (this.character.isSlowFall) {
      // Draw slow fall icon
      const timeRemaining = Math.max(0, this.character.slowFallUntil! - Date.now()) / 1000;
      
      // Blue circle for slow fall
      ctx.fillStyle = 'royalblue';
      ctx.beginPath();
      ctx.arc(xPos + iconSize/2, yPos, iconSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw down arrow
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(xPos + iconSize/2, yPos - iconSize/4);
      ctx.lineTo(xPos + iconSize/2 + iconSize/4, yPos - iconSize/4);
      ctx.lineTo(xPos + iconSize/2, yPos + iconSize/4);
      ctx.lineTo(xPos + iconSize/2 - iconSize/4, yPos - iconSize/4);
      ctx.closePath();
      ctx.fill();
      
      // Draw timer text
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(timeRemaining.toFixed(1) + 's', xPos + iconSize/2, yPos + iconSize/2 + 12);
      
      xPos += iconSize + padding;
    }
    
    // Reset text alignment for other text in the game
    ctx.textAlign = 'left';
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

  setMultiplayerData(players: Record<string, Player>, localPlayerId: string): void {
    this.localPlayerId = localPlayerId;
    
    // Convert Player objects to NetworkPlayer objects
    const networkPlayers: Record<string, NetworkPlayer> = {};
    Object.entries(players).forEach(([id, player]) => {
      networkPlayers[id] = {
        id: player.id,
        name: player.name,
        score: player.score,
        x: 0, // Default position
        y: 0, // Default position
        health: 100, // Default health
        velocityY: 0,
        velocityX: 0,
        isJumping: false,
        facingDirection: 1
      };
    });
    
    this.otherPlayers = { ...networkPlayers };
    
    // Remove local player from other players
    if (this.otherPlayers[localPlayerId]) {
      delete this.otherPlayers[localPlayerId];
    }
    
    // Assign colors to players
    Object.keys(players).forEach((playerId, index) => {
      if (!this.playerColors[playerId]) {
        this.playerColors[playerId] = PLAYER_COLORS[index % PLAYER_COLORS.length];
      }
    });
  }

  private renderOtherPlayers(): void {
    if (!this.ctx) return;
    
    Object.values(this.otherPlayers).forEach(player => {
      // Calculate the relative position based on camera
      const relativeY = player.y - this.cameraY;
      
      // Only render if the player is visible on screen
      if (relativeY >= 0 && relativeY <= this.canvas.height) {
        // Draw the player with their assigned color
        this.ctx.save();
        
        // Draw player body
        this.ctx.fillStyle = this.playerColors[player.id] || '#FFFFFF';
        this.ctx.fillRect(player.x, relativeY, CHARACTER_SIZE, CHARACTER_SIZE);
        
        // Draw player face (simplified)
        this.ctx.fillStyle = '#000000';
        
        // Eyes
        const eyeSize = 2;
        const eyeY = relativeY + 5;
        
        // Adjust eye position based on facing direction
        if (player.facingDirection > 0) {
          // Facing right
          this.ctx.fillRect(player.x + 12, eyeY, eyeSize, eyeSize);
          this.ctx.fillRect(player.x + 16, eyeY, eyeSize, eyeSize);
        } else {
          // Facing left
          this.ctx.fillRect(player.x + 4, eyeY, eyeSize, eyeSize);
          this.ctx.fillRect(player.x + 8, eyeY, eyeSize, eyeSize);
        }
        
        // Draw player name above
        this.ctx.fillStyle = this.playerColors[player.id] || '#FFFFFF';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name, player.x + CHARACTER_SIZE / 2, relativeY - 5);
        
        this.ctx.restore();
      }
    });
  }

  applyAttack(attack: Partial<Attack> & { type: AttackType }): void {
    // Add to active attacks list if it has the required fields
    if (attack.fromPlayerId && attack.toPlayerId) {
      this.activeAttacks.push(attack as Attack);
    }
    
    // Play attack sound
    playAttackSound(attack.type);
    
    // Apply immediate effects
    switch (attack.type as AttackType) {
      case AttackType.SPIKE_PLATFORM:
        // Add multiple spike platforms near the player for more challenge
        for (let i = 0; i < 3; i++) {
          this.addSpikePlatform();
        }
        // Add visual feedback
        this.flashScreen('#FF0000', 0.3); // Red flash
        
        // Update game state
        this.onUpdateGameState?.({
          activeEffects: {
            spikePlatforms: true
          }
        });
        
        // Set timeout to clear effect
        setTimeout(() => {
          this.onUpdateGameState?.({
            activeEffects: {
              spikePlatforms: false
            }
          });
        }, attack.duration || 5000);
        break;
        
      case AttackType.SPEED_UP:
        // Make speed increase more dramatic
        this.SCROLL_SPEED *= 2.0; // Increased from 1.5
        this.MOVE_SPEED *= 1.5; // Also increase player movement speed
        // Add visual feedback
        this.flashScreen('#0000FF', 0.3); // Blue flash
        
        // Update game state
        this.onUpdateGameState?.({
          activeEffects: {
            speedUp: true
          }
        });
        
        // Set a timeout to reset the speed
        setTimeout(() => {
          this.SCROLL_SPEED /= 2.0;
          this.MOVE_SPEED /= 1.5;
          
          this.onUpdateGameState?.({
            activeEffects: {
              speedUp: false
            }
          });
        }, attack.duration || 5000);
        break;
        
      case AttackType.NARROW_PLATFORM:
        // Make platforms significantly narrower
        this.narrowNextPlatforms = 8; // Increased from 5
        // Reduce current platform widths
        this.platforms.forEach(platform => {
          if (platform.width > MIN_PLATFORM_WIDTH * 2) {
            platform.width *= 0.7; // Reduce width by 30%
          }
        });
        // Add visual feedback
        this.flashScreen('#00FF00', 0.3); // Green flash
        
        // Update game state
        this.onUpdateGameState?.({
          activeEffects: {
            narrowPlatforms: true
          }
        });
        
        // Set timeout to clear effect
        setTimeout(() => {
          this.onUpdateGameState?.({
            activeEffects: {
              narrowPlatforms: false
            }
          });
        }, attack.duration || 5000);
        break;
        
      case AttackType.REVERSE_CONTROLS:
        // Reverse the controls with visual feedback
        this.isControlsReversed = true;
        console.log('Game Engine: Controls reversed set to TRUE');
        this.flashScreen('#FF00FF', 0.3); // Purple flash
        
        // Add screen rotation effect
        this.canvas.style.transform = 'rotate(180deg)';
        this.canvas.style.transition = 'transform 0.5s';
        
        // Update game state
        this.onUpdateGameState?.({
          activeEffects: {
            reverseControls: true
          }
        });
        
        // Set a timeout to reset the controls and rotation
        setTimeout(() => {
          this.isControlsReversed = false;
          console.log('Game Engine: Controls reversed reset to FALSE');
          this.canvas.style.transform = 'rotate(0deg)';
          
          this.onUpdateGameState?.({
            activeEffects: {
              reverseControls: false
            }
          });
        }, attack.duration || 5000);
        break;

      case AttackType.TRUE_REVERSE:
        // Reverse controls without visual flipping
        this.isTrueReverse = true;
        console.log('Game Engine: True Reverse set to TRUE');
        this.flashScreen('#8800FF', 0.3); // Different purple flash
        
        // Update game state
        this.onUpdateGameState?.({
          activeEffects: {
            trueReverse: true
          }
        });
        
        // Set a timeout to reset the controls
        setTimeout(() => {
          this.isTrueReverse = false;
          console.log('Game Engine: True Reverse reset to FALSE');
          
          this.onUpdateGameState?.({
            activeEffects: {
              trueReverse: false
            }
          });
        }, attack.duration || 5000);
        break;
        
      default:
        console.warn('Unknown attack type:', attack.type);
    }
  }

  addSpikePlatform(): void {
    const playerY = this.character.y;
    const platformY = playerY + 100; // Add a spike platform below the player
    
    // Create a spike platform
    const platform = createPlatform(
      Math.random() * (this.canvas.width - MIN_PLATFORM_WIDTH), // x
      platformY, // y
      MIN_PLATFORM_WIDTH, // width
      PlatformType.SPIKE // type
    );
    
    this.platforms.push(platform);
  }

  // Add new method for screen flash effect
  private flashScreen(color: string, opacity: number): void {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = color;
    overlay.style.opacity = opacity.toString();
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    overlay.style.transition = 'opacity 0.3s';
    
    this.canvas.parentElement?.appendChild(overlay);
    
    // Remove the overlay after animation
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }, 300);
  }

  /**
   * Clean up resources when the game engine is destroyed
   */
  destroy() {
    console.log("GameEngine destroy called");
    
    // Reset all game state
    this.gameActive = false;
    this.isMovingLeft = false;
    this.isMovingRight = false;
    this.platforms = [];
    this.totalDistanceTraveled = 0;
    this.cameraY = 0;
    this.score = 0;
    this.health = 100;
    this.lastPlatformLanded = null;
    this.otherPlayers = {};
    this.activeAttacks = [];
    this.isControlsReversed = false;
    this.isTrueReverse = false;
    this.narrowNextPlatforms = 0;
    
    // Clear the canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Update based on game state
  syncGameState(gameState: GameState) {
    // Apply game state effects to the engine
    if (gameState.activeEffects.reverseControls !== undefined) {
      this.isControlsReversed = gameState.activeEffects.reverseControls;
      
      // Update visual feedback if needed
      if (this.isControlsReversed) {
        this.canvas.style.transform = 'rotate(180deg)';
        this.canvas.style.transition = 'transform 0.5s';
      } else {
        this.canvas.style.transform = 'rotate(0deg)';
      }
    }
    
    // Apply true reverse effect (just controls, no visual flip)
    if (gameState.activeEffects.trueReverse !== undefined) {
      this.isTrueReverse = gameState.activeEffects.trueReverse;
      
      // No visual change needed for true reverse
      if (this.isTrueReverse) {
        this.flashScreen('#8800FF', 0.3); // Purple flash to indicate effect
      }
    }
    
    // Apply other effects as needed
    // Handle spike platforms effect
    if (gameState.activeEffects.spikePlatforms !== undefined && gameState.activeEffects.spikePlatforms) {
      // Add spike platforms if the effect was just activated
      if (!this._lastActiveEffects?.spikePlatforms) {
        // Add multiple spike platforms near the player for more challenge
        for (let i = 0; i < 3; i++) {
          this.addSpikePlatform();
        }
        // Visual feedback
        this.flashScreen('#FF0000', 0.3); // Red flash
      }
    }
    
    // Handle speed up effect
    if (gameState.activeEffects.speedUp !== undefined) {
      // Check if the effect has changed
      if (gameState.activeEffects.speedUp !== this._lastActiveEffects?.speedUp) {
        if (gameState.activeEffects.speedUp) {
          // Activate speed up
          this.SCROLL_SPEED *= 2.0;
          this.MOVE_SPEED *= 1.5;
          // Visual feedback
          this.flashScreen('#0000FF', 0.3); // Blue flash
        } else {
          // Deactivate speed up
          this.SCROLL_SPEED /= 2.0;
          this.MOVE_SPEED /= 1.5;
        }
      }
    }
    
    // Handle narrow platforms effect
    if (gameState.activeEffects.narrowPlatforms !== undefined) {
      // Check if the effect has changed
      if (gameState.activeEffects.narrowPlatforms !== this._lastActiveEffects?.narrowPlatforms) {
        if (gameState.activeEffects.narrowPlatforms) {
          // Activate narrow platforms
          this.narrowNextPlatforms = 8;
          // Reduce current platform widths
          this.platforms.forEach(platform => {
            if (platform.width > MIN_PLATFORM_WIDTH * 2) {
              platform.width *= 0.7; // Reduce width by 30%
            }
          });
          // Visual feedback
          this.flashScreen('#00FF00', 0.3); // Green flash
        } else {
          // Effect ended, but we can't undo the narrowing that was already applied
          this.narrowNextPlatforms = 0;
        }
      }
    }
    
    // Store current active effects state for comparison in the next update
    this._lastActiveEffects = { ...gameState.activeEffects };
  }
  
  // Track last active effects state to detect changes
  private _lastActiveEffects?: {
    spikePlatforms?: boolean;
    speedUp?: boolean;
    narrowPlatforms?: boolean;
    reverseControls?: boolean;
    trueReverse?: boolean;
  };
}