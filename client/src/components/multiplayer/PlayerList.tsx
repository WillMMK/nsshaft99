import React, { useState } from 'react';
import { AttackType } from '@/types';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { PLAYER_COLORS } from '@/lib/game/constants';

const PlayerList: React.FC = () => {
  const { players, playerId: localPlayerId, playerColors, sendAttack } = useMultiplayer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showAttackMenu, setShowAttackMenu] = useState<boolean>(false);
  
  // Filter out the local player
  const otherPlayers = Object.values(players).filter(player => player.id !== localPlayerId);
  
  if (otherPlayers.length === 0) {
    return (
      <div className="absolute top-2 right-2 bg-game-dark bg-opacity-80 p-3 rounded text-xs z-10">
        <h4 className="text-game-yellow mb-1 font-bold">Players:</h4>
        <p className="text-game-light">Waiting for other players...</p>
      </div>
    );
  }
  
  // Sort players by score (highest first)
  const sortedPlayers = [...otherPlayers].sort((a, b) => b.score - a.score);
  
  // Handle player selection for attack
  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setShowAttackMenu(true);
  };
  
  // Handle attack selection
  const handleAttack = (attackType: AttackType) => {
    if (selectedPlayerId) {
      sendAttack(attackType, selectedPlayerId);
      setShowAttackMenu(false);
      setSelectedPlayerId(null);
    }
  };
  
  // Get player color - fallback to index-based color if not in playerColors
  const getPlayerColor = (playerId: string, index: number): string => {
    if (playerColors && playerColors[playerId]) {
      return playerColors[playerId];
    }
    return PLAYER_COLORS[index % PLAYER_COLORS.length];
  };
  
  return (
    <div className="absolute top-2 right-2 bg-game-dark bg-opacity-80 p-3 rounded text-xs z-10 border border-game-blue">
      <h4 className="text-game-yellow mb-2 font-bold">Players:</h4>
      <ul className="mb-2">
        {sortedPlayers.map((player, index) => (
          <li 
            key={player.id} 
            className="flex items-center justify-between mb-2 cursor-pointer hover:bg-game-dark hover:bg-opacity-50 p-1 rounded"
            onClick={() => handlePlayerSelect(player.id)}
          >
            <div className="flex items-center">
              <span 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: getPlayerColor(player.id, index) }}
              ></span>
              <span style={{ color: getPlayerColor(player.id, index) }}>
                {player.name}
              </span>
            </div>
            <span className="text-game-light ml-2 font-bold">
              {player.score}
            </span>
          </li>
        ))}
      </ul>
      
      {showAttackMenu && (
        <div className="mt-2 border-t border-game-light pt-2">
          <h5 className="text-game-yellow mb-1 font-bold">Send Attack:</h5>
          <div className="grid grid-cols-2 gap-1">
            <button 
              onClick={() => handleAttack(AttackType.SPIKE_PLATFORM)}
              className="bg-red-700 hover:bg-red-600 text-white p-1 rounded text-[10px] font-bold"
            >
              Spike Platform
            </button>
            <button 
              onClick={() => handleAttack(AttackType.SPEED_UP)}
              className="bg-blue-700 hover:bg-blue-600 text-white p-1 rounded text-[10px] font-bold"
            >
              Speed Up
            </button>
            <button 
              onClick={() => handleAttack(AttackType.NARROW_PLATFORM)}
              className="bg-green-700 hover:bg-green-600 text-white p-1 rounded text-[10px] font-bold"
            >
              Narrow Platform
            </button>
            <button 
              onClick={() => handleAttack(AttackType.REVERSE_CONTROLS)}
              className="bg-purple-700 hover:bg-purple-600 text-white p-1 rounded text-[10px] font-bold"
            >
              Reverse Controls
            </button>
          </div>
          <button 
            onClick={() => setShowAttackMenu(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded text-[10px] font-bold w-full mt-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerList; 