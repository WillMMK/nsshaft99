import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_GAME_ID } from '@/lib/game/constants';

interface MultiplayerLobbyProps {
  onJoin: () => void;
  onCancel: () => void;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onJoin, onCancel }) => {
  const { currentUser, userProfile } = useAuth();
  const { 
    joinGame, 
    players, 
    setIsMultiplayer, 
    isConnected, 
    countdownSeconds,
    isGameActive
  } = useMultiplayer();
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [waitingForPlayers, setWaitingForPlayers] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // Maximum players for a game
  const MAX_PLAYERS_PER_GAME = 8;
  const MIN_PLAYERS_TO_START = 2;
  
  // Set default player name from auth if available
  useEffect(() => {
    if (currentUser?.displayName) {
      setPlayerName(currentUser.displayName);
    } else if (userProfile?.username) {
      setPlayerName(userProfile.username);
    }
  }, [currentUser, userProfile]);
  
  // Start the game when it becomes active
  useEffect(() => {
    if (isGameActive) {
      onJoin();
    }
  }, [isGameActive, onJoin]);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setJoinError('Please enter a player name');
      return;
    }

    setIsMultiplayer(true);
    setIsJoining(true);
    setJoinError(null);
    
    try {
      // Join the global game queue
      await joinGame(playerName, DEFAULT_GAME_ID);
      setWaitingForPlayers(true);
      setIsJoining(false);
    } catch (error) {
      console.error('Error joining game:', error);
      setJoinError('Failed to join game. Please try again.');
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    setIsMultiplayer(false);
    onCancel();
  };
  
  // Format the countdown time
  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-game-dark bg-opacity-90 z-30">
      <div className="bg-game-dark border-2 border-game-blue p-6 rounded-lg w-full max-w-md">
        <h2 className="font-pixel text-game-yellow text-xl mb-6 text-center">Multiplayer Mode</h2>
        
        {!waitingForPlayers ? (
          <>
            <div className="mb-6">
              <label className="block font-mono text-game-light text-sm mb-2">
                Your Name:
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 bg-game-dark border border-game-light rounded text-game-light"
                placeholder="Enter your name"
                maxLength={15}
              />
              {joinError && (
                <p className="text-red-500 text-sm mt-1">{joinError}</p>
              )}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-game-dark border border-game-light text-game-light font-pixel rounded hover:bg-opacity-80 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={isJoining || !isConnected}
                className="px-4 py-2 bg-game-blue text-white font-pixel rounded hover:bg-opacity-80 transition-all disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            {countdownSeconds !== null && (
              <div className="mb-4">
                <h3 className="font-pixel text-game-yellow text-xl">
                  Game starts in: {formatCountdown(countdownSeconds)}
                </h3>
                <p className="text-game-light text-sm mt-1">
                  {countdownSeconds <= 0 
                    ? 'Starting game...' 
                    : 'Get ready to play!'}
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-game-blue border-t-transparent rounded-full mb-2"></div>
              <p className="text-game-light">Waiting for players...</p>
              <p className="text-game-yellow mt-2">
                {Object.keys(players).length} / {MAX_PLAYERS_PER_GAME} players
              </p>
              <p className="text-game-light text-sm mt-1">
                Game will start when the countdown ends
              </p>
            </div>
            
            {Object.keys(players).length > 0 && (
              <div className="mt-4 text-left">
                <h3 className="font-mono text-game-light text-sm mb-2">Players in queue:</h3>
                <ul className="text-game-light max-h-40 overflow-y-auto">
                  {Object.values(players).map((player) => (
                    <li key={player.id} className="text-sm">
                      {player.name} {player.isAI ? '(AI)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              onClick={handleCancel}
              className="mt-4 px-4 py-2 bg-game-dark border border-game-light text-game-light font-pixel rounded hover:bg-opacity-80 transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerLobby; 