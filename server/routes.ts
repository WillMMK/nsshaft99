import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";

// Player interface for multiplayer
interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  score: number;
  velocityY: number;
  velocityX: number;
  isJumping: boolean;
  facingDirection: number;
  isInvincible?: boolean;
  isSlowFall?: boolean;
  isAI?: boolean;
  isAlive: boolean;
}

// Attack types that players can send to others
enum AttackType {
  SPIKE_PLATFORM = 'spike_platform',
  SPEED_UP = 'speed_up',
  NARROW_PLATFORM = 'narrow_platform',
  REVERSE_CONTROLS = 'reverse_controls'
}

// Attack interface
interface Attack {
  type: AttackType;
  fromPlayerId: string;
  toPlayerId: string;
  duration?: number; // Duration in milliseconds for time-based effects
}

// Game state interface
interface GameState {
  id: string;
  players: Record<string, Player>;
  attacks: Attack[];
  isActive: boolean;
  startTime: number | null;
}

// Store active games
const activeGames: Record<string, GameState> = {};

// Store game countdowns
const gameCountdowns: Record<string, {
  timer: NodeJS.Timeout | null;
  secondsLeft: number;
}> = {};

// AI player names
const AI_PLAYER_NAMES = [
  'BotMaster', 'RoboJumper', 'AIFaller', 'CyberLeaper', 
  'QuantumBot', 'PixelDroid', 'NeuralNinja', 'SiliconSurfer'
];

