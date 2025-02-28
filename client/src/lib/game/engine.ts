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
  SCORE_PER_DISTANCE
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
  
  // Character
  character: Character;
  isMovingLeft: boolean = false;
  isMovingRight: boolean = false;
  lastPlatformLanded: Platform | null = null;
  
  // Platforms
  platforms: Platform[] = [];
  totalDistanceTraveled: number = 0;
  
  // Constants for smooth gameplay
  private MOVE_SPEED = 5;
  private GRAVITY_FORCE = 0.5;
  private SCROLL_SPEED = 2;
  
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
    
    console.log("Canvas dimensions:", canvas.width, canvas.height);
    
    // Initialize character in the middle of the screen
    this.character = {
      x: canvas.width / 2 - CHARACTER_SIZE / 2,
      y: canvas.height / 2 - CHARACTER_SIZE,
      width: CHARACTER_SIZE,
      height: CHARACTER_SIZE,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      facingDirection: 1 // 1 for right, -1 for left
    };
    
    console.log("Character initialized at:", this.character.x, this.character.y);
    
    // Initialize platforms
    this.initializePlatforms();
    
    // Initialize health and score
    this.health = 100; // Set default health
    this.onUpdateHealth(this.health);
    this.score = 0;
    this.onUpdateScore(this.score);
    
    // Reset game state
    this.totalDistanceTraveled = 0;
    this.gameActive = true;
  }
  
  // Set up initial platforms
  initializePlatforms() {
    this.platforms = [];
    
    // Add a platform directly under the player to start
    const startX = this.canvas.width / 2 - 50;
    const startY = this.canvas.height / 2 + CHARACTER_SIZE;
    
    console.log("Adding start platform at:", startX, startY);
    
    const startPlatform = createPlatform(
      startX,
      startY,
      100,
      PlatformType.NORMAL
    );
    this.platforms.push(startPlatform);
    
    // Add more platforms below
    let yPos = startY + PLATFORM_VERTICAL_GAP;
    
    while (yPos < this.canvas.height + 200) {
      this.addPlatform(yPos);
      yPos += PLATFORM_VERTICAL_GAP;
    }
    
    console.log("Initialized", this.platforms.length, "platforms");
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
    // For simplicity, mostly generate normal platforms
    const rand = Math.random();
    
    if (rand < 0.7) return PlatformType.NORMAL;
    if (rand < 0.8) return PlatformType.SPIKE;
    if (rand < 0.9) return PlatformType.COLLAPSING;
    if (rand < 0.95) return PlatformType.CONVEYOR;
    return PlatformType.SPRING;
  }
  
  // Update character movement direction
  updateMovement(isMovingLeft: boolean, isMovingRight: boolean) {
    console.log("Movement updated:", isMovingLeft, isMovingRight);
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
  update() {
    if (!this.gameActive) return;
    
    // Update character position
    this.updateCharacter();
    
    // Update platforms
    this.updatePlatforms();
    
    // Check for collisions
    this.checkCollisions();
    
    // Check for game over conditions
    this.checkGameOver();
    
    // Draw everything
    this.draw();
  }
  
  // Update character position and apply physics
  updateCharacter() {
    // Handle horizontal movement with fixed speeds
    if (this.isMovingLeft && !this.isMovingRight) {
      this.character.x -= this.MOVE_SPEED;
      console.log("Moving LEFT", this.character.x);
    } 
    
    if (this.isMovingRight && !this.isMovingLeft) {
      this.character.x += this.MOVE_SPEED;
      console.log("Moving RIGHT", this.character.x);
    }
    
    // Apply gravity - constant acceleration downward
    this.character.velocityY += this.GRAVITY_FORCE;
    
    // Terminal velocity cap to prevent falling too fast
    if (this.character.velocityY > TERMINAL_VELOCITY) {
      this.character.velocityY = TERMINAL_VELOCITY;
    }
    
    // Update vertical position based on velocity
    this.character.y += this.character.velocityY;
    
    // Ensure character stays within horizontal boundaries
    if (this.character.x < 0) {
      this.character.x = 0;
    } else if (this.character.x + this.character.width > this.canvas.width) {
      this.character.x = this.canvas.width - this.character.width;
    }
    
    // Apply conveyor belt effect
    if (this.lastPlatformLanded && this.lastPlatformLanded.type === PlatformType.CONVEYOR) {
      const conveyorDirection = this.lastPlatformLanded.id % 2 === 0 ? 1 : -1;
      this.character.x += conveyorDirection * 2.0;
    }
  }
  
  // Update platforms (scrolling, removing, adding new ones)
  updatePlatforms() {
    // Move all platforms up (simulating player falling down)
    for (const platform of this.platforms) {
      platform.y -= this.SCROLL_SPEED;
      
      // If platform has a timer (like collapsing platforms), update it
      if (platform.timer !== undefined) {
        platform.timer -= 16; // Assuming ~60fps (16ms per frame)
      }
    }
    
    // Track distance for scoring
    this.totalDistanceTraveled += this.SCROLL_SPEED;
    this.score = Math.floor(this.totalDistanceTraveled * SCORE_PER_DISTANCE);
    this.onUpdateScore(this.score);
    
    // Remove platforms that have moved off the top of the screen
    this.platforms = this.platforms.filter(platform => platform.y + PLATFORM_HEIGHT > 0);
    
    // Add new platforms at the bottom as needed
    if (this.platforms.length > 0) {
      const lowestPlatform = this.platforms.reduce(
        (lowest, current) => current.y > lowest.y ? current : lowest, 
        this.platforms[0]
      );
      
      // Ensure we keep adding platforms as the screen scrolls
      if (lowestPlatform.y < this.canvas.height + 100) {
        const newY = lowestPlatform.y + PLATFORM_VERTICAL_GAP;
        this.addPlatform(newY);
      }
    } else {
      // If we somehow lost all platforms, add one
      this.addPlatform(this.canvas.height - 50);
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
    
    // Debug info - draw character position
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.fillText(`Char: (${Math.round(this.character.x)}, ${Math.round(this.character.y)})`, 10, 60);
    ctx.fillText(`Moving: ${this.isMovingLeft ? 'LEFT' : ''}${this.isMovingRight ? 'RIGHT' : ''}`, 10, 80);
    ctx.fillText(`Platforms: ${this.platforms.length}`, 10, 100);
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