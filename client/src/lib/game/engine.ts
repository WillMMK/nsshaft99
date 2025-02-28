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
  DIFFICULTY_INCREASE_RATE,
  SCROLL_SPEED_INITIAL,
  SCROLL_SPEED_MAX
} from './constants';
import { Platform, PlatformType, createPlatform, drawPlatform } from './platform';
import { drawCharacter, Character } from './character';
import { playSound } from './audio';

export class GameEngine {
  // Canvas and context
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  // Game state
  score: number = 0;
  health: number = 100;
  gameActive: boolean = true;
  difficulty: number = 0;
  scrollSpeed: number = SCROLL_SPEED_INITIAL;
  
  // Character
  character: Character;
  isMovingLeft: boolean = false;
  isMovingRight: boolean = false;
  lastPlatformLanded: Platform | null = null;
  
  // Platforms
  platforms: Platform[] = [];
  totalDistanceTraveled: number = 0;
  
  // UI and callbacks
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
    
    // Initialize character in the middle of the screen
    this.character = {
      x: canvas.width / 2 - CHARACTER_SIZE / 2,
      y: canvas.height / 3,
      width: CHARACTER_SIZE,
      height: CHARACTER_SIZE,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      facingDirection: 1 // 1 for right, -1 for left
    };
    
    // Initialize platforms
    this.initializePlatforms();
  }
  
  // Set up initial platforms
  initializePlatforms() {
    this.platforms = [];
    
    // Add a platform directly under the player to start
    const startPlatform = createPlatform(
      this.canvas.width / 2 - 50,
      this.canvas.height / 2,
      100,
      PlatformType.NORMAL
    );
    this.platforms.push(startPlatform);
    
    // Add more platforms below
    let yPos = this.canvas.height / 2 + PLATFORM_VERTICAL_GAP;
    
    while (yPos < this.canvas.height + 200) {
      this.addPlatform(yPos);
      yPos += PLATFORM_VERTICAL_GAP;
    }
  }
  
  // Generate a new platform at the specified y position
  addPlatform(yPos: number) {
    const width = MIN_PLATFORM_WIDTH + Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH);
    const xPos = Math.random() * (this.canvas.width - width);
    
    // Determine platform type based on probability
    let platformType = this.getPlatformType();
    
    const platform = createPlatform(xPos, yPos, width, platformType);
    this.platforms.push(platform);
  }
  
  // Get a platform type based on current probabilities
  getPlatformType(): PlatformType {
    // As the game progresses, adjust probabilities to make it harder
    const probs = { ...INITIAL_PROBABILITIES };
    
    // Increase difficulty over time
    if (this.difficulty > 0.2) {
      probs.NORMAL -= Math.min(0.3, this.difficulty * 0.5);
      probs.SPIKE += Math.min(0.15, this.difficulty * 0.2);
      probs.COLLAPSING += Math.min(0.15, this.difficulty * 0.2);
    }
    
    const rand = Math.random();
    let cumulative = 0;
    
    if ((cumulative += probs.NORMAL) > rand) return PlatformType.NORMAL;
    if ((cumulative += probs.SPIKE) > rand) return PlatformType.SPIKE;
    if ((cumulative += probs.COLLAPSING) > rand) return PlatformType.COLLAPSING;
    if ((cumulative += probs.CONVEYOR) > rand) return PlatformType.CONVEYOR;
    return PlatformType.SPRING;
  }
  
  // Update character movement direction
  updateMovement(isMovingLeft: boolean, isMovingRight: boolean) {
    this.isMovingLeft = isMovingLeft;
    this.isMovingRight = isMovingRight;
    
    // Update character facing direction
    if (isMovingLeft && !isMovingRight) {
      this.character.facingDirection = -1;
    } else if (isMovingRight && !isMovingLeft) {
      this.character.facingDirection = 1;
    }
  }
  
  // Main update loop
  update(deltaTime: number) {
    if (!this.gameActive) return;
    
    // Increase difficulty over time
    this.difficulty += DIFFICULTY_INCREASE_RATE * deltaTime;
    this.scrollSpeed = Math.min(SCROLL_SPEED_MAX, SCROLL_SPEED_INITIAL + this.difficulty);
    
    // Update character position
    this.updateCharacter(deltaTime);
    
    // Update platforms
    this.updatePlatforms(deltaTime);
    
    // Check for collisions
    this.checkCollisions();
    
    // Check for game over conditions
    this.checkGameOver();
    
    // Draw everything
    this.draw();
  }
  
  // Update character position and apply physics
  updateCharacter(deltaTime: number) {
    // Apply horizontal movement from controls with normalized deltaTime
    const normalizedDelta = deltaTime / 16.67; // Normalize to 60fps
    
    if (this.isMovingLeft && !this.isMovingRight) {
      this.character.velocityX = -CHARACTER_SPEED;
      this.character.facingDirection = -1;
    } else if (this.isMovingRight && !this.isMovingLeft) {
      this.character.velocityX = CHARACTER_SPEED;
      this.character.facingDirection = 1;
    } else {
      this.character.velocityX = 0;
    }
    
    // Apply gravity with smoother acceleration
    this.character.velocityY += GRAVITY * normalizedDelta;
    
    // Terminal velocity check
    if (this.character.velocityY > TERMINAL_VELOCITY) {
      this.character.velocityY = TERMINAL_VELOCITY;
    }
    
    // Update position with normalized movement
    this.character.x += this.character.velocityX * normalizedDelta;
    this.character.y += this.character.velocityY * normalizedDelta;
    
    // Keep character within screen bounds
    if (this.character.x < 0) {
      this.character.x = 0;
    } else if (this.character.x + this.character.width > this.canvas.width) {
      this.character.x = this.canvas.width - this.character.width;
    }
    
    // Handle conveyor belt effect with more consistent speed
    if (this.lastPlatformLanded && this.lastPlatformLanded.type === PlatformType.CONVEYOR) {
      // Determine conveyor direction (based on platform ID to make it consistent)
      const conveyorDirection = this.lastPlatformLanded.id % 2 === 0 ? 1 : -1;
      this.character.x += conveyorDirection * 1.0 * normalizedDelta;
    }
  }
  
  // Update platforms (scrolling, removing, adding new ones)
  updatePlatforms(deltaTime: number) {
    // Normalize deltaTime for consistent speed
    const normalizedDelta = deltaTime / 16.67; // Normalize to 60fps
    
    // Move all platforms up (simulating player falling down)
    for (const platform of this.platforms) {
      platform.y -= this.scrollSpeed * normalizedDelta;
      
      // If platform has a timer (like collapsing platforms), update it
      if (platform.timer !== undefined) {
        platform.timer -= deltaTime;
      }
    }
    
    // Track distance for scoring with normalized delta for consistent speed
    this.totalDistanceTraveled += this.scrollSpeed * normalizedDelta;
    this.score = Math.floor(this.totalDistanceTraveled * SCORE_PER_DISTANCE);
    this.onUpdateScore(this.score);
    
    // Remove platforms that have moved off the top of the screen
    this.platforms = this.platforms.filter(platform => platform.y + PLATFORM_HEIGHT > 0);
    
    // Add new platforms at the bottom as needed
    const lowestPlatform = this.platforms.reduce(
      (lowest, current) => current.y > lowest.y ? current : lowest, 
      { y: 0 } as Platform
    );
    
    if (lowestPlatform.y < this.canvas.height + 200) {
      this.addPlatform(lowestPlatform.y + PLATFORM_VERTICAL_GAP);
    }
  }
  
  // Check for collisions between character and platforms
  checkCollisions() {
    let isOnPlatform = false;
    this.lastPlatformLanded = null;
    
    // Check for ceiling collision
    if (this.character.y < CEILING_HEIGHT) {
      // Hit ceiling
      this.character.y = CEILING_HEIGHT;
      this.character.velocityY = 1; // Bounce down a bit
      this.takeDamage();
    }
    
    // Check each platform for collision
    for (const platform of this.platforms) {
      // Skip collapsed platforms
      if (platform.collapsed) continue;
      
      // Check if character is above platform and falling down
      const onPlatformX = this.character.x + this.character.width > platform.x && 
                         this.character.x < platform.x + platform.width;
                         
      const onPlatformY = this.character.y + this.character.height <= platform.y + 5 && 
                         this.character.y + this.character.height + this.character.velocityY >= platform.y;
      
      if (onPlatformX && onPlatformY && this.character.velocityY > 0) {
        // Character landed on platform
        this.character.y = platform.y - this.character.height;
        this.character.velocityY = 0;
        isOnPlatform = true;
        this.lastPlatformLanded = platform;
        
        // Handle different platform types
        switch (platform.type) {
          case PlatformType.NORMAL:
            // Heal player
            this.heal();
            // Increment score for landing on platform
            this.score += SCORE_PER_PLATFORM;
            this.onUpdateScore(this.score);
            break;
            
          case PlatformType.SPIKE:
            // Damage player
            this.takeDamage();
            break;
            
          case PlatformType.COLLAPSING:
            // Start collapse timer if not already started
            if (platform.timer === undefined) {
              platform.timer = 300; // Milliseconds before collapse
              // Play sound
              playSound('collapse');
            }
            break;
            
          case PlatformType.SPRING:
            // Bounce character up
            this.character.velocityY = -TERMINAL_VELOCITY * 1.2;
            // Play sound
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
  
  // Check if game over conditions are met
  checkGameOver() {
    // Check if character fell off the bottom of the screen
    if (this.character.y > this.canvas.height) {
      this.gameActive = false;
      this.onGameOver();
    }
    
    // Check if health is depleted
    if (this.health <= 0) {
      this.gameActive = false;
      this.onGameOver();
    }
  }
  
  // Handle taking damage (from spikes or ceiling)
  takeDamage() {
    this.health -= DAMAGE_AMOUNT;
    if (this.health < 0) this.health = 0;
    this.onUpdateHealth(this.health);
    
    // Play hurt sound
    playSound('hurt');
  }
  
  // Handle healing (from landing on normal platforms)
  heal() {
    this.health += HEALTH_GAIN;
    if (this.health > 100) this.health = 100;
    this.onUpdateHealth(this.health);
  }
  
  // Draw the entire game state
  draw() {
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw ceiling with spikes
    this.drawCeiling();
    
    // Draw platforms
    for (const platform of this.platforms) {
      if (!platform.collapsed) {
        drawPlatform(ctx, platform);
      }
    }
    
    // Draw character
    drawCharacter(ctx, this.character);
  }
  
  // Draw ceiling with spikes
  drawCeiling() {
    const ctx = this.ctx;
    
    // Draw ceiling base
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, 0, this.canvas.width, CEILING_HEIGHT);
    
    // Draw spikes
    ctx.fillStyle = '#F25C54';
    const spikeWidth = this.canvas.width / CEILING_SPIKE_COUNT;
    
    for (let i = 0; i < CEILING_SPIKE_COUNT; i++) {
      const x = i * spikeWidth;
      
      ctx.beginPath();
      ctx.moveTo(x, CEILING_HEIGHT);
      ctx.lineTo(x + spikeWidth / 2, CEILING_HEIGHT - SPIKE_HEIGHT);
      ctx.lineTo(x + spikeWidth, CEILING_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
  }
}