// Generate a random AI player
function createAIPlayer(gameId: string): Player {
  const id = `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nameIndex = Math.floor(Math.random() * AI_PLAYER_NAMES.length);
  
  return {
    id,
    name: AI_PLAYER_NAMES[nameIndex],
    x: 136 + (Math.random() * 100 - 50), // Random position
    y: 200,
    health: 100,
    score: 0,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    facingDirection: Math.random() > 0.5 ? 1 : -1,
    isAI: true,
    isAlive: true
  };
}

// Add AI players to a game
function addAIPlayers(gameId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const aiPlayer = createAIPlayer(gameId);
    activeGames[gameId].players[aiPlayer.id] = aiPlayer;
  }
}

// Start a game countdown
function startGameCountdown(io: SocketIOServer, gameId: string) {
  console.log(`Starting countdown for game ${gameId}`);
  
  // Initialize countdown
  if (!gameCountdowns[gameId]) {
    gameCountdowns[gameId] = {
      secondsLeft: 60, // 60 seconds countdown
      timer: null
    };
  }
  
  // Clear any existing timer
  if (gameCountdowns[gameId].timer) {
    clearInterval(gameCountdowns[gameId].timer as NodeJS.Timeout);
  }
  
  // Start a new countdown
  gameCountdowns[gameId].timer = setInterval(() => {
    // Check if the game still exists
    if (!activeGames[gameId]) {
      console.log(`Game ${gameId} no longer exists, stopping countdown`);
      if (gameCountdowns[gameId] && gameCountdowns[gameId].timer) {
        clearInterval(gameCountdowns[gameId].timer as NodeJS.Timeout);
        delete gameCountdowns[gameId];
      }
      return;
    }
    
    // Decrement countdown
    gameCountdowns[gameId].secondsLeft--;
    
    // Emit countdown update to all players in the game
    io.to(gameId).emit('countdown_update', {
      secondsLeft: gameCountdowns[gameId].secondsLeft,
      message: 'Waiting for more players...'
    });
    
    // Check if countdown has reached zero
    if (gameCountdowns[gameId].secondsLeft <= 0) {
      clearInterval(gameCountdowns[gameId].timer as NodeJS.Timeout);
      gameCountdowns[gameId].timer = null;
      
      // Check for at least 2 human players
      const humanPlayerCount = Object.values(activeGames[gameId].players).filter(p => !p.isAI).length;
      
      if (humanPlayerCount >= 2) {
        // Start the game
        startGame(io, gameId);
      } else {
        // Not enough human players, restart countdown
        console.log(`Not enough human players (${humanPlayerCount}) in game ${gameId}, restarting countdown`);
        gameCountdowns[gameId].secondsLeft = 60;
        startGameCountdown(io, gameId);
      }
    }
    
    // Check for AI players at 30 seconds
    if (gameCountdowns[gameId].secondsLeft === 30) {
      const humanPlayerCount = Object.values(activeGames[gameId].players).filter(p => !p.isAI).length;
      if (humanPlayerCount < 2) {
        console.log(`Waiting for more human players in game ${gameId}`);
        // Notify players that we're waiting for more human players
        io.to(gameId).emit('countdown_update', {
          secondsLeft: gameCountdowns[gameId].secondsLeft,
          message: 'Waiting for more players to join...'
        });
      }
    }
  }, 1000);
}

// Start a game
function startGame(io: SocketIOServer, gameId: string) {
  if (!activeGames[gameId]) {
    console.log(`Cannot start game ${gameId} - game does not exist`);
    return;
  }
  
  // Check if we have at least 2 players (including AI)
  const playerCount = Object.keys(activeGames[gameId].players).length;
  if (playerCount < 2) {
    console.log(`Cannot start game ${gameId} - not enough players (${playerCount})`);
    
    // Add AI players if needed
    if (playerCount === 1) {
      console.log(`Adding AI player to game ${gameId}`);
      addAIPlayers(gameId, 1);
      
      // Notify players about the new AI player
      const aiPlayer = Object.values(activeGames[gameId].players).find(p => p.isAI);
      if (aiPlayer) {
        io.to(gameId).emit('player_joined', {
          player: aiPlayer,
          players: activeGames[gameId].players
        });
      }
    } else {
      // Restart countdown
      console.log(`Restarting countdown for game ${gameId}`);
      if (gameCountdowns[gameId]) {
        gameCountdowns[gameId].secondsLeft = 60;
      } else {
        startGameCountdown(io, gameId);
      }
      return;
    }
  }
  
  console.log(`Starting game ${gameId} with ${Object.keys(activeGames[gameId].players).length} players`);
  
  // Set game as active
  activeGames[gameId].isActive = true;
  activeGames[gameId].startTime = Date.now();
  
  // Notify all players that the game has started
  io.to(gameId).emit('game_started', {
    gameId,
    players: activeGames[gameId].players,
    startTime: activeGames[gameId].startTime
  });
  
  // Start AI player simulation if there are any AI players
  const hasAIPlayers = Object.values(activeGames[gameId].players).some(player => player.isAI);
  if (hasAIPlayers) {
    startAIPlayerSimulation(io, gameId);
  }
}

// Simulate AI player actions
function startAIPlayerSimulation(io: SocketIOServer, gameId: string) {
  // Create a timer to update AI players
  const aiUpdateInterval = setInterval(() => {
    if (!activeGames[gameId] || !activeGames[gameId].isActive) {
      clearInterval(aiUpdateInterval);
      return;
    }
    
    // Update each AI player
    Object.values(activeGames[gameId].players)
      .filter(p => p.isAI)
      .forEach(aiPlayer => {
        // Random score increase
        aiPlayer.score += Math.floor(Math.random() * 10);
        
        // Random movement
        aiPlayer.x += (Math.random() * 10 - 5);
        aiPlayer.facingDirection = Math.random() > 0.5 ? 1 : -1;
        
        // Occasionally send attacks to random players
        if (Math.random() < 0.05) {
          const realPlayers = Object.values(activeGames[gameId].players)
            .filter(p => !p.isAI);
            
          if (realPlayers.length > 0) {
            const targetIndex = Math.floor(Math.random() * realPlayers.length);
            const targetPlayer = realPlayers[targetIndex];
            
            // Create a random attack
            const attackTypes = Object.values(AttackType);
            const randomAttackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
            
            // Send the attack
            io.to(targetPlayer.id).emit('receive_attack', {
              attackerId: aiPlayer.id,
              attackerName: aiPlayer.name,
              attackType: randomAttackType
            });
          }
        }
      });
      
    // Emit updated game state
    io.to(gameId).emit('score_updated', {
      players: activeGames[gameId].players
    });
  }, 1000);
}

// Helper function to find a game by player ID
function findGameByPlayerId(playerId: string): GameState | null {
  for (const [gameId, game] of Object.entries(activeGames)) {
    if (game.players[playerId]) {
      return game;
    }
  }
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS with proper configuration for Replit
  app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      socketio: 'enabled'
    });
  });
  
  // API route for saving high scores
  app.post('/api/scores', async (req, res) => {
    try {
      const { username, score } = req.body;
      
      if (!username || typeof score !== 'number') {
        return res.status(400).json({ message: 'Invalid score data' });
      }
      
      const result = await storage.saveScore(username, score);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to save score' });
    }
  });
  
  // API route for getting high scores
  app.get('/api/scores', async (req, res) => {
    try {
      const scores = await storage.getHighScores();
      res.json(scores);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve scores' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize Socket.IO with proper CORS for Replit
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
    connectTimeout: 30000,
    allowEIO3: true
  });
  
  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Send a welcome message to confirm connection
    socket.emit("welcome", { 
      message: "Connected to game server",
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // Handle ping for testing
    socket.on("ping", (data, callback) => {
      console.log(`Received ping from ${socket.id}:`, data);
      callback({
        pong: true,
        serverTime: new Date().toISOString(),
        receivedData: data
      });
    });
    
    // Handle player joining a game
    socket.on("join_game", (data, callback) => {
      try {
        console.log(`Player ${socket.id} attempting to join game:`, data);
        const { name, gameId = 'default-game' } = data;
        
        // Validate input data
        if (!name || typeof name !== 'string') {
          console.error('Invalid player name:', name);
          return callback({ 
            success: false, 
            error: 'Invalid player name' 
          });
        }
        
        // Create a new player
        const player = {
          id: socket.id,
          name,
          score: 0,
          isAlive: true,
          x: 136,
          y: 200,
          health: 100,
          velocityY: 0,
          velocityX: 0,
          isJumping: false,
          facingDirection: 1
        };
        
        // Create game if it doesn't exist
        if (!activeGames[gameId]) {
          console.log(`Creating new game room: ${gameId}`);
          activeGames[gameId] = {
            id: gameId,
            players: {},
            attacks: [],
            isActive: false,
            startTime: null
          };
          
          // Start the countdown for this game
          startGameCountdown(io, gameId);
        }
        
        // Add player to game
        activeGames[gameId].players[socket.id] = player;
        
        // Join the game room
        socket.join(gameId);
        
        // Send success response
        console.log(`Player ${name} (${socket.id}) joined game ${gameId}`);
        callback({ 
          success: true, 
          gameId, 
          players: activeGames[gameId].players,
          countdownSeconds: gameCountdowns[gameId]?.secondsLeft || 60
        });
        
        // Notify all players in the game
        io.to(gameId).emit("player_joined", { 
          player, 
          players: activeGames[gameId].players 
        });
      } catch (error) {
        console.error('Error in join_game handler:', error);
        // Make sure we always send a response even if there's an error
        if (typeof callback === 'function') {
          callback({ 
            success: false, 
            error: 'Server error while joining game' 
          });
        }
      }
    });
    
    // Handle player actions
    socket.on("playerAction", (data: { gameId: string, action: string }) => {
      const { gameId, action } = data;
      
      if (!activeGames[gameId] || !activeGames[gameId].players[socket.id]) {
        return;
      }
      
      const player = activeGames[gameId].players[socket.id];
      
      // Update player based on action
      switch (action) {
        case "left":
          player.facingDirection = -1;
          break;
        case "right":
          player.facingDirection = 1;
          break;
      }
      
      // Broadcast updated game state
      io.to(gameId).emit("gameState", activeGames[gameId]);
    });
    
    // Handle player state update
    socket.on("updatePlayerState", (data: { gameId: string, playerState: Partial<Player> }) => {
      const { gameId, playerState } = data;
      
      if (!activeGames[gameId] || !activeGames[gameId].players[socket.id]) {
        return;
      }
      
      // Update player state
      activeGames[gameId].players[socket.id] = {
        ...activeGames[gameId].players[socket.id],
        ...playerState
      };
      
      // Broadcast updated game state
      io.to(gameId).emit("gameState", activeGames[gameId]);
    });
    
    // Handle sending attacks to other players
    socket.on("sendAttack", (data: { gameId?: string; attackType: AttackType; targetPlayerId?: string }) => {
      try {
        console.log(`Player ${socket.id} sending attack:`, data);
        
        // Find the game this player is in
        let gameId = data.gameId;
        if (!gameId) {
          // Find the game by looking through all active games
          for (const [id, game] of Object.entries(activeGames)) {
            if (game.players[socket.id]) {
              gameId = id;
              break;
            }
          }
        }
        
        if (!gameId || !activeGames[gameId] || !activeGames[gameId].players[socket.id]) {
          console.error(`Player ${socket.id} not found in any game or specified game`);
          return;
        }
        
        const game = activeGames[gameId];
        const attacker = game.players[socket.id];
        
        // If no target specified, pick a random player that's not the attacker
        let targetPlayerId = data.targetPlayerId;
        if (!targetPlayerId) {
          const otherPlayers = Object.keys(game.players).filter(id => id !== socket.id);
          if (otherPlayers.length > 0) {
            targetPlayerId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          } else {
            console.log('No other players to attack');
            return;
          }
        }
        
        // Make sure target exists
        if (!game.players[targetPlayerId]) {
          console.error(`Target player ${targetPlayerId} not found in game ${gameId}`);
          return;
        }
        
        const target = game.players[targetPlayerId];
        
        console.log(`Player ${attacker.name} (${socket.id}) attacking ${target.name} (${targetPlayerId}) with ${data.attackType}`);
        
        // Add the attack to the game state
        game.attacks.push({
          type: data.attackType,
          fromPlayerId: socket.id,
          toPlayerId: targetPlayerId,
          duration: 5000 // 5 seconds duration for effects
        });
        
        // Notify the target player
        io.to(targetPlayerId).emit("receive_attack", {
          attackerId: socket.id,
          attackerName: attacker.name,
          attackType: data.attackType
        });
        
        // Also notify all players for UI updates
        io.to(gameId).emit("attack_sent", {
          attackerId: socket.id,
          attackerName: attacker.name,
          targetId: targetPlayerId,
          targetName: target.name,
          attackType: data.attackType
        });
      } catch (error) {
        console.error('Error in sendAttack handler:', error);
      }
    });
    
    // Handle player clearing an attack (defense)
    socket.on("clearAttack", (data: { gameId: string, attackIndex: number }) => {
      const { gameId, attackIndex } = data;
      
      if (!activeGames[gameId] || attackIndex >= activeGames[gameId].attacks.length) {
        return;
      }
      
      // Remove the attack
      const attack = activeGames[gameId].attacks[attackIndex];
      if (attack.toPlayerId === socket.id) {
        activeGames[gameId].attacks.splice(attackIndex, 1);
        
        // Broadcast updated game state
        io.to(gameId).emit("gameState", activeGames[gameId]);
        
        console.log(`Player ${socket.id} cleared attack ${attackIndex}`);
      }
    });
    
    // Handle player disconnection
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      
      // Find which game the player was in
      let playerGame: string | null = null;
      let playerName: string | null = null;
      
      for (const [gameId, game] of Object.entries(activeGames)) {
        if (game.players[socket.id]) {
          playerGame = gameId;
          playerName = game.players[socket.id].name;
          break;
        }
      }
      
      if (playerGame) {
        // Remove player from the game
        delete activeGames[playerGame].players[socket.id];
        
        // Check if there are any non-AI players left
        const remainingPlayers = Object.values(activeGames[playerGame].players).filter(p => !p.isAI);
        
        if (remainingPlayers.length === 0) {
          console.log(`Game ${playerGame} removed as it's empty`);
          
          // Stop any timers for this game
          if (gameCountdowns[playerGame] && gameCountdowns[playerGame].timer) {
            clearInterval(gameCountdowns[playerGame].timer as NodeJS.Timeout);
            delete gameCountdowns[playerGame];
          }
          
          // Remove the game
          delete activeGames[playerGame];
        } else if (remainingPlayers.length === 1 && activeGames[playerGame].isActive) {
          // If only one player remains and the game is active, declare them the winner
          const winner = remainingPlayers[0];
          console.log(`Player ${winner.name} (${winner.id}) is the last player standing in game ${playerGame}`);
          
          // Emit game over event
          io.to(playerGame).emit("game_over", {
            winnerId: winner.id,
            winnerName: winner.name,
            players: activeGames[playerGame].players
          });
          
          // Reset the game state but keep the players
          activeGames[playerGame].isActive = false;
          activeGames[playerGame].startTime = null;
          activeGames[playerGame].attacks = [];
          
          // Restart the countdown for the next game
          startGameCountdown(io, playerGame);
        } else {
          // Notify remaining players
          io.to(playerGame).emit("player_left", {
            playerId: socket.id,
            playerName: playerName || "Unknown Player",
            players: activeGames[playerGame].players
          });
        }
      }
    });
    
    // Handle score updates
    socket.on("update_score", (data: { score: number }) => {
      try {
        console.log(`Player ${socket.id} updating score to ${data.score}`);
        
        // Find which game the player is in
        let playerGame: string | null = null;
        
        for (const [gameId, game] of Object.entries(activeGames)) {
          if (game.players[socket.id]) {
            playerGame = gameId;
            break;
          }
        }
        
        if (!playerGame) {
          console.error(`Player ${socket.id} not found in any game`);
          return;
        }
        
        // Update the player's score
        activeGames[playerGame].players[socket.id].score = data.score;
        
        // Broadcast the updated score to all players in the game
        io.to(playerGame).emit("score_updated", {
          playerId: socket.id,
          score: data.score,
          players: activeGames[playerGame].players
        });
      } catch (error) {
        console.error('Error in update_score handler:', error);
      }
    });

    // Handle player death
    socket.on("report_death", () => {
      try {
        console.log(`Player ${socket.id} reported death`);
        
        // Find the game the player is in
        const game = findGameByPlayerId(socket.id);
        if (!game) {
          console.log(`No game found for player ${socket.id}`);
          return;
        }
        
        // Mark the player as dead
        if (game.players[socket.id]) {
          game.players[socket.id].isAlive = false;
          console.log(`Marked player ${socket.id} as dead`);
        }
        
        // Check if only one player remains alive
        const alivePlayers = Object.values(game.players).filter(player => player.isAlive);
        
        if (alivePlayers.length === 1) {
          // Only one player remains, declare them the winner
          const winner = alivePlayers[0];
          console.log(`Game ${game.id} has a winner: ${winner.name} (${winner.id})`);
          
          // Emit game over event to all players in the game
          io.to(game.id).emit('game_over', {
            winnerId: winner.id,
            winnerName: winner.name,
            players: game.players
          });
          
          // Reset the game state but keep players for next round
          Object.values(game.players).forEach(player => {
            player.score = 0;
            player.health = 100;
            player.isAlive = true; // Reset alive status for next round
          });
          
          // Start countdown for next game
          startGameCountdown(io, game.id);
        }
      } catch (error) {
        console.error('Error handling player death:', error);
      }
    });
  });
  
  return httpServer;
}

