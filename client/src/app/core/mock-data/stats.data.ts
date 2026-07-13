// src/app/core/mock-data/stats.data.ts

import { PlatformStat } from '../models/review.model';

export const PLATFORM_STATS: PlatformStat[] = [
  {
    id: 'stat-1',
    label: 'Tools Available',
    value: 200,
    displayValue: '200+',
    suffix: '+',
    icon: 'wrench',
    description: 'Premium tools across 10 categories',
    color: '#6366f1',
  },
  {
    id: 'stat-2',
    label: 'Monthly Users',
    value: 2400000,
    displayValue: '2.4M',
    suffix: '',
    icon: 'users',
    description: 'Active users every month',
    color: '#06b6d4',
  },
  {
    id: 'stat-3',
    label: 'Tool Executions',
    value: 18000000,
    displayValue: '18M',
    suffix: '+',
    icon: 'zap',
    description: 'Successful tool runs to date',
    color: '#f59e0b',
  },
  {
    id: 'stat-4',
    label: 'Developer Rating',
    value: 4.9,
    displayValue: '4.9',
    suffix: '/5',
    icon: 'star',
    description: 'Average rating across all tools',
    color: '#22c55e',
  },
];

// src/app/core/mock-data/user.data.ts
export const MOCK_USER = {
  id: 'u-current',
  name: 'Ayaz Khan',
  email: 'ayaz@acklet.io',
  avatar: '',
  initials: 'AK',
  role: 'admin' as const,
  joinDate: '2025-10-01',
  recentToolIds: ['tool-1', 'tool-4', 'tool-2', 'tool-5', 'tool-19'],
  favoriteToolIds: ['tool-1', 'tool-4', 'tool-5', 'tool-19'],
  savedHistory: [
    { toolId: 'tool-1', toolName: 'JWT Inspector', usedAt: '2026-07-07T18:30:00Z' },
    { toolId: 'tool-4', toolName: 'Resume Analyzer', usedAt: '2026-07-07T15:10:00Z' },
    { toolId: 'tool-2', toolName: 'JSON Formatter', usedAt: '2026-07-06T09:00:00Z' },
    { toolId: 'tool-5', toolName: 'Prompt Optimizer', usedAt: '2026-07-05T14:20:00Z' },
    { toolId: 'tool-19', toolName: 'Color Palette Generator', usedAt: '2026-07-04T11:45:00Z' },
    { toolId: 'tool-8', toolName: 'Regex Tester', usedAt: '2026-07-03T16:30:00Z' },
  ],
  theme: 'dark' as const,
  plan: 'pro' as const,
  stats: { toolsUsed: 47, favoriteCount: 4, savedItems: 6 },
};
