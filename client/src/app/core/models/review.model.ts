// src/app/core/models/review.model.ts

export interface Review {
  id: string;
  toolId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userInitials: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  helpful: number;
  verified: boolean;
}

// src/app/core/models/stat.model.ts
export interface PlatformStat {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  suffix: string;
  icon: string;
  description: string;
  color: string;
}

// src/app/core/models/testimonial.model.ts
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  initials: string;
  quote: string;
  rating: number;
}
