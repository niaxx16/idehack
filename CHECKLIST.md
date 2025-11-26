# Setup Checklist - InovaSprint

Use this checklist to track your setup progress.

##  Development Environment (DONE)
- [x] Next.js 14 project created
- [x] Dependencies installed
- [x] Environment variables configured
- [x] Development server running at http://localhost:3000

## =2 Supabase Configuration (TODO)

### Database Setup
- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Verify all tables created (events, teams, profiles, user_notes, transactions, jury_scores)
- [ ] Check that RPC functions exist (join_team_by_token, submit_portfolio, get_leaderboard)

### Authentication
- [ ] Enable Anonymous provider in Auth > Providers
- [ ] Save authentication settings

### Storage
- [ ] Create `presentations` bucket (Private)
- [ ] Add upload policy for authenticated users
- [ ] Add read policy for all users

### Realtime
- [ ] Enable Realtime replication for:
  - [ ] events table
  - [ ] teams table
  - [ ] profiles table

## =d User Setup (TODO)
- [ ] Create first admin user in Authentication > Users
- [ ] Copy the user's UUID
- [ ] Run UPDATE query to set role = 'admin'
- [ ] (Optional) Create jury test user
- [ ] (Optional) Create additional admin users

## >ê Testing (TODO)

### Basic Functionality
- [ ] Visit http://localhost:3000
- [ ] Login page loads correctly
- [ ] Admin can login with credentials

### Admin Features
- [ ] Create a test team
- [ ] View team QR code
- [ ] Change event phases (WAITING ’ IDEATION ’ LOCKED ’ PITCHING ’ VOTING ’ COMPLETED)
- [ ] Select team for pitching
- [ ] Start pitch timer
- [ ] View leaderboard

### Team Features
- [ ] Navigate to /team
- [ ] Fill out canvas form
- [ ] Upload presentation file (PDF/PPT)
- [ ] View team QR code
- [ ] Verify form locks during LOCKED/PITCHING phases

### Student Features
- [ ] Join team via QR code
- [ ] View pitch in student view
- [ ] Take private notes
- [ ] Send hype reactions (Clap/Fire)
- [ ] Vote during VOTING phase
- [ ] Submit portfolio investments

### Jury Features
- [ ] Login as jury user
- [ ] View split-screen dashboard
- [ ] Enter stream URL
- [ ] View embedded stream
- [ ] Score a team on all 4 criteria
- [ ] Add comments
- [ ] Update existing score

## =ñ Mobile Testing (Optional)
- [ ] Find local IP address
- [ ] Update NEXT_PUBLIC_APP_URL in .env.local
- [ ] Restart dev server
- [ ] Test QR code scanning on mobile device
- [ ] Test student view on mobile
- [ ] Test hype reactions on mobile

## <¨ Customization (Optional)
- [ ] Update app name/branding
- [ ] Customize color scheme in globals.css
- [ ] Add logo images
- [ ] Update PWA icons (icon-192.png, icon-512.png)
- [ ] Customize email templates in Supabase

## =€ Production Deployment (Future)
- [ ] Push code to GitHub
- [ ] Deploy to Vercel/Netlify
- [ ] Update NEXT_PUBLIC_APP_URL to production domain
- [ ] Test production deployment
- [ ] Create production admin users
- [ ] Test all features in production

## =Ê Event Day Preparation
- [ ] Create all teams in advance
- [ ] Print QR codes for each table
- [ ] Create jury accounts
- [ ] Set up stream URL
- [ ] Test full flow end-to-end
- [ ] Prepare backup plan (exported data, screenshots)
- [ ] Brief team captains on desktop view
- [ ] Brief students on mobile flow
- [ ] Brief jury on remote scoring

## =Ú Documentation Review
- [ ] Read README.md
- [ ] Review SETUP_GUIDE.md
- [ ] Follow QUICKSTART.md
- [ ] Understand database schema in schema.sql

---

## Current Status: =á Development Environment Ready

**Next immediate step**: Set up Supabase database by running `supabase/schema.sql`

See `QUICKSTART.md` for step-by-step instructions!
