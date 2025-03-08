import React, { useEffect, useState } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import { AttackType } from '@/types';
import { playAttackSound } from '@/lib/game/audio';

// Debug helper
function logAttack(message: string, data?: any) {
  console.log(`[ATTACK SYSTEM] ${message}`, data || '');
}

// Component to display the last attack sent notification
export const LastAttackSentNotification: React.FC = () => {
  const { gameState } = useGameState();
  const [visible, setVisible] = useState(false);
  const [blinkState, setBlinkState] = useState(false);

  // Reset state when game is over
  useEffect(() => {
    if (gameState.isGameOver) {
      setVisible(false);
      setBlinkState(false);
    }
  }, [gameState.isGameOver]);

  useEffect(() => {
    // First check game over state
    if (gameState.isGameOver) {
      setVisible(false);
      return;
    }

    if (gameState.lastAttackSent) {
      console.log('Last attack sent notification received:', gameState.lastAttackSent);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000); // Show for 3 seconds
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [gameState.lastAttackSent, gameState.isGameOver]);

  // Add blinking effect to match received notification
  useEffect(() => {
    // First check game over state
    if (gameState.isGameOver) {
      return;
    }

    if (visible) {
      const blinkInterval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 300);
      return () => clearInterval(blinkInterval);
    }
  }, [visible, gameState.isGameOver]);

  if (!gameState.lastAttackSent || !visible || gameState.isGameOver) {
    return null;
  }

  // Get attack info using the same helper function
  const getAttackInfo = (type: AttackType): { description: string; color: string; icon: string; } => {
    switch (type) {
      case AttackType.SPIKE_PLATFORM:
        return { 
          description: 'SPIKE PLATFORM', 
          color: 'red', 
          icon: '⚡'
        };
      case AttackType.SPEED_UP:
        return { 
          description: 'SPEED UP', 
          color: 'blue', 
          icon: '🏃'
        };
      case AttackType.NARROW_PLATFORM:
        return { 
          description: 'NARROW PLATFORM', 
          color: 'green', 
          icon: '↔️'
        };
      case AttackType.REVERSE_CONTROLS:
        return { 
          description: 'FLIP CONTROLS', 
          color: 'purple', 
          icon: '🔄'
        };
      case AttackType.TRUE_REVERSE:
        return { 
          description: 'REVERSE CONTROLS', 
          color: 'indigo', 
          icon: '⇄'
        };
      default:
        return { 
          description: 'UNKNOWN ATTACK', 
          color: 'gray', 
          icon: '❓'
        };
    }
  };

  const attackInfo = getAttackInfo(gameState.lastAttackSent.type);

  // Get color classes using the same helper function
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': 
        return {
          border: 'border-red-500',
          bg: 'bg-red-900',
          text: 'text-red-400',
          shadow: 'shadow-red-500/70',
        };
      case 'blue': 
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-900',
          text: 'text-blue-400',
          shadow: 'shadow-blue-500/70',
        };
      case 'green': 
        return {
          border: 'border-green-500',
          bg: 'bg-green-900',
          text: 'text-green-400',
          shadow: 'shadow-green-500/70',
        };
      case 'purple': 
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-900',
          text: 'text-purple-400',
          shadow: 'shadow-purple-500/70',
        };
      case 'indigo': 
        return {
          border: 'border-indigo-500',
          bg: 'bg-indigo-900',
          text: 'text-indigo-400',
          shadow: 'shadow-indigo-500/70',
        };
      default:
        return {
          border: 'border-gray-500',
          bg: 'bg-gray-900',
          text: 'text-gray-400',
          shadow: 'shadow-gray-500/70',
        };
    }
  };

  const colorClasses = getColorClasses(attackInfo.color);

  return (
    <div className="fixed top-4 left-4 z-50">
      <div 
        className={`
          pixel-box 
          max-w-[200px]
          rounded 
          p-3
          ${blinkState ? colorClasses.border : 'border-white'} 
          border-2
          ${colorClasses.bg}
          ${colorClasses.shadow}
          shadow-lg
          text-center
          flex flex-col items-center
          justify-center
          transform
          transition-all
          pixel-corners
          animate-bounce-small
        `}
        style={{ 
          transition: 'transform 0.5s, opacity 0.5s',
          imageRendering: 'pixelated' 
        }}
      >
        <div className="font-bold text-lg mb-1 text-white pixel-text">Attack Sent!</div>
        
        <div className="text-xl mb-1">{attackInfo.icon}</div>
        
        <div className={`font-bold text-xs mb-1 ${colorClasses.text} pixel-text`}>
          {attackInfo.description}
        </div>
        
        <div className="text-sm text-white pixel-text">
          Target: {gameState.lastAttackSent.targetName}
        </div>
      </div>
    </div>
  );
};

