export default class GameEngine {
  constructor(canvas, updateHealth, updateScore, gameOverCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.character = { x: 124.5, y: 222, vy: 0, speed: 5 };
    this.platforms = [{ x: 86.5, y: 270, width: 100, height: 10 }];
    this.cameraY = 0;
    this.gameActive = true;
    this.updateHealth = updateHealth;
    this.updateScore = updateScore;
    this.gameOverCallback = gameOverCallback;

    this.initializePlatforms();
    this.setupControls();
  }

  initializePlatforms() {
    // Add starting platform and 5 more
    for (let i = 1; i <= 5; i++) {
      this.platforms.push({
        x: Math.random() * (this.canvas.width - 100),
        y: 270 + i * 100,
        width: 100,
        height: 10,
      });
    }
    console.log("Initialized 5 platforms");
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.character.x += this.character.speed;
      if (e.key === 'ArrowLeft') this.character.x -= this.character.speed;
      if (e.key === 'ArrowUp' && this.character.vy === 0) this.character.vy = -10; // Jump
    });
    console.log("Setting up keyboard controls");
  }

  updateCamera() {
    // Center camera on character, but don't exceed canvas bounds
    const targetCameraY = this.character.y - this.canvas.height / 2;
    this.cameraY = Math.max(targetCameraY, 0);
    console.log("CameraY:", this.cameraY);
  }

  update() {
    if (!this.gameActive) return;

    // Apply gravity and update character position
    this.character.vy += 0.5; // Gravity
    this.character.y += this.character.vy;

    // Check platform collisions
    for (const platform of this.platforms) {
      if (
        this.character.x + 20 > platform.x &&
        this.character.x < platform.x + platform.width &&
        this.character.y + 20 > platform.y &&
        this.character.y + 20 - this.character.vy <= platform.y
      ) {
        this.character.y = platform.y - 20;
        this.character.vy = 0;
      }
    }

    this.updateCamera();
    this.draw();
    console.log("Character position:", this.character.x, this.character.y);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera offset
    this.ctx.save();
    this.ctx.translate(0, -this.cameraY);

    // Draw character
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(this.character.x, this.character.y, 20, 20);

    // Draw platforms
    this.ctx.fillStyle = 'gray';
    for (const platform of this.platforms) {
      this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    this.ctx.restore();
  }
}