# Timeline

An AI-free artist portfolio and social platform. Showcase your human creativity.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with API Routes
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: AWS Amplify Storage (S3)
- **AI Detection**: Sightengine (images), Dedalus/Claude (text)
- **Deployment**: AWS Amplify

## Getting Started

```bash
npm install
cp .env.example .env.local  # Add your credentials
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
├── amplify/              # AWS Amplify backend config
├── app/
│   ├── api/              # API routes (validation, works)
│   ├── (auth)/           # Auth pages
│   └── ...               # Feature pages
├── components/
├── lib/
│   ├── amplify/          # Amplify Storage utilities
│   ├── api/              # Shared types
│   └── supabase/         # Supabase clients
└── supabase/             # DB migrations
```

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/evelynnwu/TIMELINE?utm_source=oss&utm_medium=github&utm_campaign=evelynnwu%2FTIMELINE&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
