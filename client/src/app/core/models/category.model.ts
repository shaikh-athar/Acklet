// src/app/core/models/category.model.ts

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  toolCount: number;
  isFeatured: boolean;
}
