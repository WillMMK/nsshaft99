import React, { useEffect, useState } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useGameState } from '@/contexts/GameStateContext';
import { AttackType } from '@/types';

const AttackNotification: React.FC = () => {
  const { players } = useMultiplayer();
  const { gameState, setGameState } = useGameState();
  const [showDefenseButton, setShowDefenseButton] = useState<boolean>(false);
  
  // Show defense button for a short time when a new attack notification comes in
  useEffect(() => {
    if (gameState.attackNotification) {
      setShowDefenseButton(true);
      const timer = setTimeout(() => {
        setShowDefenseButton(false);
      }, 3000); // Show for 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [gameState.attackNotification]);
  
  if (!gameState.attackNotification) {
    return null;
  }
  
  // Get attack description
  const getAttackDescription = (type: AttackType): string => {
    switch (type) {
      case AttackType.SPIKE_PLATFORM:
        return 'Spike Platform';
      case AttackType.SPEED_UP:
        return 'Speed Up';
      case AttackType.NARROW_PLATFORM:
        return 'Narrow Platform';
      case AttackType.REVERSE_CONTROLS:
        return 'Reverse Controls';
      default:
        return 'Unknown Attack';
    }
  };
  
  // Handle defense button click
  const handleDefend = () => {
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
    setShowDefenseButton(false);
  };
  
  return (
    <div className="absolute top-16 left-0 right-0 flex justify-center z-30 pointer-events-none">
      <div className="bg-game-dark bg-opacity-80 border-2 border-red-500 p-2 rounded-lg animate-pulse max-w-[80%]">
        <div className="flex items-center mb-1">
          <span className="text-white text-xs font-pixel">
            {gameState.attackNotification.attackerName} sent:
          </span>
        </div>
        <div className="text-red-400 text-sm font-pixel mb-1">
          {getAttackDescription(gameState.attackNotification.attackType)}
        </div>
        
        {showDefenseButton && (
          <button 
            onClick={handleDefend}
            className="bg-game-blue text-white text-xs font-pixel py-1 px-3 rounded mt-1 w-full pointer-events-auto"
          >
            DEFEND!
          </button>
        )}
      </div>
    </div>
  );
};

export default AttackNotification; 