// client/src/app/core/mock-data/community.data.ts

export interface DiscussionThread {
  id: string;
  slug?: string;
  title: string;
  category: 'general' | 'help' | 'ideas' | 'showcase';
  author: string;
  authorAvatar: string;
  repliesCount: number;
  votesCount: number;
  createdAt: string;
  summary: string;
}

export interface ShowcaseProject {
  id: string;
  title: string;
  description: string;
  author: string;
  toolsUsed: string[];
  likesCount: number;
  imageUrl: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'backlog';
  votesCount: number;
  requestedBy: string;
}

export const MOCK_DISCUSSIONS: DiscussionThread[] = [
  {
    id: 'd-1',
    title: 'How do you verify RSA signatures offline in the JWT Inspector?',
    category: 'help',
    author: 'Sarah Jenkins',
    authorAvatar: 'SJ',
    repliesCount: 14,
    votesCount: 42,
    createdAt: '2 hours ago',
    summary: 'I want to run a local script verifying tokens without any call to a JWKS endpoint. Is it supported natively in the inspector panel?'
  },
  {
    id: 'd-2',
    title: 'Showcase: Built a complete base64 image parsing workflow using Acklet!',
    category: 'showcase',
    author: 'Alex Rivera',
    authorAvatar: 'AR',
    repliesCount: 8,
    votesCount: 89,
    createdAt: '1 day ago',
    summary: 'Here is a sequence displaying how to convert image buffers locally using URL templates. Hope this helps some dev workflows out there!'
  },
  {
    id: 'd-3',
    title: 'Feature Idea: Pinned configuration templates in the JSON formatter',
    category: 'ideas',
    author: 'David Chen',
    authorAvatar: 'DC',
    repliesCount: 5,
    votesCount: 27,
    createdAt: '3 days ago',
    summary: 'It would be great to save indent settings and custom regex replacements directly in the workspace so we don\'t re-enter them.'
  }
];

export const MOCK_SHOWCASE: ShowcaseProject[] = [
  {
    id: 's-1',
    title: 'JWT Auto-Signature validator',
    description: 'A browser extension workflow that parses headers and highlights signatures using local window caches.',
    author: 'Elena Rostova',
    toolsUsed: ['JWT Inspector', 'Base64 Decoder'],
    likesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 's-2',
    title: 'SQL Schema to JSON Parser',
    description: 'A local converter utilizing schema parsing mechanics built entirely within dynamic workspace tools.',
    author: 'Marcus Vance',
    toolsUsed: ['SQL Formatter', 'JSON Formatter'],
    likesCount: 98,
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=500&auto=format&fit=crop&q=60'
  }
];

export const MOCK_FEATURES: FeatureRequest[] = [
  {
    id: 'f-1',
    title: 'Interactive Diff Viewer tool',
    description: 'A side-by-side comparison screen highlighting changes in JSON, text, or XML.',
    status: 'in-progress',
    votesCount: 231,
    requestedBy: 'Diana Prince'
  },
  {
    id: 'f-2',
    title: 'Regex Sandbox & Tester',
    description: 'A local sandbox testing expressions against sample strings with matched capture groups detail.',
    status: 'planning',
    votesCount: 154,
    requestedBy: 'Bruce Wayne'
  },
  {
    id: 'f-3',
    title: 'Epoch Timestamp Converter',
    description: 'Convert timestamps to human readable dates and vice versa with local timezone support.',
    status: 'completed',
    votesCount: 120,
    requestedBy: 'Barry Allen'
  }
];
