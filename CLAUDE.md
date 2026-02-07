# CLAUDE.md — Artfolio

## Project Vision

Artfolio is an AI-free artist portfolio and social platform — a hybrid of LinkedIn (professional showcase), Substack (long-form content), and Reddit (interest communities). All uploaded content must pass AI detection: **Sightengine** for images, **GPTZero** for text/essays.

The core philosophy: **empower human creators, not replace them.**

---

## Tech Stack

| Layer        | Choice                               | Notes                                     |
| ------------ | ------------------------------------ | ----------------------------------------- |
| Frontend     | Next.js 14 (App Router)              | TypeScript, Tailwind, shadcn/ui           |
| Backend      | FastAPI (Python 3.11+)               | Async-first, Pydantic v2                  |
| Database     | Supabase (PostgreSQL 15)             | Also handles auth, storage, realtime      |
| Auth         | Supabase Auth                        | OAuth providers (Google, GitHub, Discord) |
| Storage      | Supabase Storage                     | Images only, with CDN                     |
| AI Detection | Sightengine (images), GPTZero (text) | Pre-upload validation                     |
| Deployment   | Vercel (FE), Railway (BE)            | Future: containerize BE                   |

---

## Architecture Principles

### 1. Start Simple, Design for Change

- Begin with monolithic FastAPI app — no microservices yet
- Use **service layer abstraction** so implementations can be swapped
- Every external dependency gets a wrapper class (AI detectors, storage, email)

### 2. Vertical Slices Over Horizontal Layers

- Organize by **feature**, not by technical layer
- Each feature folder contains its routes, services, and schemas
- Shared utilities live in `core/`

### 3. Database as Source of Truth

- Business logic lives in Python, not SQL functions
- Use Supabase RLS for authorization, but validate in backend too
- Migrations via Alembic (not Supabase dashboard clicks)

### 4. Fail Fast on AI Detection

- Check content **before** storing anything
- Rejected uploads should never touch storage or database
- Store detection scores for audit trail

### 5. API-First Design

- Backend is a pure JSON API — no server-rendered HTML
- Frontend could be swapped for mobile app later
- Document everything with OpenAPI (FastAPI does this automatically)

---

## Project Structure

```
artfolio/
├── CLAUDE.md                    # You are here
├── README.md
│
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page (/)
│   │
│   ├── (auth)/                  # Auth group (no layout)
│   │   └── login/
│   │       └── page.tsx         # Login page with OAuth buttons
│   │
│   ├── auth/
│   │   └── signout/
│   │       └── route.ts         # POST /auth/signout - signs out user
│   │
│   ├── oauth/
│   │   └── consent/
│   │       └── route.ts         # OAuth callback - exchanges code for session
│   │
│   ├── feed/
│   │   └── page.tsx             # Main feed (protected)
│   │
│   └── profile/
│       └── page.tsx             # User profile (protected)
│
├── components/
│   └── ui/                      # shadcn/ui primitives
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # Server Supabase client + getUser/getSession
│   │   └── middleware.ts        # Route protection middleware
│   └── utils.ts
│
├── supabase/
│   └── migrations/
│       └── 00001_create_profiles.sql  # Profiles table + RLS + triggers
│
├── middleware.ts                # Next.js middleware (calls updateSession)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Coding Conventions

### Python (Backend)

```python
# Use async everywhere
async def get_work(work_id: UUID) -> Work:
    ...

# Type hints are mandatory
def calculate_score(likes: int, age_hours: float) -> float:
    ...

# Pydantic for all data validation
class CreateWorkRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    work_type: WorkType
    description: str | None = None

# Dependency injection for services
@router.post("/works")
async def create_work(
    request: CreateWorkRequest,
    current_user: User = Depends(get_current_user),
    work_service: WorkService = Depends(get_work_service),
    ai_detector: AIDetector = Depends(get_ai_detector),
):
    ...

# Custom exceptions with HTTP mapping
class AIDetectionFailed(AppException):
    status_code = 400
    error_code = "AI_CONTENT_DETECTED"

# Services return domain objects, not dicts
class WorkService:
    async def create(self, author_id: UUID, data: CreateWorkRequest) -> Work:
        ...
```

### TypeScript (Frontend)

```typescript
// Explicit return types on functions
function formatDate(date: Date): string {
  ...
}

// API responses typed with shared types
import type { Work, User } from '@/lib/api/types';

// React components: named exports, props interface
interface WorkCardProps {
  work: Work;
  onLike?: () => void;
}

export function WorkCard({ work, onLike }: WorkCardProps) {
  ...
}

// Prefer server components, mark client explicitly
'use client';

