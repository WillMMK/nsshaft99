import React, { useEffect, useState } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import { AttackType } from '@/types';
import { playAttackSound } from '@/lib/game/audio';

const AttackNotification: React.FC = () => {
  const { players } = useMultiplayer();
  const { gameState, setGameState } = useGameState();
  const [showDefenseButton, setShowDefenseButton] = useState<boolean>(false);
  const [defenseChance, setDefenseChance] = useState<number>(100); // 100% chance initially
  const [defended, setDefended] = useState<boolean>(false);
  const [defenseSuccessful, setDefenseSuccessful] = useState<boolean>(false);
  const [blinkState, setBlinkState] = useState<boolean>(false);
  
  // Blinking effect for 8-bit style
  useEffect(() => {
    if (gameState.attackNotification) {
      const blinkInterval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 300); // Fast blink rate for urgent feel
      
      return () => clearInterval(blinkInterval);
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
  
  // Show defense button for a short time when a new attack notification comes in
  useEffect(() => {
    if (gameState.attackNotification && !defended) {
      setShowDefenseButton(true);
      setDefenseChance(100); // Reset defense chance
      
      // Decrease defense chance over time
      const interval = setInterval(() => {
        setDefenseChance(prev => {
          const newChance = prev - 5; // Decrease by 5% every 200ms
          return newChance < 0 ? 0 : newChance;
        });
      }, 200);
      
      // Auto-hide after 5 seconds if not defended
      const timer = setTimeout(() => {
        setShowDefenseButton(false);
        setDefended(false);
      }, 5000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [gameState.attackNotification, defended]);
  
  // Reset defended state when attack notification changes
  useEffect(() => {
    setDefended(false);
    setDefenseSuccessful(false);
  }, [gameState.attackNotification]);
  
  if (!gameState.attackNotification) {
    return null;
  }
  
  // Get attack description and color
  const getAttackInfo = (type: AttackType): { description: string; color: string; icon: string; pixelArt: string } => {
    switch (type) {
      case AttackType.SPIKE_PLATFORM:
        return { 
          description: 'SPIKE PLATFORM', 
          color: 'red', 
          icon: '⚡',
          pixelArt: `
          ⬛⬛⬜⬛⬛
          ⬛⬜⬜⬜⬛
          ⬜⬜⬜⬜⬜
          ⬛⬜⬜⬜⬛
          ⬛⬛⬜⬛⬛
          `
        };
      case AttackType.SPEED_UP:
        return { 
          description: 'SPEED UP', 
          color: 'blue', 
          icon: '🏃',
          pixelArt: `
          ⬜⬛⬛⬛⬜
          ⬛⬜⬛⬜⬛
          ⬛⬛⬜⬛⬛
          ⬛⬜⬛⬜⬛
          ⬜⬛⬛⬛⬜
          `
        };
      case AttackType.NARROW_PLATFORM:
        return { 
          description: 'NARROW PLATFORM', 
          color: 'green', 
          icon: '↔️',
          pixelArt: `
          ⬛⬛⬜⬛⬛
          ⬛⬜⬛⬜⬛
          ⬜⬛⬛⬛⬜
          ⬛⬜⬛⬜⬛
          ⬛⬛⬜⬛⬛
          `
        };
      case AttackType.REVERSE_CONTROLS:
        return { 
          description: 'CONTROLS REVERSED', 
          color: 'purple', 
          icon: '🔄',
          pixelArt: `
          ⬜⬜⬜⬜⬜
          ⬛⬛⬜⬛⬛
          ⬛⬛⬜⬛⬛
          ⬛⬜⬛⬜⬛
          ⬜⬛⬛⬛⬜
          `
        };
      default:
        return { 
          description: 'UNKNOWN ATTACK', 
          color: 'gray', 
          icon: '❓',
          pixelArt: `
          ⬛⬜⬜⬜⬛
          ⬛⬛⬛⬜⬛
          ⬛⬛⬜⬛⬛
          ⬛⬛⬛⬛⬛
          ⬛⬛⬜⬛⬛
          `
        };
    }
  };
  
  const attackInfo = getAttackInfo(gameState.attackNotification.attackType);
  
  // Handle defense button click
  const handleDefend = () => {
    // Determine if defense is successful based on chance
    const isSuccessful = Math.random() * 100 <= defenseChance;
    setDefenseSuccessful(isSuccessful);
    
    // Play defense sound with success state
    playAttackSound('', true, isSuccessful);
    
    if (isSuccessful) {
      // Clear the attack effect based on type
      const attackType = gameState.attackNotification?.attackType;
      if (attackType) {
        setGameState(prev => ({
          ...prev,
          activeEffects: {
            ...prev.activeEffects,
            spikePlatforms: attackType === AttackType.SPIKE_PLATFORM ? false : prev.activeEffects.spikePlatforms,
            speedUp: attackType === AttackType.SPEED_UP ? false : prev.activeEffects.speedUp,
            narrowPlatforms: attackType === AttackType.NARROW_PLATFORM ? false : prev.activeEffects.narrowPlatforms,
            reverseControls: attackType === AttackType.REVERSE_CONTROLS ? false : prev.activeEffects.reverseControls
          },
          attackNotification: null
        }));
      }
      setDefended(true);
      setShowDefenseButton(false);
      
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
        setShowDefenseButton(false);
      }, 1000);
    }
  };
  
  // Get color classes based on attack type
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': 
        return {
          border: 'border-red-500',
          bg: 'bg-red-900',
          text: 'text-red-400',
          shadow: 'shadow-red-500/70',
          buttonBg: 'bg-red-700',
          buttonHover: 'hover:bg-red-600'
        };
      case 'blue': 
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-900',
          text: 'text-blue-400',
          shadow: 'shadow-blue-500/70',
          buttonBg: 'bg-blue-700',
          buttonHover: 'hover:bg-blue-600'
        };
      case 'green': 
        return {
          border: 'border-green-500',
          bg: 'bg-green-900',
          text: 'text-green-400',
          shadow: 'shadow-green-500/70',
          buttonBg: 'bg-green-700',
          buttonHover: 'hover:bg-green-600'
        };
      case 'purple': 
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-900',
          text: 'text-purple-400',
          shadow: 'shadow-purple-500/70',
          buttonBg: 'bg-purple-700',
          buttonHover: 'hover:bg-purple-600'
        };
      default:
        return {
          border: 'border-gray-500',
          bg: 'bg-gray-900',
          text: 'text-gray-400',
          shadow: 'shadow-gray-500/70',
          buttonBg: 'bg-gray-700',
          buttonHover: 'hover:bg-gray-600'
        };
    }
  };
  
  const colorClasses = getColorClasses(attackInfo.color);
  
  return (
    <div className="absolute top-4 right-4 z-30 max-w-[300px]">
      <div 
        className={`bg-black bg-opacity-95 border-2 ${colorClasses.border} p-2 
                    ${defended ? '' : blinkState ? 'scale-105' : 'scale-100'} 
                    transition-transform duration-100 
                    shadow-lg ${colorClasses.shadow}
                    image-rendering-pixelated`}
        style={{ 
          boxShadow: `0 0 8px 1px ${blinkState ? colorClasses.text : 'transparent'}`,
          imageRendering: 'pixelated' 
        }}
      >
        {/* Top border pixel design - more compact */}
        <div className="flex justify-between mb-1 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={`pixel-top-${i}`}
              className={`w-2 h-2 ${i % 2 === 0 ? colorClasses.bg : 'bg-black'}`}
            />
          ))}
        </div>
        
        {/* Attack Header - more compact */}
        <div className="bg-black p-1 border border-gray-800 mb-2">
          <div className="flex items-center justify-center">
            <span className="font-pixel text-white text-xs px-1 animate-pulse">
              ATTACK!
            </span>
          </div>
        </div>
        
        {/* Attack Content - more compact */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {/* Pixel Art Icon - smaller */}
          <div className="w-8 h-8 flex items-center justify-center">
            <pre className={`text-[0.4rem] leading-[0.4rem] font-mono whitespace-pre ${colorClasses.text}`}>
              {attackInfo.pixelArt}
            </pre>
          </div>
          
          <div className="flex flex-col items-start">
            <span className="font-pixel text-white text-[10px]">
              {gameState.attackNotification.attackerName}:
            </span>
            
            <span className={`font-pixel ${colorClasses.text} text-xs animate-pulse`}>
              {attackInfo.description}
            </span>
          </div>
        </div>
        
        {/* Defense Button - more compact */}
        {showDefenseButton && !defended && (
          <div className="mt-1">
            <div className="w-full bg-gray-900 h-3 p-[1px] border border-gray-700 mb-1">
              <div 
                className={`h-full ${
                  defenseChance > 50 ? 'bg-green-500' : 
                  defenseChance > 25 ? 'bg-yellow-500' : 
                  'bg-red-500'
                } transition-all duration-200`}
                style={{ width: `${defenseChance}%` }}
              >
                {/* Add pixelated edge pattern */}
                <div className="flex h-full">
                  {Array.from({ length: Math.ceil(defenseChance / 10) }).map((_, i) => (
                    <div 
                      key={`pixel-bar-${i}`}
                      className="w-[10%] h-full border-r border-gray-900"
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleDefend}
              className={`${colorClasses.buttonBg} ${colorClasses.buttonHover} 
                         text-white font-pixel text-[10px] py-1 px-2 w-full
                         border border-gray-700 transition-colors
                         ${blinkState ? 'animate-pulse' : ''}`}
              style={{ 
                boxShadow: `0 2px 0 0 rgba(0,0,0,0.5)`,
                textShadow: '1px 1px 0 #000'
              }}
            >
              DEFEND ({defenseChance}%)
            </button>
          </div>
        )}
        
        {/* Defense Result - more compact */}
        {defended && (
          <div className={`text-center font-pixel text-[10px] py-1 
                          border border-gray-800
                          ${defenseSuccessful ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {defenseSuccessful ? 
              '>>SUCCESS<<' : 
              '>>FAILED<<'}
          </div>
        )}
        
        {/* Bottom border pixel design - more compact */}
        <div className="flex justify-between mt-1 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={`pixel-bottom-${i}`}
              className={`w-2 h-2 ${i % 2 === 0 ? 'bg-black' : colorClasses.bg}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttackNotification; 