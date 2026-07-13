// src/app/core/models/user.model.ts

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  initials: string;
  role: 'user' | 'admin' | 'developer';
  joinDate: string;
  recentToolIds: string[];
  favoriteToolIds: string[];
  savedHistory: HistoryItem[];
  theme: 'dark' | 'light';
  plan: 'free' | 'pro' | 'enterprise';
  stats: UserStats;
}

export interface HistoryItem {
  toolId: string;
  toolName: string;
  usedAt: string;
}

export interface UserStats {
  toolsUsed: number;
  favoriteCount: number;
  savedItems: number;
}
