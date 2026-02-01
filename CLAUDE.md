# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InovaSprint is a hackathon management platform (PWA) for high school ideathon/hackathon events. It supports multiple user roles (Super Admin, Admin, Mentor, Jury, Student) with Turkish and English language support.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State**: Zustand (stores/)
- **UI**: Shadcn/UI + Tailwind CSS + Lucide icons
- **i18n**: next-intl (messages/tr.json, messages/en.json)
- **Forms**: React Hook Form + Zod

### Key Directories
- `app/` - Next.js App Router pages (admin, jury, mentor, student, team, join, login)
- `components/` - UI components organized by role (admin/, jury/, mentor/, student/, team/, auth/, ui/)
- `lib/supabase/` - Supabase clients (client.ts for browser, server.ts for server components)
- `stores/` - Zustand stores (auth-store, event-store, voting-store)
- `types/` - TypeScript types including database.ts (Supabase schema types)
- `supabase/` - Database schema (schema.sql) and migrations (migrations/)
- `messages/` - i18n translation files (tr.json, en.json)

### Supabase Client Usage
- Browser components: `import { createClient } from '@/lib/supabase/client'`
- Server components: `import { createClient } from '@/lib/supabase/server'` (async function)

### Database Schema
Core tables: `events`, `teams`, `profiles`, `user_notes`, `transactions`, `jury_scores`, `canvas_contributions`, `team_decisions`, `mentor_assignments`, `mentor_feedback`

Key RLS pattern: Admin isolation via `created_by` column on events - each admin only sees their own events.

### Event Flow States
```
WAITING → IDEATION → LOCKED → PITCHING → VOTING → COMPLETED
```

### Authentication & Middleware
- Role-based route protection in `middleware.ts`
- Protected routes: /admin (admin role), /jury (jury role), /mentor (mentor role)
- Anonymous auth enabled for student team joining via QR codes

### i18n Pattern
- Language config in `lib/i18n/config.ts`
- Default locale: Turkish ('tr')
- Events can have per-event language setting

## Database Migrations

When adding new features requiring schema changes:
1. Create a new SQL file in `supabase/migrations/`
2. Run the migration in Supabase SQL Editor
3. Update `types/database.ts` if adding new tables/columns
