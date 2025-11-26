# InovaSprint - Hackathon Management Platform

A comprehensive Progressive Web App (PWA) for managing high school hackathons with hybrid support for desktop kiosk mode, mobile student participation, and remote jury evaluation.

## Features

### Multi-Role System
- **Admin Dashboard**: Event phase control, team management, pitch orchestration
- **Team Captain (Desktop)**: Project canvas form, file uploads, QR code display
- **Students (Mobile)**: Real-time pitch viewing, private notes, hype reactions, portfolio voting
- **Remote Jury**: Live stream viewing, real-time scoring, project details

### Key Capabilities
- **Hybrid Onboarding**: QR code-based team joining with anonymous authentication
- **Real-time Updates**: Powered by Supabase Realtime for live event status
- **Canvas Framework**: Problem-Solution-Audience-Revenue model
- **File Upload**: Presentation files (PDF/PPT/DOCX) stored in Supabase Storage
- **Hype System**: Live reaction animations using Realtime Broadcast (no DB writes)
- **Portfolio Voting**: Students distribute virtual currency among teams
- **Jury Scoring**: Multi-criteria evaluation (Innovation, Presentation, Feasibility, Impact)
- **Leaderboard**: Weighted scoring combining jury votes (60%) and student investments (40%)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI, Lucide React icons
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod validation
- **PWA**: next-pwa with service worker support

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned

### 3. Set Up Database
1. In Supabase Dashboard, go to SQL Editor
2. Copy the contents of `supabase/schema.sql`
3. Paste and run the SQL to create all tables, functions, and policies

### 4. Configure Storage Bucket
1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `presentations`
3. Set it to **Private** (not public)

### 5. Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials from Settings > API

### 6. Install & Run
```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 7. Create Admin User
In Supabase Dashboard:
1. Go to Authentication > Users
2. Create a user with email/password
3. Go to SQL Editor and run:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';
```

## Usage Guide

### Event Flow
WAITING → IDEATION → LOCKED → PITCHING → VOTING → COMPLETED

### For Admins
1. Login at `/login`
2. Create teams in Teams tab
3. Control event phases in Event Control
4. Manage pitches in Pitch Control
5. View results in Leaderboard

### For Team Captains
1. Navigate to `/team`
2. Fill Project Canvas
3. Upload presentation
4. Display QR code for members

### For Students
1. Scan team QR code
2. View pitches at `/student`
3. Take notes during presentations
4. Vote during voting phase

### For Jury
1. Login at `/login`
2. View `/jury` for split-screen
3. Score teams in real-time

## Database Schema

Key tables:
- `events`: Event status and metadata
- `teams`: Team data, canvas, presentations
- `profiles`: User profiles and roles
- `user_notes`: Private student notes
- `transactions`: Portfolio investments
- `jury_scores`: Jury evaluations

## Deployment

Deploy to Vercel:
```bash
npm run build
```

Update `NEXT_PUBLIC_APP_URL` in production environment variables.

## License

MIT License
