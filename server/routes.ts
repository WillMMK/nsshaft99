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
  players: Record<string, Player>;
  attacks: Attack[];
}

// Store active games
const activeGames: Record<string, GameState> = {};

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS
  app.use(cors());
  
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
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Handle player joining a game
    socket.on("joinGame", (data: { gameId: string, playerName: string }) => {
      const { gameId, playerName } = data;
      
      // Create game if it doesn't exist
      if (!activeGames[gameId]) {
        activeGames[gameId] = {
          players: {},
          attacks: []
        };
      }
      
      // Add player to game
      activeGames[gameId].players[socket.id] = {
        id: socket.id,
        name: playerName,
        x: 136, // Center of the screen
        y: 200,
        health: 100,
        score: 0,
        velocityY: 0,
        velocityX: 0,
        isJumping: false,
        facingDirection: 1
      };
      
      // Join the game room
      socket.join(gameId);
      
      // Notify all players in the game
      io.to(gameId).emit("gameState", activeGames[gameId]);
      
      console.log(`Player ${playerName} joined game ${gameId}`);
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
    socket.on("sendAttack", (data: { gameId: string, attackType: AttackType, targetPlayerId?: string }) => {
      const { gameId, attackType, targetPlayerId } = data;
      
      if (!activeGames[gameId] || !activeGames[gameId].players[socket.id]) {
        return;
      }
      
      const players = Object.keys(activeGames[gameId].players);
      
      // If no specific target, choose a random player (excluding self)
      let target = targetPlayerId;
      if (!target || target === socket.id) {
        const otherPlayers = players.filter(id => id !== socket.id);
        if (otherPlayers.length > 0) {
          const randomIndex = Math.floor(Math.random() * otherPlayers.length);
          target = otherPlayers[randomIndex];
        } else {
          return; // No other players to attack
        }
      }
      
      // Create the attack
      const attack: Attack = {
        type: attackType,
        fromPlayerId: socket.id,
        toPlayerId: target,
        duration: 5000 // 5 seconds for time-based effects
      };
      
      // Add attack to the game state
      activeGames[gameId].attacks.push(attack);
      
      // Notify the target player about the attack
      io.to(target).emit("receiveAttack", attack);
      
      // Broadcast updated game state
      io.to(gameId).emit("gameState", activeGames[gameId]);
      
      console.log(`Player ${socket.id} sent ${attackType} attack to ${target}`);
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
    
    // Handle player disconnect
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      
      // Remove player from all games
      Object.keys(activeGames).forEach(gameId => {
        if (activeGames[gameId].players[socket.id]) {
          delete activeGames[gameId].players[socket.id];
          
          // Remove any attacks targeting or from this player
          activeGames[gameId].attacks = activeGames[gameId].attacks.filter(
            attack => attack.fromPlayerId !== socket.id && attack.toPlayerId !== socket.id
          );
          
          // Notify remaining players
          io.to(gameId).emit("gameState", activeGames[gameId]);
          
          // Remove game if empty
          if (Object.keys(activeGames[gameId].players).length === 0) {
            delete activeGames[gameId];
            console.log(`Game ${gameId} removed as it's empty`);
          }
        }
      });
    });
  });
  
  return httpServer;
}
