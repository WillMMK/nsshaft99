import React, { useEffect } from 'react';
import { INITIAL_HEALTH } from '@/lib/game/constants';

interface HealthBarProps {
  health: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ health }) => {
  // Calculate percentage of health remaining with safety checks
  const healthPercentage = Math.max(0, Math.min(100, (health / INITIAL_HEALTH) * 100));
  
  // Log health value for debugging
  useEffect(() => {
    console.log("Health Bar Value:", health, "Percentage:", healthPercentage);
  }, [health, healthPercentage]);
  
  // Determine color based on health percentage
  const getHealthColor = () => {
    if (healthPercentage > 66) return 'bg-health-green';
    if (healthPercentage > 33) return 'bg-game-yellow';
    return 'bg-danger-red';
  };
  
  return (
    <div className="flex items-center">
      <span className="font-mono text-health-green mr-2 text-sm font-bold">HP</span>
      <div className="relative w-28 h-5 bg-game-dark border-2 border-health-green rounded-full overflow-hidden">
        <div 
          className={`h-full ${getHealthColor()} transition-all duration-300`}
          style={{ width: `${healthPercentage}%` }}
        ></div>
        {/* Show numerical value for clarity */}
        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
          {Math.round(health)}
        </span>
      </div>
    </div>
  );
};

export default HealthBar;
