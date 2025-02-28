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

    this.character = {
      x: canvas.width / 2 - CHARACTER_SIZE / 2,
      y: canvas.height / 2 - CHARACTER_SIZE,
      width: CHARACTER_SIZE,
      height: CHARACTER_SIZE,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      facingDirection: 1
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
    const startX = this.canvas.width / 2 - 50;
    const startY = this.canvas.height / 2 + CHARACTER_SIZE;
    console.log("Adding start platform at:", startX, startY);
    const startPlatform = createPlatform(startX, startY, 100, PlatformType.NORMAL);
    this.platforms.push(startPlatform);

    let yPos = startY + PLATFORM_VERTICAL_GAP;
    while (yPos < this.canvas.height + 200) {
      this.addPlatform(yPos);
      yPos += PLATFORM_VERTICAL_GAP;
    }
    console.log("Initialized", this.platforms.length, "platforms");
  }

  addPlatform(yPos: number) {
    const width = MIN_PLATFORM_WIDTH + Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH);
    const xPos = Math.random() * (this.canvas.width - width);
    let platformType = this.getPlatformType();
    const platform = createPlatform(xPos, yPos, width, platformType);
    this.platforms.push(platform);
  }

  getPlatformType(): PlatformType {
    const rand = Math.random();
    if (rand < 0.7) return PlatformType.NORMAL;
    if (rand < 0.8) return PlatformType.SPIKE;
    if (rand < 0.9) return PlatformType.COLLAPSING;
    if (rand < 0.95) return PlatformType.CONVEYOR;
    return PlatformType.SPRING;
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
    // Instantly follow character for testing (adjust to smooth later if needed)
    this.cameraY = this.character.y - this.canvas.height / 3;
    // For smooth movement, uncomment: 
    // const targetCameraY = this.character.y - this.canvas.height / 3;
    // this.cameraY += (targetCameraY - this.cameraY) * 0.2;
  }

  updateCharacter() {
    if (this.isMovingLeft && !this.isMovingRight) {
      this.character.x -= this.MOVE_SPEED;
    } 
    if (this.isMovingRight && !this.isMovingLeft) {
      this.character.x += this.MOVE_SPEED;
    }

    this.character.velocityY += this.GRAVITY_FORCE;
    if (this.character.velocityY > TERMINAL_VELOCITY) {
      this.character.velocityY = TERMINAL_VELOCITY;
    }
    this.character.y += this.character.velocityY;

    if (this.character.x < 0) {
      this.character.x = 0;
    } else if (this.character.x + this.character.width > this.canvas.width) {
      this.character.x = this.canvas.width - this.character.width;
    }

    if (this.lastPlatformLanded && this.lastPlatformLanded.type === PlatformType.CONVEYOR) {
      const conveyorDirection = this.lastPlatformLanded.id % 2 === 0 ? 1 : -1;
      this.character.x += conveyorDirection * 2.0;
    }
  }

  updatePlatforms() {
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

    this.platforms = this.platforms.filter(platform => platform.y + PLATFORM_HEIGHT > 0);

    if (this.platforms.length > 0) {
      const lowestPlatform = this.platforms.reduce(
        (lowest, current) => current.y > lowest.y ? current : lowest, 
        this.platforms[0]
      );
      if (lowestPlatform.y < this.canvas.height + 100) {
        const newY = lowestPlatform.y + PLATFORM_VERTICAL_GAP;
        this.addPlatform(newY);
      }
    } else {
      this.addPlatform(this.canvas.height - 50);
    }
  }

  checkCollisions() {
    let isOnPlatform = false;
    this.lastPlatformLanded = null;

    if (this.character.y < CEILING_HEIGHT) {
      this.character.y = CEILING_HEIGHT;
      this.character.velocityY = 1;
      this.takeDamage();
    }

    for (const platform of this.platforms) {
      if (platform.collapsed) continue;

      const onPlatformX = this.character.x + this.character.width > platform.x && 
                          this.character.x < platform.x + platform.width;
      const onPlatformY = this.character.y + this.character.height <= platform.y + 5 && 
                          this.character.y + this.character.height + this.character.velocityY >= platform.y;

      if (onPlatformX && onPlatformY && this.character.velocityY >= 0) { // Changed > 0 to >= 0 for consistency
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
    this.health -= DAMAGE_AMOUNT;
    if (this.health < 0) this.health = 0;
    this.onUpdateHealth(this.health);
    playSound('hurt');
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
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, 0, this.canvas.width, CEILING_HEIGHT);

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