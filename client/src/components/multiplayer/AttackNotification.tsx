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

  useEffect(() => {
    if (gameState.lastAttackSent) {
      console.log('Last attack sent notification received:', gameState.lastAttackSent);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000); // Show for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState.lastAttackSent]);

  if (!gameState.lastAttackSent || !visible) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <div className="bg-game-blue text-white p-3 rounded shadow-lg animate-bounce-small border-2 border-white">
        <div className="font-bold text-lg mb-1">Attack Sent!</div>
        <div className="text-sm">
          Type: {gameState.lastAttackSent.type}<br/>
          Target: {gameState.lastAttackSent.targetName}
        </div>
      </div>
    </div>
  );
};

const AttackNotification: React.FC = () => {
  const { players } = useMultiplayer();
  const { gameState, setGameState } = useGameState();
  const [defenseChance, setDefenseChance] = useState<number>(100); // 100% chance initially
  const [defended, setDefended] = useState<boolean>(false);
  const [defenseSuccessful, setDefenseSuccessful] = useState<boolean>(false);
  const [blinkState, setBlinkState] = useState<boolean>(false);
  const [defenseAttempted, setDefenseAttempted] = useState<boolean>(false);
  
  // Blinking effect for 8-bit style
  useEffect(() => {
    if (gameState.attackNotification) {
      const blinkInterval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 300); // Fast blink rate for urgent feel
      
      return () => {
        clearInterval(blinkInterval);
      };
    }
  }, [gameState.attackNotification]);
  
  // Play attack sound when notification appears
  useEffect(() => {
    if (gameState.attackNotification && !defended) {
      // Play attack sound
      playAttackSound(gameState.attackNotification.attackType);
      
      // Vibrate device if supported
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Pattern: vibrate, pause, vibrate
      }
    }
  }, [gameState.attackNotification, defended]);
  
  // Automatic defense system based on player movement
  useEffect(() => {
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
      
      // Auto-hide after 5 seconds if not defended
      const hideTimer = setTimeout(() => {
        if (!defended) {
          setDefended(true);
          setDefenseSuccessful(false);
          
          // Ensure attack effects are cleared after their duration
          setTimeout(() => {
            clearAttackEffects();
          }, 5000);
        }
      }, 5000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(defenseTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [gameState.attackNotification, defended, defenseAttempted]);
  
  // Check if player is moving based on gameState
  const isPlayerMoving = () => {
    // If we have movement data from gameState, use it
    return gameState.isMovingLeft || gameState.isMovingRight;
  };
  
  // Attempt defense based on player's movement and current defense chance
  const attemptDefense = () => {
    if (defended || defenseAttempted) return;
    
    setDefenseAttempted(true);
    
    // If player is currently moving, they get a 50% boost to defense chance
    const movementBonus = isPlayerMoving() ? 50 : 0;
    const finalDefenseChance = Math.min(100, defenseChance + movementBonus);
    
    // Determine if defense is successful
    const isSuccessful = Math.random() * 100 <= finalDefenseChance;
    setDefenseSuccessful(isSuccessful);
    
    // Play defense sound with success state
    playAttackSound('', true, isSuccessful);
    
    if (isSuccessful) {
      // Clear the attack effect
      clearAttackEffects();
      
      // Vibrate success pattern
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 50]); // Success pattern
      }
    } else {
      // Defense failed - show feedback
      setDefended(true);
      
      // Vibrate failure pattern
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // Stronger vibration for failure
      }
      
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
  
  if (!gameState.attackNotification) {
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
            MOVE TO DEFEND!
          </div>
        ) : defended ? (
          <div className={`text-xs mb-1 pixel-text ${defenseSuccessful ? 'text-green-400' : 'text-red-400'}`}>
            {defenseSuccessful ? 'SUCCESS!' : 'FAILED!'}
          </div>
        ) : null}
        
        {/* Defense chance meter */}
        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full ${attackInfo.color === 'red' ? 'bg-red-500' : attackInfo.color === 'blue' ? 'bg-blue-500' : attackInfo.color === 'green' ? 'bg-green-500' : attackInfo.color === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'}`}
            style={{ width: `${defenseChance}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AttackNotification; 