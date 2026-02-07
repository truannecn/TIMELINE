/**
 * Vitest setup file
 * This file runs before all tests
 */

// Add any global test setup here
// For example, mocking environment variables or global utilities

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
