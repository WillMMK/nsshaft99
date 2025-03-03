import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, AttackType } from '../types';
import { DEFAULT_GAME_ID } from '../constants';

// Maximum players per game room
const MAX_PLAYERS_PER_GAME = 8;

// Store game rooms and their players
const gameRooms: Record<string, GameRoom> = {
  [DEFAULT_GAME_ID]: {
    id: DEFAULT_GAME_ID,
    players: {},
    isActive: false,
    startTime: null
  }
};

// Map socket IDs to game room IDs
const socketToRoom: Record<string, string> = {};

export const setupGameHandlers = (io: Server, socket: Socket) => {
  // Join a game room
  socket.on('join_game', ({ name, gameId = DEFAULT_GAME_ID }, callback) => {
    try {
      // Create a new player
      const player: Player = {
        id: socket.id,
        name,
        score: 0,
        isAlive: true
      };

      // Create the game room if it doesn't exist
      if (!gameRooms[gameId]) {
        gameRooms[gameId] = {
          id: gameId,
          players: {},
          isActive: false,
          startTime: null
        };
      }

      // Check if the room is full
      const roomPlayerCount = Object.keys(gameRooms[gameId].players).length;
      if (roomPlayerCount >= MAX_PLAYERS_PER_GAME) {
        // Create a new room with the same base ID if the default room is full
        if (gameId === DEFAULT_GAME_ID) {
          const newGameId = `${DEFAULT_GAME_ID}-${uuidv4().substring(0, 8)}`;
          gameRooms[newGameId] = {
            id: newGameId,
            players: { [socket.id]: player },
            isActive: false,
            startTime: null
          };
          
          // Join the socket to the new room
          socket.join(newGameId);
          socketToRoom[socket.id] = newGameId;
          
          // Notify the client about the new room
          callback({ success: true, gameId: newGameId, players: gameRooms[newGameId].players });
          
          // Broadcast to the new room
          io.to(newGameId).emit('player_joined', { 
            player, 
            players: gameRooms[newGameId].players 
          });
          
          return;
        } else {
          // If a custom room is full, reject the join
          callback({ success: false, error: 'Game room is full' });
          return;
        }
      }

      // Add the player to the game room
      gameRooms[gameId].players[socket.id] = player;
      socketToRoom[socket.id] = gameId;

      // Join the socket to the room
      socket.join(gameId);

      // Notify all clients in the room about the new player
      io.to(gameId).emit('player_joined', { 
        player, 
        players: gameRooms[gameId].players 
      });

      // Check if we should start the game (2 or more players)
      const updatedPlayerCount = Object.keys(gameRooms[gameId].players).length;
      if (updatedPlayerCount >= 2 && !gameRooms[gameId].isActive) {
        // Start the game after a short delay
        setTimeout(() => {
          if (gameRooms[gameId] && Object.keys(gameRooms[gameId].players).length >= 2) {
            gameRooms[gameId].isActive = true;
            gameRooms[gameId].startTime = Date.now();
            io.to(gameId).emit('game_started', { 
              gameId, 
              players: gameRooms[gameId].players,
              startTime: gameRooms[gameId].startTime
            });
          }
        }, 3000); // 3 second delay to allow more players to join
      }

      // Send success response with game info
      callback({ 
        success: true, 
        gameId, 
        players: gameRooms[gameId].players 
      });
    } catch (error) {
      console.error('Error joining game:', error);
      callback({ success: false, error: 'Failed to join game' });
    }
  });

  // Update player score
  socket.on('update_score', ({ score }) => {
    const gameId = socketToRoom[socket.id];
    if (!gameId || !gameRooms[gameId] || !gameRooms[gameId].players[socket.id]) return;

    // Update the player's score
    gameRooms[gameId].players[socket.id].score = score;

    // Broadcast the updated score to all players in the room
    io.to(gameId).emit('score_updated', {
      playerId: socket.id,
      score,
      players: gameRooms[gameId].players
    });
  });

  // Player sends an attack
  socket.on('send_attack', ({ targetId, attackType }: { targetId: string, attackType: AttackType }) => {
    const gameId = socketToRoom[socket.id];
    if (!gameId || !gameRooms[gameId]) return;

    const attacker = gameRooms[gameId].players[socket.id];
    const target = gameRooms[gameId].players[targetId];

    if (!attacker || !target) return;

    // Send the attack to the target
    io.to(targetId).emit('receive_attack', {
      attackerId: socket.id,
      attackerName: attacker.name,
      attackType
    });
  });

  // Player died
  socket.on('player_died', () => {
    const gameId = socketToRoom[socket.id];
    if (!gameId || !gameRooms[gameId] || !gameRooms[gameId].players[socket.id]) return;

    // Mark the player as dead
    gameRooms[gameId].players[socket.id].isAlive = false;

    // Check if the game is over (only one player left alive)
    const alivePlayers = Object.values(gameRooms[gameId].players).filter(p => p.isAlive);
    
    if (alivePlayers.length === 1) {
      // Game over, declare the winner
      const winner = alivePlayers[0];
      io.to(gameId).emit('game_over', { 
        winnerId: winner.id,
        winnerName: winner.name,
        players: gameRooms[gameId].players
      });
      
      // Reset the game room after a delay
      setTimeout(() => {
        if (gameRooms[gameId]) {
          // Reset player states but keep them in the room
          Object.keys(gameRooms[gameId].players).forEach(playerId => {
            gameRooms[gameId].players[playerId].score = 0;
            gameRooms[gameId].players[playerId].isAlive = true;
          });
          
          gameRooms[gameId].isActive = false;
          gameRooms[gameId].startTime = null;
          
          // Notify players that they can start a new game
          io.to(gameId).emit('game_reset', { 
            gameId, 
            players: gameRooms[gameId].players 
          });
        }
      }, 5000); // 5 second delay before resetting
    } else {
      // Notify all players about the death
      io.to(gameId).emit('player_died', {
        playerId: socket.id,
        playerName: gameRooms[gameId].players[socket.id].name,
        remainingPlayers: alivePlayers.length,
        players: gameRooms[gameId].players
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const gameId = socketToRoom[socket.id];
    if (!gameId || !gameRooms[gameId]) return;

    // Remove the player from the game room
    if (gameRooms[gameId].players[socket.id]) {
      const playerName = gameRooms[gameId].players[socket.id].name;
      delete gameRooms[gameId].players[socket.id];

      // Notify remaining players
      io.to(gameId).emit('player_left', {
        playerId: socket.id,
        playerName,
        players: gameRooms[gameId].players
      });

      // Check if the room is empty and not the default room
      if (Object.keys(gameRooms[gameId].players).length === 0 && gameId !== DEFAULT_GAME_ID) {
        delete gameRooms[gameId];
      } else if (gameRooms[gameId].isActive) {
        // Check if the game is over (only one player left alive)
        const alivePlayers = Object.values(gameRooms[gameId].players).filter(p => p.isAlive);
        
        if (alivePlayers.length === 1) {
          // Game over, declare the winner
          const winner = alivePlayers[0];
          io.to(gameId).emit('game_over', { 
            winnerId: winner.id,
            winnerName: winner.name,
            players: gameRooms[gameId].players
          });
          
          // Reset the game room
          gameRooms[gameId].isActive = false;
          gameRooms[gameId].startTime = null;
        }
      }
    }

    // Remove the socket-to-room mapping
    delete socketToRoom[socket.id];
  });
}; 