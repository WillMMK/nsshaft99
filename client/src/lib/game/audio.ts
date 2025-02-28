// Define sound URLs
const SOUND_URLS = {
  jump: 'https://assets.codepen.io/21542/howler-push.mp3',
  hurt: 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3',
  gameover: 'https://assets.codepen.io/21542/howler-sfx-lose.mp3',
  collapse: 'https://assets.codepen.io/21542/howler-sfx-levelup.mp3'
};

// Cache for preloaded audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

// Preload all sounds
export function preloadSounds(): void {
  Object.entries(SOUND_URLS).forEach(([key, url]) => {
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';
    audioCache[key] = audio;
  });
}

// Play a sound by key
export function playSound(key: keyof typeof SOUND_URLS): void {
  // If sound is not in cache, create it
  if (!audioCache[key]) {
    const audio = new Audio();
    audio.src = SOUND_URLS[key];
    audioCache[key] = audio;
  }
  
  // Create a new audio element to allow overlapping sounds
  const sound = audioCache[key];
  
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

// Initialize by preloading sounds
preloadSounds();
