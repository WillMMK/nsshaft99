// Define sound URLs
const SOUND_URLS = {
  jump: 'https://assets.codepen.io/21542/howler-push.mp3',
  hurt: 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3',
  gameover: 'https://assets.codepen.io/21542/howler-sfx-lose.mp3',
  collapse: 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3',
  // Attack sounds
  attack_spike: 'https://assets.codepen.io/21542/sfx-metal-hit.mp3',
  attack_speed: 'https://assets.codepen.io/21542/sfx-whoosh.mp3',
  attack_narrow: 'https://assets.codepen.io/21542/sfx-shrink.mp3',
  attack_reverse: 'https://assets.codepen.io/21542/sfx-spin.mp3',
  defense_success: 'https://assets.codepen.io/21542/sfx-shield.mp3',
  defense_fail: 'https://assets.codepen.io/21542/sfx-break.mp3'
};

// Cache for preloaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

// Map attack types to sound keys
const ATTACK_SOUND_MAPPING = {
  SPIKE_PLATFORM: 'attack_spike',
  SPEED_UP: 'attack_speed',
  NARROW_PLATFORM: 'attack_narrow',
  REVERSE_CONTROLS: 'attack_reverse'
};

// Preload all sounds
export function preloadSounds(): void {
  Object.entries(SOUND_URLS).forEach(([key, url]) => {
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';
    audioCache[key] = audio;
  });
}

// Play a sound by key with volume control
export function playSound(key: keyof typeof SOUND_URLS, volume: number = 1.0): void {
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
  try {
    sound.currentTime = 0;
    sound.play().catch(err => {
      console.warn(`Failed to play sound: ${key}`, err);
    });
  } catch (err) {
    console.warn(`Error playing sound: ${key}`, err);
  }
}

// Play attack sound with appropriate volume and effects
export function playAttackSound(attackType: string, isDefense: boolean = false, defenseSuccessful?: boolean): void {
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
}

// Initialize by preloading sounds
preloadSounds();
