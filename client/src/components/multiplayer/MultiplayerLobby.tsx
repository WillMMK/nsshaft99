import React, { useState, useEffect, useRef } from 'react';
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
    isGameActive,
    playerId,
    requestPlayerList
  } = useMultiplayer();
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [waitingForPlayers, setWaitingForPlayers] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Maximum players for a game
  const MAX_PLAYERS_PER_GAME = 8;
  const MIN_PLAYERS_TO_START = 2;
  
  // Helper function to determine if a player is an AI
  const isAiPlayer = (player: any): boolean => {
    if (!player) return false;
    return player.isAI === true || (typeof player.id === 'string' && player.id.startsWith('ai-'));
  };
  
  // More reliable filtering of AI vs human players
  const getPlayerLists = () => {
    const allPlayers = Object.values(players);
    const aiPlayersList: any[] = [];
    const humanPlayersList: any[] = [];
    
    // Categorize each player
    allPlayers.forEach(player => {
      if (isAiPlayer(player)) {
        aiPlayersList.push(player);
      } else {
        humanPlayersList.push(player);
      }
    });
    
    return { 
      aiPlayersList, 
      humanPlayersList,
      aiCount: aiPlayersList.length,
      humanCount: humanPlayersList.length,
      totalCount: allPlayers.length
    };
  };
  
  // Get player lists
  const { aiPlayersList, humanPlayersList, aiCount, humanCount, totalCount } = getPlayerLists();
  
  // Manual polling for player list updates when we're waiting for players
  useEffect(() => {
    if (waitingForPlayers && !isGameActive) {
      console.log('Lobby: Manually requesting initial player list');
      requestPlayerList();
      
      // Set up interval for additional updates
      const interval = setInterval(() => {
        if (waitingForPlayers && !isGameActive) {
          console.log('Lobby: Manual polling for player list update');
          requestPlayerList();
        }
      }, 5000); // Every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [waitingForPlayers, isGameActive, requestPlayerList]);
  
  // Log players whenever they change
  useEffect(() => {
    if (Object.keys(players).length > 0) {
      console.log('Lobby: Players updated:', players);
      console.log('Lobby: Human players:', humanCount);
      console.log('Lobby: AI players:', aiCount);
      console.log('Lobby: AI players:', aiPlayersList);
    }
  }, [players, humanCount, aiCount, aiPlayersList]);
  
  // Reset state when component mounts
  useEffect(() => {
    // Reset the state when the component is mounted
    setIsJoining(false);
    setWaitingForPlayers(false);
    setJoinError(null);
    
    // Set initial player name from user profile if available
    if (currentUser && userProfile?.displayName) {
      setPlayerName(userProfile.displayName);
    } else if (localStorage.getItem('playerName')) {
      setPlayerName(localStorage.getItem('playerName') || '');
    }
    
    // Clean up polling interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);
  
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
      
      // Request player list after joining
      setTimeout(() => {
        console.log('Requesting player list after joining');
        requestPlayerList();
      }, 500);
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
              
              {/* Display player counts with AI information */}
              {Object.keys(players).length > 0 && (
                <>
                  <p className="text-game-yellow mt-2">
                    {totalCount} / {MAX_PLAYERS_PER_GAME} players
                  </p>
                  <p className="text-game-light text-xs mt-1">
                    {humanCount} Human · {aiCount} AI
                  </p>
                </>
              )}
              
              <p className="text-game-light text-sm mt-1">
                Game will start when the countdown ends
              </p>
            </div>
            
            {Object.keys(players).length > 0 && (
              <div className="mt-4 text-left">
                <h3 className="font-mono text-game-light text-sm mb-2">Players in queue:</h3>
                
                <ul className="text-game-light max-h-40 overflow-y-auto">
                  {/* Human players first */}
                  {humanPlayersList.map((player) => (
                    <li key={player.id} className="text-sm">
                      {player.name} {player.id === playerId ? '(You)' : ''}
                    </li>
                  ))}
                  
                  {/* AI players with distinctive styling */}
                  {aiPlayersList.map((player) => (
                    <li key={player.id} className="text-sm">
                      <span className="text-game-green">{player.name}</span> <span className="text-game-blue text-xs">(AI)</span>
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