import React from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { PLAYER_COLORS } from '@/lib/game/constants';

const PlayerList: React.FC = () => {
  const { players, playerId: localPlayerId, playerColors } = useMultiplayer();
  
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
  
  // Get player color - fallback to index-based color if not in playerColors
  const getPlayerColor = (playerId: string, index: number): string => {
    if (playerColors && playerColors[playerId]) {
      return playerColors[playerId];
    }
    return PLAYER_COLORS[index % PLAYER_COLORS.length];
  };

  return (
    <div className="bg-game-dark bg-opacity-80 p-3 rounded text-xs z-10">
      <h4 className="text-game-yellow mb-1 font-bold">Players:</h4>
      <div className="space-y-1">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id}
            className="flex items-center justify-between"
          >
            <span className="text-game-light">
              {player.name}
            </span>
            <span className="text-game-yellow ml-2">
              {player.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList; 