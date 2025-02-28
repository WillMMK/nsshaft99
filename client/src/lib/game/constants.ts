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
export const SCORE_PER_PLATFORM = 10;
export const SCORE_PER_DISTANCE = 1;

// Game progression
export const DIFFICULTY_INCREASE_RATE = 0.0001; // How fast the game gets harder
export const SCROLL_SPEED_INITIAL = 1.5; // Faster initial scrolling
export const SCROLL_SPEED_MAX = 3.5;  // Higher maximum scroll speed

// Canvas settings
export const CEILING_SPIKE_COUNT = 10;
