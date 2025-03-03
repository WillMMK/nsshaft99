import React, { useState, useEffect } from 'react';
import { AttackType } from '@/types';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { ATTACK_THRESHOLD_SCORE, ATTACK_COOLDOWN } from '@/lib/game/constants';

interface AttackButtonProps {
  score: number;
}

const AttackButton: React.FC<AttackButtonProps> = ({ score }) => {
  const { isMultiplayer, sendAttack } = useMultiplayer();
  const [showAttackMenu, setShowAttackMenu] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  
  // Check if player has enough score to send attacks
  const canAttack = score >= ATTACK_THRESHOLD_SCORE && !cooldown;
  
  // Handle cooldown timer
  useEffect(() => {
    if (cooldown) {
      const interval = setInterval(() => {
        setCooldownTime(prev => {
          const newTime = prev - 100;
          if (newTime <= 0) {
            clearInterval(interval);
            setCooldown(false);
            return 0;
          }
          return newTime;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [cooldown]);
  
  // Handle attack button click
  const handleAttackClick = () => {
    if (canAttack) {
      setShowAttackMenu(true);
    }
  };
  
  // Handle attack selection
  const handleAttack = (attackType: AttackType) => {
    sendAttack(attackType); // Send to random player
    setShowAttackMenu(false);
    setCooldown(true);
    setCooldownTime(ATTACK_COOLDOWN);
  };
  
  if (!isMultiplayer) {
    return null;
  }
  
  return (
    <div className="absolute bottom-24 right-4 z-20">
      {showAttackMenu ? (
        <div className="bg-game-dark bg-opacity-80 p-2 rounded-lg">
          <h4 className="text-game-yellow text-xs mb-2">Send Attack:</h4>
          <div className="grid grid-cols-2 gap-1">
            <button 
              onClick={() => handleAttack(AttackType.SPIKE_PLATFORM)}
              className="bg-red-800 text-white p-1 rounded text-xs"
            >
              Spike
            </button>
            <button 
              onClick={() => handleAttack(AttackType.SPEED_UP)}
              className="bg-blue-800 text-white p-1 rounded text-xs"
            >
              Speed Up
            </button>
            <button 
              onClick={() => handleAttack(AttackType.NARROW_PLATFORM)}
              className="bg-green-800 text-white p-1 rounded text-xs"
            >
              Narrow
            </button>
            <button 
              onClick={() => handleAttack(AttackType.REVERSE_CONTROLS)}
              className="bg-purple-800 text-white p-1 rounded text-xs"
            >
              Reverse
            </button>
          </div>
          <button 
            onClick={() => setShowAttackMenu(false)}
            className="bg-gray-800 text-white p-1 rounded text-xs w-full mt-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={handleAttackClick}
          disabled={!canAttack}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            canAttack 
              ? 'bg-red-600 animate-pulse' 
              : 'bg-gray-600 opacity-50'
          }`}
        >
          {cooldown ? (
            <div className="text-white text-xs font-pixel">
              {Math.ceil(cooldownTime / 1000)}s
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default AttackButton; 