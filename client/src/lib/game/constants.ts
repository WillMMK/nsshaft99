// Game constants
export const INITIAL_HEALTH = 100;
export const HEALTH_GAIN = 10; // Increased health gain for better balance
export const DAMAGE_AMOUNT = 25; // Increased spike damage amount for more challenge
export const INVINCIBILITY_DURATION = 1200; // Shortened invincibility period for harder gameplay
export const INVINCIBILITY_FLASH_RATE = 150; // Faster flashing during invincibility

// Character constants
export const CHARACTER_SIZE = 24;
export const CHARACTER_SPEED = 4; // Slower for more control
export const GRAVITY = 0.3; // Reduced for less aggressive falling
export const TERMINAL_VELOCITY = 9; // Slightly slower max falling speed
export const CHARACTER_COLOR = '#FFD166';
export const FACE_COLOR = '#E9ECEF';
export const EYES_COLOR = '#212529';

// Platform constants
export const PLATFORM_HEIGHT = 10;
export const MIN_PLATFORM_WIDTH = 60; // Minimum platform width for a reasonable landing area
export const MAX_PLATFORM_WIDTH = 120; // Reduced maximum width to prevent excessively long platforms 
export const PLATFORM_VERTICAL_GAP = 90; // Slightly increased for easier navigation
export const PLATFORM_HORIZONTAL_SPACING = 100;
export const CEILING_HEIGHT = 30;
export const SPIKE_HEIGHT = 15;

// Platform type probabilities (as game progresses these will change)
export const INITIAL_PROBABILITIES = {
  NORMAL: 0.5,  // Reduced normal platforms for more challenge
  SPIKE: 0.15,  // Increased spike platforms
  COLLAPSING: 0.15, // Increased collapsing platforms
  CONVEYOR: 0.1,
  SPRING: 0.1,
};

// Platform colors
export const PLATFORM_COLORS = {
  NORMAL: '#4A6FA5',
  SPIKE: '#F25C54',
  COLLAPSING: '#E9ECEF',
  CONVEYOR: '#FFD166',
  SPRING: '#FFD166',
};

// Score constants
export const SCORE_PER_PLATFORM = 5;          // Reduced from 10 to slow down scoring
export const SCORE_PER_DISTANCE = 0.1;        // Reduced from 1.0 to 0.1 to significantly slow score growth

// Game progression - adjusted for slower score growth
export const DIFFICULTY_INCREASE_RATE = 0.0001; // How fast the game gets harder
export const BASE_SCROLL_SPEED = 2.5;          // Initial scroll speed (pixels per frame)
export const SCROLL_SPEED_INCREMENT = 0.5;     // Amount to increase speed per milestone
export const MAX_SCROLL_SPEED = 5.0;           // Upper limit to maintain playability
export const SCORE_PER_INCREMENT = 1000;       // Increased from 100 to 1000 as requested

// Canvas settings
export const CEILING_SPIKE_COUNT = 10;

// Power-up settings
// PowerUpType is now defined in EffectManager.ts
export const POWER_UP_SIZE = 20;
export const POWER_UP_SPAWN_CHANCE = 0.25; // Reduced to 25% chance per platform to prevent overcrowding
export const INVINCIBILITY_POWER_UP_DURATION = 5000; // 5 seconds
export const SLOW_FALL_POWER_UP_DURATION = 7000; // 7 seconds
export const SLOW_FALL_FACTOR = 0.5; // Halves fall speed
export const HEALTH_BOOST_AMOUNT = 50; // +50% health

// Attack item constants
export const ATTACK_ITEM_SPAWN_CHANCE = 0.4; // 40% chance to spawn an attack item in multiplayer
export const SHIELD_SPAWN_CHANCE = 0.2; // 20% chance to spawn a shield in multiplayer
export const ATTACK_ITEM_COLORS = {
  // ATTACK_SPIKE_PLATFORM: '#FF5733', // Red
  // ATTACK_SPEED_UP: '#3357FF', // Blue
  // ATTACK_NARROW_PLATFORM: '#33FF57', // Green
  // ATTACK_REVERSE_CONTROLS: '#FF33F5', // Purple
  // ATTACK_TRUE_REVERSE: '#8333FF', // Indigo
  // SHIELD: '#F5FF33' // Yellow
};

export const ATTACK_ITEM_ICONS = {
  // ATTACK_SPIKE_PLATFORM: '⚡', // Spike Platform
  // ATTACK_SPEED_UP: '🏃', // Speed Up
  // ATTACK_NARROW_PLATFORM: '↔️', // Narrow Platform
  // ATTACK_REVERSE_CONTROLS: '🔄', // Reverse Controls
  // ATTACK_TRUE_REVERSE: '⇄', // True Reverse
  // SHIELD: '🛡️' // Shield
};

// Multiplayer constants
export const SERVER_URL = typeof window !== 'undefined' 
  ? window.location.origin  // Use the same origin as the client in production/Replit
  : 'http://localhost:5000'; // Fallback for SSR or development
export const DEFAULT_GAME_ID = 'default-game';
export const MAX_PLAYERS = 10;
export const PLAYER_COLORS = [
  '#FF5733', // Red-Orange
  '#33FF57', // Green
  '#3357FF', // Blue
  '#FF33F5', // Pink
  '#F5FF33', // Yellow
  '#33FFF5', // Cyan
  '#F533FF', // Magenta
  '#FF8333', // Orange
  '#8333FF', // Purple
  '#33FF83'  // Mint
];

// Attack constants
export const ATTACK_DURATION = 5000; // 5 seconds
export const ATTACK_COOLDOWN = 3000; // 3 seconds cooldown between attacks
export const ATTACK_THRESHOLD_SCORE = 500; // Score needed to send attacks
export const ATTACK_COLORS = {
  SPIKE_PLATFORM: '#FF5733', // Red-Orange
  SPEED_UP: '#3357FF', // Blue
  NARROW_PLATFORM: '#33FF57', // Green
  REVERSE_CONTROLS: '#FF33F5' // Pink
};
// No need to import PowerUpType here, it's defined in EffectManager.ts './EffectManager';