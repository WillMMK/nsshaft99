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
  const [attackTooltip, setAttackTooltip] = useState<string>("");
  
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
    } else if (!canAttack && score < ATTACK_THRESHOLD_SCORE) {
      setAttackTooltip(`Need ${ATTACK_THRESHOLD_SCORE} points to attack!`);
      setTimeout(() => setAttackTooltip(""), 2000);
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
        <div className="bg-game-dark bg-opacity-90 p-3 rounded-lg border-2 border-game-yellow shadow-lg">
          <h4 className="text-game-yellow text-sm mb-2 font-bold">Send Attack:</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleAttack(AttackType.SPIKE_PLATFORM)}
              className="bg-red-700 hover:bg-red-600 text-white p-2 rounded text-xs font-bold transition-colors"
              title="Add spikes to platforms"
            >
              Spike Platform
            </button>
            <button 
              onClick={() => handleAttack(AttackType.SPEED_UP)}
              className="bg-blue-700 hover:bg-blue-600 text-white p-2 rounded text-xs font-bold transition-colors"
              title="Increase game speed"
            >
              Speed Up
            </button>
            <button 
              onClick={() => handleAttack(AttackType.NARROW_PLATFORM)}
              className="bg-green-700 hover:bg-green-600 text-white p-2 rounded text-xs font-bold transition-colors"
              title="Make platforms narrower"
            >
              Narrow Platform
            </button>
            <button 
              onClick={() => handleAttack(AttackType.REVERSE_CONTROLS)}
              className="bg-purple-700 hover:bg-purple-600 text-white p-2 rounded text-xs font-bold transition-colors"
              title="Flip opponent's screen and controls"
            >
              Flip Controls
            </button>
            <button 
              onClick={() => handleAttack(AttackType.TRUE_REVERSE)}
              className="bg-indigo-700 hover:bg-indigo-600 text-white p-2 rounded text-xs font-bold transition-colors"
              title="Reverse controls without flipping the screen"
              style={{ gridColumn: "span 2" }}
            >
              Reverse Controls
            </button>
          </div>
          <button 
            onClick={() => setShowAttackMenu(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded text-xs font-bold w-full mt-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={handleAttackClick}
            disabled={!canAttack}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              canAttack 
                ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                : 'bg-gray-600 opacity-70'
            }`}
            title={canAttack ? "Send attack to opponent" : cooldown ? "Attack on cooldown" : `Need ${ATTACK_THRESHOLD_SCORE} points to attack`}
          >
            {cooldown ? (
              <div className="text-white text-sm font-bold">
                {Math.ceil(cooldownTime / 1000)}s
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </button>
          
          {attackTooltip && (
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs p-2 rounded whitespace-nowrap">
              {attackTooltip}
            </div>
          )}
          
          {canAttack && !showAttackMenu && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-yellow-300 text-xs font-bold animate-bounce">
              ATTACK!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttackButton; 