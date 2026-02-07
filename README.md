#*-timeline

**A platform for creatives to connect and witness truly human, authentic work.**

Timeline is an AI-free artist portfolio and social platform where creators can showcase their authentic work, connect with other artists, and build a community that values human creativity over AI-generated content.

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/evelynnwu/TIMELINE?utm_source=oss&utm_medium=github&utm_campaign=evelynnwu%2FTIMELINE&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

---

## Core Features

- **Upload & Share Work** - Artists can upload images and essays with AI detection validation
- **Follow Creators** - Build your creative network and discover new artists
- **Thread System** - Organize and discover work by topic threads (Illustration, Photography, etc.)
- **Explore Feed** - Browse work with prioritized content from followed creators
- **AI Detection** - Every upload is verified for authenticity using Sightengine (images) and Dedalus AI (text)
- **Save & Bookmark** - Save works to revisit later
- **Like & Engage** - Show appreciation for authentic creative work
- **Responsive Design** - Beautiful experience across all devices

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase OAuth (Google) |
| **Storage** | AWS Amplify Storage (S3 only) |
| **AI Detection** | Sightengine (images), Dedalus AI (text) |
| **3D Graphics** | Spline (@splinetool/react-spline) |
| **Deployment** | AWS Amplify |

**Note:** Amplify is used ONLY for S3 storage. Auth and database are handled entirely by Supabase.

---

## Project Structure

```
timeline/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   ├── (main)/              # Protected routes with shared layout
│   │   ├── explore/         # Browse/discover feed
│   │   ├── profile/         # User profile (own)
│   │   ├── profile/edit/    # Edit profile settings
│   │   ├── upload/          # Create new artwork
│   │   ├── create-thread/   # Create topic thread
│   │   ├── thread/[id]/     # Thread-specific feed
│   │   ├── threads/[id]/    # Thread detail page
│   │   ├── work/[id]/       # Work detail page
│   │   └── [username]/      # Public profile pages
│   ├── api/                 # API routes
│   │   ├── validate-image/  # Sightengine AI detection
│   │   ├── validate-text/   # Dedalus AI detection
│   │   └── works/[id]/      # Work deletion endpoint
│   ├── auth/signout/        # Sign out handler
│   ├── newuser/             # New user onboarding
│   ├── oauth/consent/       # OAuth callback
│   └── page.tsx             # Landing page
├── components/              # Shared React components
│   ├── home-client.tsx      # Homepage client wrapper
│   ├── spline-background.tsx # 3D spiral animation
│   ├── draggable-tagline.tsx # Interactive tagline
│   └── providers/           # Context providers
├── app/components/          # App-specific components
│   ├── portfolio-card.tsx   # Profile sidebar card
│   ├── thread-left-sidebar.tsx
│   ├── thread-right-sidebar.tsx
│   └── header.tsx           # Main navigation
├── lib/
│   ├── amplify/             # S3 storage utilities
│   │   └── storage.ts       # Upload/download helpers
│   ├── supabase/            # Supabase clients
│   │   ├── client.ts        # Client-side client
│   │   └── server.ts        # Server-side client
│   └── api/types.ts         # Shared TypeScript types
├── supabase/
│   └── migrations/          # SQL database migrations
├── public/
│   └── scene.splinecode     # 3D spiral scene file
└── tests/                   # Vitest tests
```

---

## Database Schema

### Core Tables

- **profiles** - User profiles (extends auth.users)
- **works** - Artwork and essays with AI validation
- **threads** - Topic categories (Illustration, Photography, etc.)
- **work_threads** - Many-to-many work ↔ thread relationships
- **user_threads** - Thread follows/subscriptions
- **follows** - User ↔ user following relationships
- **likes** - Work likes
- **bookmarks** - Private saved works
- **comments** - Work comments

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- AWS Account (for S3 storage)
- Sightengine API key
- Dedalus API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/evelynnwu/TIMELINE.git
   cd TIMELINE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Add your credentials:
   ```env
   # Site URL
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # AI Detection
   SIGHTENGINE_API_USER=your-api-user
   SIGHTENGINE_API_SECRET=your-api-secret
   DEDALUS_API_KEY=your-api-key

   # AWS (for S3 storage)
   # Configure via Amplify CLI
   ```