// Use React Query for server state
const { data: works, isLoading } = useQuery({
  queryKey: ['works', username],
  queryFn: () => api.works.getByUser(username),
});
```

### Naming Conventions

| Thing            | Convention         | Example                          |
| ---------------- | ------------------ | -------------------------------- |
| Python files     | snake_case         | `ai_detection.py`                |
| Python classes   | PascalCase         | `WorkService`                    |
| Python functions | snake_case         | `get_current_user`               |
| TS/React files   | kebab-case         | `work-card.tsx`                  |
| React components | PascalCase         | `WorkCard`                       |
| Database tables  | snake_case, plural | `works`, `community_members`     |
| API endpoints    | kebab-case, plural | `/api/works`, `/api/communities` |
| Environment vars | SCREAMING_SNAKE    | `SIGHTENGINE_API_KEY`            |

---

## Service Layer Pattern

All external dependencies are wrapped in service classes with abstract base protocols. This allows swapping implementations (e.g., mock for testing, different provider later).

```python
# services/ai_detection/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class DetectionResult:
    passed: bool
    confidence: float  # 0-1, how confident we are it's human-made
    raw_score: float   # Provider-specific score
    provider: str
    details: dict

class AIDetector(ABC):
    """Protocol for AI content detection services."""

    @abstractmethod
    async def check_image(self, image_bytes: bytes, filename: str) -> DetectionResult:
        """Check if an image is AI-generated."""
        ...

    @abstractmethod
    async def check_text(self, text: str) -> DetectionResult:
        """Check if text is AI-generated."""
        ...

# services/ai_detection/sightengine.py
class SightengineDetector(AIDetector):
    """Sightengine implementation for image detection."""

    AI_THRESHOLD = 0.75  # Reject if ai_generated > this

    async def check_image(self, image_bytes: bytes, filename: str) -> DetectionResult:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sightengine.com/1.0/check.json",
                data={
                    "models": "genai",
                    "api_user": self.api_user,
                    "api_secret": self.api_secret,
                },
                files={"media": (filename, image_bytes)}
            )
            data = response.json()
            ai_score = data.get("type", {}).get("ai_generated", 0)

            return DetectionResult(
                passed=ai_score < self.AI_THRESHOLD,
                confidence=1 - ai_score,
                raw_score=ai_score,
                provider="sightengine",
                details=data,
            )

    async def check_text(self, text: str) -> DetectionResult:
        raise NotImplementedError("Sightengine doesn't support text detection")

# services/ai_detection/gptzero.py
class GPTZeroDetector(AIDetector):
    """GPTZero implementation for text detection."""

    AI_THRESHOLD = 0.65  # Reject if completely_generated_prob > this

    async def check_text(self, text: str) -> DetectionResult:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.gptzero.me/v2/predict/text",
                headers={"x-api-key": self.api_key},
                json={"document": text}
            )
            data = response.json()
            ai_prob = data.get("documents", [{}])[0].get("completely_generated_prob", 0)

            return DetectionResult(
                passed=ai_prob < self.AI_THRESHOLD,
                confidence=1 - ai_prob,
                raw_score=ai_prob,
                provider="gptzero",
                details=data,
            )

    async def check_image(self, image_bytes: bytes, filename: str) -> DetectionResult:
        raise NotImplementedError("GPTZero doesn't support image detection")

# Composite detector that routes to the right provider
class ContentDetector:
    def __init__(self, image_detector: AIDetector, text_detector: AIDetector):
        self.image_detector = image_detector
        self.text_detector = text_detector

    async def check(
        self,
        content_type: Literal["image", "text"],
        content: bytes | str,
        filename: str | None = None,
    ) -> DetectionResult:
        if content_type == "image":
            return await self.image_detector.check_image(content, filename)
        else:
            return await self.text_detector.check_text(content)
```

---

## Database Conventions

### Migrations

Use Alembic for migrations. Never modify the database through the Supabase dashboard in production.

```bash
# Create a new migration
alembic revision --autogenerate -m "add_bookmarks_table"

# Run migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1
```

### Common Patterns

```sql
-- Every table gets these columns
id uuid primary key default gen_random_uuid(),
created_at timestamptz default now(),
updated_at timestamptz default now()

-- Soft deletes where needed
deleted_at timestamptz default null

-- Use enums for fixed categories
create type work_type as enum ('image', 'essay', 'text_post');

-- Junction tables for many-to-many
create table work_tags (
  work_id uuid references works(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (work_id, tag_id)
);

-- Indexes on foreign keys and common queries
create index idx_works_author_id on works(author_id);
create index idx_works_created_at on works(created_at desc);
```

### Row Level Security

RLS policies handle authorization at the database level. Backend still validates, but RLS is the safety net.

```sql
-- Users can only update their own profile
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);

-- Works are publicly readable if published
create policy "Published works are public"
on works for select
using (is_published = true);

-- Only author can delete their work
create policy "Authors can delete own works"
on works for delete
using (auth.uid() = author_id);
```

---

## API Design

### Response Format

```json
// Success (single resource)
{
  "data": { "id": "...", "title": "..." }
}

// Success (list)
{
  "data": [...],
  "pagination": {
    "next_cursor": "...",
    "has_more": true
  }
}

// Error
{
  "error": {
    "code": "AI_CONTENT_DETECTED",
    "message": "This content appears to be AI-generated.",
    "details": { "confidence": 0.87 }
  }
}
```

### Pagination

Use cursor-based pagination for feeds (not offset). More efficient and handles real-time inserts.

```python
@router.get("/feed/following")
async def get_following_feed(
    cursor: str | None = None,
    limit: int = Query(default=20, le=50),
):
    # Cursor is base64-encoded (created_at, id) tuple
    ...
