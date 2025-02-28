// Game constants
export const INITIAL_HEALTH = 100;
export const HEALTH_GAIN = 5;
export const DAMAGE_AMOUNT = 15; // Reduced damage for better survivability

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
export const MIN_PLATFORM_WIDTH = 70; // Slightly wider for easier landing
export const MAX_PLATFORM_WIDTH = 160; 
export const PLATFORM_VERTICAL_GAP = 90; // Slightly increased for easier navigation
export const PLATFORM_HORIZONTAL_SPACING = 100;
export const CEILING_HEIGHT = 30;
export const SPIKE_HEIGHT = 15;

// Platform type probabilities (as game progresses these will change)
export const INITIAL_PROBABILITIES = {
  NORMAL: 0.6,
  SPIKE: 0.1,
  COLLAPSING: 0.1,
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
export const SCROLL_SPEED_INITIAL = 1;
export const SCROLL_SPEED_MAX = 3;

// Canvas settings
export const CEILING_SPIKE_COUNT = 10;
