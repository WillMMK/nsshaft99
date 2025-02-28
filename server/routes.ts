import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
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
  return httpServer;
}