```

### Versioning

No URL versioning yet. When breaking changes are needed, use header-based versioning:

```
Accept: application/json; version=2
```

---

## Error Handling

```python
# core/exceptions.py
class AppException(Exception):
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"

    def __init__(self, message: str | None = None, details: dict | None = None):
        self.message = message or self.message
        self.details = details or {}

class NotFound(AppException):
    status_code = 404
    error_code = "NOT_FOUND"

class Unauthorized(AppException):
    status_code = 401
    error_code = "UNAUTHORIZED"

class AIContentDetected(AppException):
    status_code = 400
    error_code = "AI_CONTENT_DETECTED"
    message = "This content appears to be AI-generated and cannot be uploaded."

# Registered as exception handler in main.py
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )
```

---

## Testing Strategy

### Backend

```python
# tests/conftest.py
@pytest.fixture
async def test_client():
    """FastAPI test client with test database."""
    ...

@pytest.fixture
def mock_ai_detector():
    """Mock AI detector that always passes."""
    detector = Mock(spec=AIDetector)
    detector.check_image.return_value = DetectionResult(
        passed=True, confidence=0.95, raw_score=0.05, provider="mock", details={}
    )
    return detector

# tests/test_works.py
async def test_upload_rejects_ai_image(test_client, mock_ai_detector):
    mock_ai_detector.check_image.return_value = DetectionResult(
        passed=False, confidence=0.15, raw_score=0.85, provider="mock", details={}
    )

    response = await test_client.post("/works", ...)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "AI_CONTENT_DETECTED"
```

### Frontend

Use Vitest + React Testing Library. Mock API calls with MSW.

---

## Development Workflow

### Local Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local  # Fill in values

# Run dev server
npm run dev
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://oaooikqeqijrlfzdwdfs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Future: when FastAPI backend is added
# NEXT_PUBLIC_API_URL=http://localhost:8000
# SIGHTENGINE_API_USER=...
# SIGHTENGINE_API_SECRET=...
# GPTZERO_API_KEY=...
```

---

## Current Phase: Foundation

We're in **Phase 1**. Focus on:

1. ✅ Project structure setup
2. ✅ Supabase project + initial schema
3. ⬜ FastAPI app skeleton with health check (deferred - using Next.js API routes for now)
4. ✅ Supabase Auth integration (Google OAuth)
5. ⬜ Basic profile CRUD (read done, update pending)
6. ✅ Next.js app with auth flow

**Completed in this phase:**

- Supabase project: `oaooikqeqijrlfzdwdfs.supabase.co`
- `profiles` table with RLS policies (public read, owner update/insert)
- Auto-create profile trigger on user signup (pulls name + avatar from OAuth)
- Google OAuth configured and working
- Protected routes: `/feed`, `/profile`, `/explore`, `/upload`, `/settings`
- OAuth flow: `/login` → Google → `/oauth/consent` → `/feed`
- Sign out: POST `/auth/signout` → `/login`

**Do not build yet:**

- Communities
- Comments
- Feed algorithms
- Notifications
- Search

Keep the scope minimal. Get auth → profile → single image upload working end-to-end first.

---

## Commands Reference

```bash
# Next.js
npm run dev                              # Run dev server
npm run build                            # Production build
npm run lint                             # Lint

# Supabase (when using local instance)
supabase start                           # Start local instance
supabase stop                            # Stop local instance
supabase db reset                        # Reset + migrate + seed
supabase gen types typescript --local    # Generate TS types from schema

# Future: Backend (when FastAPI is added)
# uvicorn app.main:app --reload          # Run dev server
# pytest                                   # Run tests
# alembic upgrade head                     # Run migrations
```

---

## Decision Log

| Date       | Decision                           | Rationale                                     |
| ---------- | ---------------------------------- | --------------------------------------------- |
| 2025-02-06 | FastAPI over Flask                 | Async-first, auto OpenAPI, better typing      |
| 2025-02-06 | Supabase over raw Postgres         | Auth + Storage + Realtime bundled, faster MVP |
| 2025-02-06 | Sightengine + GPTZero              | Best-in-class for respective content types    |
| 2025-02-06 | Feature folders over layer folders | Easier to reason about, scales better         |
| 2025-02-06 | Cursor pagination                  | Handles real-time feeds, no offset drift      |
| 2026-02-06 | Next.js-first MVP                  | Defer FastAPI until we need custom backend logic |
| 2026-02-06 | OAuth callback at `/oauth/consent` | Clearer naming, separate from auth group      |
| 2026-02-06 | Profile auto-creation via trigger  | No extra API call needed on first login       |

---

## Open Questions

- [x] What OAuth providers beyond Google? → GitHub and Discord buttons exist, need to configure in Supabase Dashboard
- [ ] Storage limits per user?
- [ ] Appeals process for false positive AI detection?
- [ ] Monetization model? (affects schema for subscriptions)
- [ ] Mobile app timeline? (affects API design)
- [ ] Profile edit page implementation?
- [ ] When to add FastAPI backend vs continue with Next.js API routes?