const AttackNotification: React.FC = () => {
  const { players } = useMultiplayer();
  const { gameState, setGameState } = useGameState();
  const [timeLeft, setTimeLeft] = useState<number>(3000); // 3000ms = 3 seconds total duration
  const [defenseChance, setDefenseChance] = useState<number>(100);
  const [defended, setDefended] = useState<boolean>(false);
  const [defenseSuccessful, setDefenseSuccessful] = useState<boolean>(false);
  const [blinkState, setBlinkState] = useState<boolean>(false);
  const [defenseAttempted, setDefenseAttempted] = useState<boolean>(false);
  
  // Clear all effects and timers when game is over
  useEffect(() => {
    if (gameState.isGameOver) {
      setDefended(true);
      setDefenseSuccessful(false);
      setDefenseAttempted(true);
      setTimeLeft(0);
      clearAttackEffects();
    }
  }, [gameState.isGameOver]);
  
  // Play attack sound when notification appears
  useEffect(() => {
    // First check game over state before doing anything
    if (gameState.isGameOver) {
      return;
    }

    if (gameState.attackNotification && !defended) {
      // Play attack sound
      playAttackSound(gameState.attackNotification.attackType);
      
      // Vibrate device if supported
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Pattern: vibrate, pause, vibrate
      }
    }

    // Cleanup function to handle unmounting or game over
    return () => {
      if (gameState.isGameOver) {
        // Clear any pending effects
        setDefended(true);
        setDefenseSuccessful(false);
        setDefenseAttempted(true);
        setTimeLeft(0);
        clearAttackEffects();
      }
    };
  }, [gameState.attackNotification, defended, gameState.isGameOver]);
  
  // Automatic defense system based on player movement
  useEffect(() => {
    // First check game over state
    if (gameState.isGameOver) {
      return;
    }

    if (gameState.attackNotification && !defended && !defenseAttempted) {
      // Initialize defense
      setDefenseChance(100);
      setDefenseAttempted(false);
      
      // Decrease defense chance over time (slower than before)
      const interval = setInterval(() => {
        setDefenseChance(prev => {
          const newChance = prev - 2; // Decrease by 2% every 200ms (slower reduction)
          return newChance < 0 ? 0 : newChance;
        });
      }, 200);
      
      // Automatic defense will be triggered after 2.5 seconds
      const defenseTimer = setTimeout(() => {
        attemptDefense();
      }, 2500);
      
      // Auto-hide after 3 seconds if not defended
      const hideTimer = setTimeout(() => {
        if (!defended) {
          setDefended(true);
          setDefenseSuccessful(false);
          
          // Ensure attack effects are cleared after their duration
          setTimeout(() => {
            clearAttackEffects();
          }, 3000);
        }
      }, 3000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(defenseTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [gameState.attackNotification, defended, defenseAttempted, gameState.isGameOver]);
  
  // Check if player is moving based on gameState
  const isPlayerMoving = () => {
    // If we have movement data from gameState, use it
    return gameState.isMovingLeft || gameState.isMovingRight;
  };
  
  // Attempt defense based on player's movement and current defense chance
  const attemptDefense = () => {
    // First check game over state
    if (gameState.isGameOver || defended || defenseAttempted) return;
    
    setDefenseAttempted(true);
    
    // If player is currently moving, they get a 50% boost to defense chance
    const movementBonus = isPlayerMoving() ? 50 : 0;
    const finalDefenseChance = Math.min(100, defenseChance + movementBonus);
    
    // Determine if defense is successful
    const isSuccessful = Math.random() * 100 <= finalDefenseChance;
    setDefenseSuccessful(isSuccessful);
    
    // Only play sounds if not in game over
    if (!gameState.isGameOver) {
      // Play defense sound with success state
      playAttackSound('', true, isSuccessful);
      
      // Vibrate success pattern
      if (navigator.vibrate) {
        navigator.vibrate(isSuccessful ? [50, 30, 50, 30, 50] : [200, 100, 200]);
      }
    }
    
    if (isSuccessful) {
      // Clear the attack effect
      clearAttackEffects();
    } else {
      // Defense failed - show feedback
      setDefended(true);
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          attackNotification: null
        }));
      }, 1000);
    }
  };
  
  // Clear attack effects
  const clearAttackEffects = () => {
    if (!gameState.attackNotification) return;
    
    const attackType = gameState.attackNotification.attackType;
    setGameState(prev => ({
      ...prev,
      activeEffects: {
        ...prev.activeEffects,
        spikePlatforms: attackType === AttackType.SPIKE_PLATFORM ? false : prev.activeEffects.spikePlatforms,
        speedUp: attackType === AttackType.SPEED_UP ? false : prev.activeEffects.speedUp,
        narrowPlatforms: attackType === AttackType.NARROW_PLATFORM ? false : prev.activeEffects.narrowPlatforms,
        reverseControls: attackType === AttackType.REVERSE_CONTROLS ? false : prev.activeEffects.reverseControls,
        trueReverse: attackType === AttackType.TRUE_REVERSE ? false : prev.activeEffects.trueReverse
      },
      attackNotification: null
    }));
    
    setDefended(true);
  };
  
  // Reset state when attack notification changes
  useEffect(() => {
    if (gameState.attackNotification) {
      setDefended(false);
      setDefenseSuccessful(false);
      setDefenseAttempted(false);
    }
  }, [gameState.attackNotification]);
  
  // Update duration timer
  useEffect(() => {
    if (gameState.attackNotification && !defended) {
      // Start at 3 seconds (3000ms)
      setTimeLeft(3000);
      
      // Update every 100ms for smooth countdown
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 100;
          return newTime < 0 ? 0 : newTime;
        });
      }, 100);

      // Auto-hide after 3 seconds if not defended
      const hideTimer = setTimeout(() => {
        if (!defended) {
          setDefended(true);
          setDefenseSuccessful(false);
          
          // Ensure attack effects are cleared after their duration
          setTimeout(() => {
            clearAttackEffects();
          }, 3000);
        }
      }, 3000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(hideTimer);
      };
    }
  }, [gameState.attackNotification, defended]);
  
  if (!gameState.attackNotification || gameState.isGameOver) {
    return null;
  }
  
  // Get attack description and color
  const getAttackInfo = (type: AttackType): { description: string; color: string; icon: string; } => {
    switch (type) {
      case AttackType.SPIKE_PLATFORM:
        return { 
          description: 'SPIKE PLATFORM', 
          color: 'red', 
          icon: '⚡'
        };
      case AttackType.SPEED_UP:
        return { 
          description: 'SPEED UP', 
          color: 'blue', 
          icon: '🏃'
        };
      case AttackType.NARROW_PLATFORM:
        return { 
          description: 'NARROW PLATFORM', 
          color: 'green', 
          icon: '↔️'
        };
      case AttackType.REVERSE_CONTROLS:
        return { 
          description: 'FLIP CONTROLS', 
          color: 'purple', 
          icon: '🔄'
        };
      case AttackType.TRUE_REVERSE:
        return { 
          description: 'REVERSE CONTROLS', 
          color: 'indigo', 
          icon: '⇄'
        };
      default:
        return { 
          description: 'UNKNOWN ATTACK', 
          color: 'gray', 
          icon: '❓'
        };
    }
  };
  
  const attackInfo = getAttackInfo(gameState.attackNotification.attackType);
  
  // Get color classes based on attack type
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': 
        return {
          border: 'border-red-500',
          bg: 'bg-red-900',
          text: 'text-red-400',
          shadow: 'shadow-red-500/70',
        };
      case 'blue': 
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-900',
          text: 'text-blue-400',
          shadow: 'shadow-blue-500/70',
        };
      case 'green': 
        return {
          border: 'border-green-500',
          bg: 'bg-green-900',
          text: 'text-green-400',
          shadow: 'shadow-green-500/70',
        };
      case 'purple': 
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-900',
          text: 'text-purple-400',
          shadow: 'shadow-purple-500/70',
        };
      case 'indigo': 
        return {
          border: 'border-indigo-500',
          bg: 'bg-indigo-900',
          text: 'text-indigo-400',
          shadow: 'shadow-indigo-500/70',
        };
      default:
        return {
          border: 'border-gray-500',
          bg: 'bg-gray-900',
          text: 'text-gray-400',
          shadow: 'shadow-gray-500/70',
        };
    }
  };
  
  const colorClasses = getColorClasses(attackInfo.color);
  
  // Format time remaining
  const formatTimeLeft = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div 
        className={`
          pixel-box 
          max-w-[200px]
          rounded 
          p-3
          ${blinkState ? colorClasses.border : 'border-white'} 
          border-2
          ${colorClasses.bg}
          ${colorClasses.shadow}
          shadow-lg
          text-center
          flex flex-col items-center
          justify-center
          transform
          transition-all
          pixel-corners
          ${defended ? (defenseSuccessful ? 'scale-150 opacity-0' : 'shake-animation') : 'animate-bounce-small'}
        `}
        style={{ 
          transition: 'transform 0.5s, opacity 0.5s',
          imageRendering: 'pixelated' 
        }}
      >
        <div className="text-sm text-white font-bold mb-1 pixel-text">
          {gameState.attackNotification.attackerName}
        </div>
        
        <div className="text-xl mb-1">{attackInfo.icon}</div>
        
        <div className={`font-bold text-xs mb-1 ${colorClasses.text} pixel-text`}>
          {attackInfo.description}
        </div>
        
        {!defenseAttempted ? (
          <div className="text-white text-xs mb-1 pixel-text">
            Duration: {formatTimeLeft(timeLeft)}
          </div>
        ) : defended ? (
          <div className={`text-xs mb-1 pixel-text ${defenseSuccessful ? 'text-green-400' : 'text-red-400'}`}>
            {defenseSuccessful ? 'DEFENDED!' : 'FAILED!'}
          </div>
        ) : null}
        
        {/* Duration progress bar */}
        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full ${attackInfo.color === 'red' ? 'bg-red-500' : attackInfo.color === 'blue' ? 'bg-blue-500' : attackInfo.color === 'green' ? 'bg-green-500' : attackInfo.color === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'}`}
            style={{ width: `${(timeLeft / 3000) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AttackNotification; 