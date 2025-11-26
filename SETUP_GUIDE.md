# InovaSprint - Detailed Setup Guide

This guide will walk you through setting up the InovaSprint platform from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Development](#local-development)
4. [Testing the Platform](#testing-the-platform)
5. [Deployment](#deployment)

## Prerequisites

### Required Software
- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (optional, for version control)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Required Accounts
- **Supabase Account** (free tier is sufficient) - [Sign up](https://supabase.com)

## Supabase Setup

### Step 1: Create a New Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Choose your organization (or create one)
4. Fill in project details:
   - **Name**: InovaSprint
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your location
5. Click **"Create new project"**
6. Wait 2-3 minutes for provisioning

### Step 2: Set Up the Database

1. In Supabase Dashboard, click **SQL Editor** in the sidebar
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from your project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. You should see: "Success. No rows returned"

This creates:
- 6 tables (events, teams, profiles, user_notes, transactions, jury_scores)
- Enums for status types
- Row Level Security policies
- Database functions for voting and leaderboard
- Triggers for timestamps

### Step 3: Configure Authentication

1. Go to **Authentication** > **Providers** in sidebar
2. Enable **Email** provider (should be enabled by default)
3. Scroll down and enable **Anonymous** provider
4. Click **Save**

### Step 4: Create Storage Bucket

1. Go to **Storage** in the sidebar
2. Click **"New bucket"**
3. Bucket details:
   - **Name**: `presentations`
   - **Public bucket**: Uncheck (keep private)
4. Click **"Create bucket"**

5. Add storage policies:
   - Click on the `presentations` bucket
   - Go to **Policies** tab
   - Click **"New policy"** > **"For full customization"**

   **Upload Policy:**
   ```sql
   CREATE POLICY "Users can upload presentations"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'presentations'
     AND auth.uid() IS NOT NULL
   );
   ```

   **Read Policy:**
   ```sql
   CREATE POLICY "Anyone can read presentations"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'presentations');
   ```

### Step 5: Enable Realtime

1. Go to **Database** > **Replication** in sidebar
2. You should see `supabase_realtime` publication
3. Ensure these tables are checked:
   - `events`
   - `teams`
   - `profiles`
4. If not, click **"0 tables"** and add them

### Step 6: Get API Credentials

1. Go to **Settings** > **API** in sidebar
2. Find these values:
   - **Project URL** (starts with https://)
   - **anon public** key (long string)
3. Keep this tab open, you'll need these values

## Local Development

### Step 1: Install Dependencies

Open terminal in the project folder:

```bash
cd inovasprint
npm install
```

This will install all required packages (~400 packages, takes 1-2 minutes).

### Step 2: Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` in a text editor

3. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Step 3: Start Development Server

```bash
npm run dev
```

You should see:
```
  ² Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Create Admin User

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add user"** > **"Create new user"**
4. Enter:
   - **Email**: admin@example.com
   - **Password**: (choose a secure password)
5. Click **"Create user"**
6. Copy the user's UUID (shown in the user list)

7. Go to **SQL Editor** and run:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = 'paste-user-uuid-here';
   ```

## Testing the Platform

### Test 1: Admin Login

1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter admin email and password
3. You should be redirected to `/admin`

### Test 2: Create Event and Team

1. In the admin dashboard, go to **Teams** tab
2. Create a team:
   - **Team Name**: Test Team Alpha
   - **Table Number**: 1
3. Click **"Show QR Code"** to verify it displays

### Test 3: Join Team (Mobile Flow)

1. Click the QR code or copy the join URL
2. Open in a private/incognito window or different browser
3. Enter a name and join
4. You should see the student view

### Test 4: Event Flow

1. As admin, go to **Event Control**
2. Click through the phases:
   - **Start Ideation** ’ Teams can edit
   - **Lock Submissions** ’ Teams can't edit
   - **Start Pitching** ’ Select a team to pitch
   - **Start Voting** ’ Students can vote
3. Verify each phase works in the student view

## Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"**
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (use your Vercel URL)
6. Click **"Deploy"**

### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** > **"Deploy from GitHub repo"**
3. Select your repository
4. Add environment variables
5. Deploy

### Post-Deployment Steps

1. Update `NEXT_PUBLIC_APP_URL` to your production URL
2. Test QR code functionality
3. Create production admin user
4. Test all features on mobile devices

## Troubleshooting

### Issue: "Invalid API key"
- Check that you copied the **anon** key, not service_role key
- Ensure no extra spaces in .env.local
- Restart dev server after changing env variables

### Issue: QR code join doesn't work
- Check NEXT_PUBLIC_APP_URL is correct
- Ensure URL is accessible from mobile devices (not localhost on mobile)
- Use ngrok or similar for local testing on mobile

### Issue: File upload fails
- Verify storage bucket `presentations` exists
- Check storage policies are set correctly
- Ensure file is under 50MB

### Issue: Realtime not updating
- Check Realtime is enabled in Supabase
- Verify tables are in replication publication
- Check browser console for errors

## Next Steps

1. Customize branding (colors, logos)
2. Add your event details
3. Create jury accounts
4. Test the full flow with a small team
5. Prepare QR codes for printing

## Support

For issues, check:
- Browser console for errors
- Supabase logs in Dashboard > Logs
- Network tab for failed requests

Happy hacking! =€
