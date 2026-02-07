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
│   ├── create-thread/      # Create new thread
│   ├── thread/[id]/        # Thread-specific feed
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
| `works` | Artwork/essays | `author_id`, `title`, `work_type` (image/essay), `image_url`, `content`, `primary_thread_id` |
| `follows` | One-way follows | `follower_id`, `following_id` (composite PK) |
| `likes` | Work likes | `user_id`, `work_id` (composite PK) |
| `bookmarks` | Private bookmarks | `user_id`, `work_id` (composite PK) |
| `comments` | Work comments | `author_id`, `work_id`, `content` |
| `threads` | Topic threads (replaces interests) | `name`, `description`, `created_by` (null = system thread) |
| `work_threads` | Work-to-thread many-to-many | `work_id`, `thread_id` (composite PK) |
| `user_threads` | Thread follows | `user_id`, `thread_id` (composite PK) |

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
| `threads` | Public | Auth users (own threads) | Own threads | Own threads |
| `work_threads` | Public | Auth users | - | Auth users |
| `user_threads` | Public | Own follows | - | Own follows |

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

### Thread System

The thread system replaces the previous interests-only categorization. Threads serve as topic categories for organizing works.

**Key Features:**
- **System threads** (`created_by = null`): Default categories seeded during setup (Illustration, Photography, etc.)
- **User threads** (`created_by = user_id`): Community-created threads via the "create thread" button
- **Required categorization**: Each work must have ONE `primary_thread_id`
- **Multi-tagging**: Works can be tagged with multiple threads via `work_threads` junction table
- **Thread following**: Users can follow threads via `user_threads`

**Default System Threads:**
Illustration, Photography, Digital Art, Traditional Art, Animation, Comic & Sequential, Sculpture & 3D, Writing, Worldbuilding, Design, Crafts, Mixed Media

**Queries:**

```typescript
// Get works in a thread (via work_threads)
const { data } = await supabase
  .from("work_threads")
  .select(`work:works!work_threads_work_id_fkey(*, author:profiles!works_author_id_fkey(*))`)
  .eq("thread_id", threadId);

// Get works where thread is primary
const { data } = await supabase
  .from("works")
  .select(`*, author:profiles!works_author_id_fkey(*)`)
  .eq("primary_thread_id", threadId);

// Create a thread
const { data } = await supabase
  .from("threads")
  .insert({ name: "Pixel Art", description: "8-bit and pixel art", created_by: userId })
  .select()
  .single();
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
| `/create-thread` | Create new thread (protected) |
| `/thread/[id]` | Thread-specific feed |

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

## Security Best Practices

### 1. Server Actions for Database Writes

**Rule:** NEVER perform user-specific database writes directly from client components.

**❌ WRONG - Client-side DB writes:**
```typescript
"use client";
// BAD: Trusts client-side user ID
const { data: { user } } = await supabase.auth.getUser();
await supabase.from("follows").insert({ follower_id: user.id, ... });
```

**✅ CORRECT - Server actions:**
```typescript
// app/(main)/explore/actions.ts
"use server";
export async function toggleFollow(targetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Server-side auth verification
  if (!user) return { success: false };
  await supabase.from("follows").insert({ follower_id: user.id, ... });
}

// Component
"use client";
import { toggleFollow } from "./actions";
startTransition(() => {
  void (async () => {
    const result = await toggleFollow(profileId);
  })();
});
```

**Why:** Even though RLS policies protect against tampering, server actions make security explicit and prevent confusion.

### 2. ISR Caching on Personalized Pages

**Rule:** NEVER use `export const revalidate` on pages that render user-specific content.

**❌ WRONG - ISR on personalized page:**
```typescript
export const revalidate = 60; // One user's data served to others!
export default async function ExplorePage() {
  const user = await supabase.auth.getUser();
  const following = await getFollowing(user.id); // User-specific!
  return <Feed followingIds={following} />;
}
```

**✅ CORRECT - Dynamic rendering:**
```typescript
// No revalidate export
export default async function ExplorePage() {
  const user = await supabase.auth.getUser();
  const following = await getFollowing(user.id);
  return <Feed followingIds={following} />;
}
```

**Use ISR only for:**
- Landing pages
- Public content (blog posts, documentation)
- Pages with NO user-specific rendering

---

## Common Errors & Solutions

### 1. PostgREST 300 Error (Ambiguous Foreign Keys)

**Symptom:** Supabase queries return 300 status code, data doesn't load

**Cause:** PostgREST can't determine which foreign key relationship to use when the embedded resource name differs from the table name.

**Solution:** Always specify explicit foreign key names in embedded resources:

```typescript
// ❌ WRONG - Causes 300 error
.select(`
  *,
  primary_interest:interests(id, name, slug)
`)

