# CLAUDE.md — Artfolio

## Project Vision

Artfolio is an AI-free artist portfolio and social platform. All uploaded content must pass AI detection: **Sightengine** for images, **Dedalus AI** for text/essays.

**Core philosophy:** Empower human creators, not replace them.

---

## Tech Stack

| Layer        | Choice                         |
| ------------ | ------------------------------ |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind |
| Auth         | Supabase OAuth (Google)        |
| Database     | Supabase (PostgreSQL)          |
| Storage      | AWS Amplify Storage (S3 only)  |
| AI Detection | Sightengine (images), Dedalus (text) |
| Deployment   | AWS Amplify                    |

**Important:** Amplify is used ONLY for S3 storage. Auth and database are handled entirely by Supabase.

---

## Project Structure

```
app/
├── (auth)/login/           # Login page
├── (auth)/register/        # Register page (new user signup)
├── (main)/                 # Protected routes with shared header layout
│   ├── explore/            # Browse works (prioritizes followed users)
│   ├── profile/            # Own profile
│   ├── profile/edit/       # Edit profile
│   ├── upload/             # Create artwork
│   ├── work/[id]/          # Work detail page
│   └── [username]/         # Public profile (e.g., /alice)
├── api/
│   ├── validate-image/     # Sightengine AI detection
│   ├── validate-text/      # Dedalus AI detection
│   └── works/[id]/         # Work deletion
├── auth/signout/           # Sign out handler
├── newuser/                # New user onboarding
└── oauth/consent/          # OAuth callback

components/                 # Shared React components
lib/
├── amplify/storage.ts      # S3 upload utilities
├── supabase/               # Supabase client (client.ts, server.ts)
└── api/types.ts            # Shared TypeScript types

scripts/seed.mjs            # Database seeding
tests/                      # Vitest tests
supabase/migrations/        # SQL migrations
```

---

## Conventions

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- DB tables: `snake_case`, plural (`works`, `profiles`)
- API routes: `/api/kebab-case`

### Patterns
- Server components by default, `'use client'` when needed
- Supabase RLS for authorization + API route validation
- AI detection happens **before** storing content
- Wrapper functions for external deps (`lib/amplify/storage.ts`)

---

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profiles (extends `auth.users`) | `id` (FK to auth.users), `username`, `display_name`, `avatar_url`, `bio` |
| `works` | Artwork/essays | `author_id`, `title`, `work_type` (image/essay), `image_url`, `content` |
| `follows` | One-way follows | `follower_id`, `following_id` (composite PK) |
| `likes` | Work likes | `user_id`, `work_id` (composite PK) |
| `bookmarks` | Private bookmarks | `user_id`, `work_id` (composite PK) |
| `comments` | Work comments | `author_id`, `work_id`, `content` |
| `threads` | Topic threads | `name` |
| `interests` | Interest categories | `name` |
| `user_interests` | User interest prefs | `user_id`, `interest_id` |
| `work_interests` | Work categorization | `work_id`, `interest_id` |

### Patterns

- **Standard columns:** `id uuid`, `created_at`, `updated_at` on all tables
- **Composite PKs:** Junction tables use `(user_id, target_id)` as primary key
- **Cascade deletes:** All FKs use `on delete cascade`
- **Auto profile creation:** Trigger creates profile on `auth.users` insert
- **Updated_at trigger:** Auto-updates timestamp on row changes

### RLS Policies

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `profiles` | Public | Own only | Own only | - |
| `works` | Public | Own only | Own only | Own only |
| `follows` | Public | Own follows | - | Own follows |
| `likes` | Public | Own only | - | Own only |
| `bookmarks` | **Own only** | Own only | - | Own only |

### Queries

```typescript
// Get works with author (join)
const { data } = await supabase
  .from("works")
  .select(`*, author:profiles!works_author_id_fkey(id, username, avatar_url)`)
  .order("created_at", { ascending: false });

// Check if following
const { data } = await supabase
  .from("follows")
  .select("follower_id")
  .eq("follower_id", currentUserId)
  .eq("following_id", targetUserId)
  .maybeSingle();

// Count followers
const { count } = await supabase
  .from("follows")
  .select("*", { count: "exact", head: true })
  .eq("following_id", profileId);
```

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` | OAuth login (Google) |
| `/register` | New user signup (Google OAuth) |
| `/newuser` | New user onboarding |
| `/explore` | Browse/feed (protected) |
| `/profile` | Own profile (protected) |
| `/profile/edit` | Edit profile (protected) |
| `/[username]` | Public profile |
| `/upload` | Create work (protected) |
| `/work/[id]` | View work detail |

---

## Environment Setup

### Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Site URL (for OAuth redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Detection Services (server-side only)
SIGHTENGINE_API_USER=your-api-user
SIGHTENGINE_API_SECRET=your-api-secret
DEDALUS_API_KEY=your-api-key

# AI Code Review (optional but recommended)
# Get key from: https://dashboard.dedaluslabs.ai/ or https://console.anthropic.com/
DEDALUS_API_KEY=your-api-key  # OR use ANTHROPIC_API_KEY
```

### Automated Code Review

The project includes AI-powered code review using Dedalus + Claude that runs:
- **Pre-commit hook**: Automatically checks staged files before each commit
- **Manual review**: Run `npm run review` anytime to check staged changes

**What it checks:**
- Security vulnerabilities (SQL injection, XSS, auth bypass)
- RLS policy violations and missing auth checks
- AI detection bypasses or threshold changes
- Naming convention violations
- Missing error handling
- TypeScript best practices

**Setup:**
1. Add `DEDALUS_API_KEY` to `.env.local` (see above)
2. Hooks are automatically configured via Husky
3. Review runs automatically on `git commit`

**Note:** If `DEDALUS_API_KEY` is not set, the pre-commit hook will skip the AI review with a warning but allow the commit to proceed.

---

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run review       # AI code review on staged changes
npm run test         # Vitest
npm run seed         # Seed database
```

---

## Current Scope

**Build:**
- Core loop: auth → onboarding → upload → explore → follow

**Do not build yet:**
- Communities
- Comments UI
- Notifications
- Search
- Likes/bookmarks UI
