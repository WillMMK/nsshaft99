import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveScore(username: string, score: number): Promise<any>;
  getHighScores(): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scores: Map<string, number>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.scores = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveScore(username: string, score: number): Promise<any> {
    // Save or update the score for the given username
    const currentScore = this.scores.get(username) || 0;
    
    // Only update if the new score is higher
    if (score > currentScore) {
      this.scores.set(username, score);
    }
    
    return { username, score: Math.max(currentScore, score) };
  }

  async getHighScores(): Promise<any[]> {
    // Convert scores map to array and sort by score (descending)
    const scoresArray = Array.from(this.scores.entries()).map(([username, score]) => ({
      username,
      score
    }));
    
    // Sort by score (descending)
    return scoresArray.sort((a, b) => b.score - a.score);
  }
}

export const storage = new MemStorage();