// ✅ CORRECT - Specify foreign key explicitly
.select(`
  *,
  primary_interest:interests!works_primary_interest_id_fkey(id, name, slug)
`)
```

**Rule:** When using `relationship_name:table_name(...)` where `relationship_name ≠ table_name`, always add `!foreign_key_name`.

---

### 2. Missing Container for Mapped JSX

**Symptom:** React components don't render, no errors in console

**Cause:** `.map()` returning array of JSX without a parent container

**Solution:** Wrap mapped elements in a container:

```typescript
// ❌ WRONG - No wrapper
{items.map((item) => (
  <div key={item.id}>{item.name}</div>
))}

// ✅ CORRECT - Wrapped in container
<div className="space-y-4">
  {items.map((item) => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>
```

---

### 3. Wrong Font Import

**Symptom:** Slow loading, font request retries/timeouts

**Cause:** Importing font that doesn't match what's used in code (e.g., importing `Noto_Serif_KR` but using `Inria_Serif` in CSS)

**Solution:**
1. Check what fonts are actually used: `grep -r "font-family\|font-\[" app/`
2. Import only those fonts in `app/layout.tsx`
3. Always add `display: "swap"` and `preload: true` for performance:

```typescript
import { Inter, Inria_Serif } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const inriaSerif = Inria_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: true,
});
```

---

### 4. Sequential vs Parallel Queries

**Symptom:** Slow page loads (2-3 seconds)

**Cause:** Database queries running sequentially instead of parallel

**Solution:** Use `Promise.all()` for independent queries:

```typescript
// ❌ WRONG - Sequential (slow)
const user = await supabase.auth.getUser();
const works = await supabase.from("works").select();
const profiles = await supabase.from("profiles").select();
// Total: 300ms + 200ms + 150ms = 650ms

// ✅ CORRECT - Parallel (fast)
const [
  { data: { user } },
  { data: works },
  { data: profiles },
] = await Promise.all([
  supabase.auth.getUser(),
  supabase.from("works").select(),
  supabase.from("profiles").select(),
]);
// Total: max(300ms, 200ms, 150ms) = 300ms
```

---

### 5. Missing Database Indexes

**Symptom:** Slow queries as data grows

**Cause:** Frequently queried columns without indexes

**Solution:** Add indexes via migrations:

```sql
-- Create indexes for foreign keys and frequently queried columns
CREATE INDEX IF NOT EXISTS idx_works_author_id ON works(author_id);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_work ON bookmarks(user_id, work_id);
```

**Rule:** Index all foreign keys and columns used in `WHERE`, `ORDER BY`, or `JOIN` clauses.

---

### 6. Image Optimization

**Symptom:** Large bundle size, slow image loading

**Cause:** Using `<img>` instead of Next.js `<Image>` component

**Solution:** Always use `next/image`:

```typescript
// ❌ WRONG
<img src={work.image_url} alt={work.title} />

// ✅ CORRECT
import Image from 'next/image';

<Image
  src={work.image_url}
  alt={work.title}
  width={800}
  height={600}
  className="w-full"
  priority={false}  // lazy load
/>
```

**Note:** Add allowed domains to `next.config.js`:
```javascript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.supabase.co" },
    { protocol: "https", hostname: "*.amazonaws.com" },
  ],
}
```

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
