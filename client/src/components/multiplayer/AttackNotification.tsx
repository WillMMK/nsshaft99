import React, { useEffect, useState } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import { AttackType } from '@/types';

const AttackNotification: React.FC = () => {
  const { players } = useMultiplayer();
  const { gameState, setGameState } = useGameState();
  const [showDefenseButton, setShowDefenseButton] = useState<boolean>(false);
  const [defenseChance, setDefenseChance] = useState<number>(100); // 100% chance initially
  const [defended, setDefended] = useState<boolean>(false);
  const [defenseSuccessful, setDefenseSuccessful] = useState<boolean>(false);
  
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
  const getAttackInfo = (type: AttackType): { description: string; color: string; icon: string } => {
    switch (type) {
      case AttackType.SPIKE_PLATFORM:
        return { 
          description: 'Spike Platform', 
          color: 'red', 
          icon: '⚡' 
        };
      case AttackType.SPEED_UP:
        return { 
          description: 'Speed Up', 
          color: 'blue', 
          icon: '🏃' 
        };
      case AttackType.NARROW_PLATFORM:
        return { 
          description: 'Narrow Platform', 
          color: 'green', 
          icon: '↔️' 
        };
      case AttackType.REVERSE_CONTROLS:
        return { 
          description: 'Reverse Controls', 
          color: 'purple', 
          icon: '🔄' 
        };
      default:
        return { 
          description: 'Unknown Attack', 
          color: 'gray', 
          icon: '❓' 
        };
    }
  };
  
  const attackInfo = getAttackInfo(gameState.attackNotification.attackType);
  
  // Handle defense button click
  const handleDefend = () => {
    // Determine if defense is successful based on chance
    const isSuccessful = Math.random() * 100 <= defenseChance;
    setDefenseSuccessful(isSuccessful);
    
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
    } else {
      // Defense failed - show feedback
      setDefended(true);
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          attackNotification: null
        }));
        setShowDefenseButton(false);
      }, 1000);
    }
  };
  
  return (
    <div className="absolute top-16 left-0 right-0 flex justify-center z-30">
      <div className={`bg-game-dark bg-opacity-90 border-2 ${
        attackInfo.color === 'red' ? 'border-red-500' :
        attackInfo.color === 'blue' ? 'border-blue-500' :
        attackInfo.color === 'green' ? 'border-green-500' :
        attackInfo.color === 'purple' ? 'border-purple-500' :
        'border-gray-500'
      } p-3 rounded-lg ${defended ? '' : 'animate-pulse'} max-w-[80%] shadow-lg`}>
        <div className="flex items-center mb-2">
          <span className="text-white text-sm font-bold mr-2">
            {gameState.attackNotification.attackerName} sent:
          </span>
          <span className="text-xl">{attackInfo.icon}</span>
        </div>
        
        <div className={`${
          attackInfo.color === 'red' ? 'text-red-400' :
          attackInfo.color === 'blue' ? 'text-blue-400' :
          attackInfo.color === 'green' ? 'text-green-400' :
          attackInfo.color === 'purple' ? 'text-purple-400' :
          'text-gray-400'
        } text-lg font-bold mb-2`}>
          {attackInfo.description}
        </div>
        
        {showDefenseButton && !defended && (
          <div>
            <div className="w-full bg-gray-700 h-2 rounded-full mb-2">
              <div 
                className={`h-full ${
                  defenseChance > 50 ? 'bg-green-500' : 
                  defenseChance > 25 ? 'bg-yellow-500' : 
                  'bg-red-500'
                } rounded-full`}
                style={{ width: `${defenseChance}%` }}
              ></div>
            </div>
            
            <button 
              onClick={handleDefend}
              className="bg-game-blue hover:bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded w-full transition-colors"
            >
              DEFEND! ({defenseChance}% chance)
            </button>
          </div>
        )}
        
        {defended && (
          <div className={`text-center ${defenseSuccessful ? 'text-green-500' : 'text-red-500'} font-bold`}>
            {defenseSuccessful ? 'Defense Successful!' : 'Defense Failed!'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttackNotification; 