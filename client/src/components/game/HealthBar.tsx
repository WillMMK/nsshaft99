import React from 'react';
import { INITIAL_HEALTH } from '@/lib/game/constants';

interface HealthBarProps {
  health: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ health }) => {
  // Calculate percentage of health remaining
  const healthPercentage = Math.max(0, Math.min(100, (health / INITIAL_HEALTH) * 100));
  
  return (
    <div className="flex items-center">
      <span className="font-mono text-health-green mr-2">HP</span>
      <div className="w-28 h-4 bg-game-dark border border-health-green rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-danger-red via-game-yellow to-health-green" 
          style={{ width: `${healthPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default HealthBar;
