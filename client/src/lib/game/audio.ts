// Define sound URLs
const SOUND_URLS = {
  jump: 'https://assets.codepen.io/21542/howler-push.mp3',
  hurt: 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3',
  gameover: 'https://assets.codepen.io/21542/howler-sfx-lose.mp3',
  collapse: 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3',
  // Attack sounds
  attack_spike: 'https://assets.codepen.io/21542/howler-push.mp3',
  attack_speed: 'https://assets.codepen.io/21542/howler-push.mp3',
  attack_narrow: 'https://assets.codepen.io/21542/howler-push.mp3',
  attack_reverse: 'https://assets.codepen.io/21542/howler-push.mp3',
  attack_true_reverse: 'https://assets.codepen.io/21542/howler-push.mp3',
  attack: 'https://assets.codepen.io/21542/howler-push.mp3',
  defense_success: 'https://assets.codepen.io/21542/howler-push.mp3',
  defense_fail: 'https://assets.codepen.io/21542/howler-push.mp3'
};

// Cache for preloaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

// Map attack types to sound keys
const ATTACK_SOUND_MAPPING = {
  SPIKE_PLATFORM: 'attack_spike',
  SPEED_UP: 'attack_speed',
  NARROW_PLATFORM: 'attack_narrow',
  REVERSE_CONTROLS: 'attack_reverse',
  TRUE_REVERSE: 'attack_true_reverse'
};

// Flag to disable sounds if there are too many errors
let soundsEnabled = true;

// Preload all sounds
export function preloadSounds(): void {
  try {
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audioCache[key] = audio;
    });
  } catch (err) {
    console.warn("Error preloading sounds:", err);
    soundsEnabled = false;
  }
}

// Play a sound by key with volume control
export function playSound(key: keyof typeof SOUND_URLS, volume: number = 1.0): void {
  if (!soundsEnabled) return;
  
  try {
    // If sound is not in cache, create it
    if (!audioCache[key]) {
      const audio = new Audio();
      audio.src = SOUND_URLS[key];
      audioCache[key] = audio;
    }
    
    // Create a new audio element to allow overlapping sounds
    const sound = new Audio(SOUND_URLS[key]);
    sound.volume = volume;
    
    // Reset and play the sound
    sound.currentTime = 0;
    sound.play().catch(err => {
      console.warn(`Failed to play sound: ${key}`, err);
    });
  } catch (err) {
    console.warn(`Error playing sound: ${key}`, err);
    
    // If we get too many errors, disable sounds
    if (err.toString().includes("NotSupportedError")) {
      console.warn("Disabling sounds due to browser support issues");
      soundsEnabled = false;
    }
  }
}

// Play attack sound with appropriate volume and effects
export function playAttackSound(attackType: string, isDefense: boolean = false, defenseSuccessful?: boolean): void {
  if (!soundsEnabled) return;
  
  try {
    if (isDefense) {
      // Play defense sounds
      const defenseSound = defenseSuccessful ? 'defense_success' : 'defense_fail';
      playSound(defenseSound, 0.7);
    } else {
      // Play attack sound
      const soundKey = ATTACK_SOUND_MAPPING[attackType as keyof typeof ATTACK_SOUND_MAPPING];
      if (soundKey) {
        playSound(soundKey as keyof typeof SOUND_URLS, 0.6);
      }
    }
  } catch (err) {
    console.warn("Error in playAttackSound:", err);
  }
}

// Initialize by preloading sounds
preloadSounds();