4. **Run database migrations**
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or run the seed script
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

---

## Design System

### Color Palette

- **Page Backgrounds**: `#d9d9d9` (main app), `#d4d2d8` (landing)
- **Header**: `#8C7B9A`
- **Primary Buttons**: Black with white text
- **Hover States**: Opacity-based (`black/90`, `black/10`)
- **Text**: Black with opacity variants (`black/70`, `black/60`, etc.)

### Typography

- **Inter** - Body text and UI elements
- **JetBrains Mono** - Headers, navigation, buttons
- **Noto Serif KR** - Landing page subtitle
- **Inria Serif** - Thread descriptions, onboarding text
- **Jeju Myeongjo** - Form labels, sidebar text

---

## Security Features

1. **AI Content Detection**
   - Images validated via Sightengine API
   - Text/essays validated via Dedalus AI + Claude
   - Content rejected if AI probability exceeds threshold

2. **Authentication & Authorization**
   - Supabase Auth with Google OAuth
   - Row Level Security (RLS) policies
   - Server-side auth verification

3. **Data Protection**
   - Server actions for all writes
   - Input validation on all endpoints
   - Protected routes with middleware

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
npm run test         # Run Vitest tests
npm run seed         # Seed database with initial data
npm run review       # AI code review (requires DEDALUS_API_KEY)
```

---

## Development Tools

### CodeRabbit AI Code Reviews

**CodeRabbit** provides automated code reviews on every pull request, helping maintain code quality and catch issues early.

**What it does:**
- Reviews code changes in pull requests
- Identifies bugs, security vulnerabilities, and anti-patterns
- Suggests improvements for readability and maintainability
- Validates adherence to project conventions
- Provides inline comments with actionable feedback

**Usage:** CodeRabbit automatically reviews all PRs. The badge at the top shows review statistics.

### Dedalus MCP (Model Context Protocol)

**Dedalus MCP** integrates AI-powered development assistance directly into the development workflow via Supabase and Claude AI.

**What it provides:**
- **Pre-commit code review** - Automatically checks staged changes before commits
- **Security scanning** - Detects SQL injection, XSS, auth bypass, and other vulnerabilities
- **Convention enforcement** - Validates naming conventions, RLS policies, and project patterns
- **Context-aware suggestions** - Understands the full codebase via MCP integration
- **Architecture guidance** - Ensures changes align with project design decisions

**Pre-commit Hook:**
```bash
# Runs automatically on git commit
npm run review

# Skip in emergencies only (not recommended)
SKIP_REVIEW=true git commit -m "message"
```

**What the pre-commit hook checks:**
- RLS policy violations
- Missing authentication checks
- AI detection bypasses or threshold tampering
- SQL injection and XSS vulnerabilities
- Naming convention violations
- Missing error handling
- TypeScript best practices

**MCP Integration:**
- Connected to Supabase for database introspection
- Provides Claude AI with full project context
- Enables intelligent code review and suggestions
- Helps maintain consistency across the codebase

**Setup:**
Add `DEDALUS_API_KEY` to `.env.local` to enable automated reviews. Without it, pre-commit hooks will skip review with a warning.

---

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with 3D spiral |
| `/register` | Sign up with Google |
| `/login` | Log in with Google |
| `/newuser` | New user onboarding |
| `/explore` | Main feed with followed creators first |
| `/profile` | Your profile and works |
| `/upload` | Upload new artwork or essay |
| `/create-thread` | Create a new topic thread |
| `/thread/[id]` | Thread-specific feed |
| `/work/[id]` | Individual work detail page |
| `/[username]` | Public creator profile |

---

