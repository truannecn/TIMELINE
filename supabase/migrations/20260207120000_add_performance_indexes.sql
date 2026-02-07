-- Add performance indexes for frequently queried columns
-- This migration adds database indexes to speed up common queries

-- Works table indexes
CREATE INDEX IF NOT EXISTS idx_works_author_id ON works(author_id);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_work_type ON works(work_type);

-- Follows table indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Note: Thread-related indexes are in their respective migration files
-- work_threads indexes in 20260207090000_add_threads.sql
-- user_threads indexes in 20260207130000_add_user_threads_and_thread_creator.sql

-- Bookmarks table indexes (composite index for user + work lookups)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_work ON bookmarks(user_id, work_id);

-- Likes table indexes (composite index for user + work lookups)
CREATE INDEX IF NOT EXISTS idx_likes_user_work ON likes(user_id, work_id);
CREATE INDEX IF NOT EXISTS idx_likes_work_id ON likes(work_id);

-- Work comments table indexes
CREATE INDEX IF NOT EXISTS idx_work_comments_work_id ON work_comments(work_id);
CREATE INDEX IF NOT EXISTS idx_work_comments_author_id ON work_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_work_comments_created_at ON work_comments(created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- These indexes will significantly improve query performance for:
-- - Fetching works by author
-- - Sorting works by date
-- - Finding who follows whom
-- - Checking bookmark/like status
-- - Loading comments for a work
