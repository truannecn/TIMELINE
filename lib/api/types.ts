/**
 * Shared API types for the application.
 * Used by components and API routes.
 */

// Common types
export interface Pagination {
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// User types
export interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

// Thread types
export interface Thread {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null; // null = default interest
  created_at: string;
  updated_at: string;
}

export interface ThreadWithFollowStatus extends Thread {
  is_following: boolean;
  followers_count: number;
  works_count: number;
}

// Work types
export type WorkType = "image" | "essay" | "text_post";

export interface Work {
  id: string;
  author_id: string;
  author: User;
  title: string;
  work_type: WorkType;
  description: string | null;
  image_url: string | null;
  content: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  primary_thread?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

// AI Detection types
export interface DetectionResult {
  passed: boolean;
  confidence: number;
  provider: string;
}
