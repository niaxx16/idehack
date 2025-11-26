# Quick Start Guide - InovaSprint

Your development server is now running! Follow these steps to get everything working.

## ✅ Already Completed
- ✅ Environment variables configured
- ✅ Development server running at http://localhost:3000
- ✅ Dependencies installed

## 🚀 Next Steps (Required)

### Step 1: Set Up Database (5 minutes)

1. Open your **Supabase Dashboard**: https://udlkyxytmyxxktflzfpi.supabase.co

2. Go to **SQL Editor** in the left sidebar

3. Click **"New query"**

4. Copy the contents of `supabase/schema.sql` and paste into the editor

5. Click **"Run"** (or Ctrl/Cmd + Enter)

6. You should see: ✅ "Success. No rows returned"

This creates all tables, policies, functions, and triggers needed.

### Step 2: Enable Anonymous Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**

2. Scroll down to find **Anonymous** provider

3. Toggle it **ON**

4. Click **Save**

This allows students to join teams without creating accounts.

### Step 3: Create Storage Bucket for Presentations

1. Go to **Storage** in the sidebar

2. Click **"New bucket"**

3. Name it: `presentations`

4. Keep it **Private** (uncheck "Public bucket")

5. Click **"Create bucket"**

6. Click on the `presentations` bucket

7. Go to **Policies** tab → **"New policy"** → **"For full customization"**

8. Paste this SQL:
   ```sql
   CREATE POLICY "Users can upload presentations"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'presentations'
     AND auth.uid() IS NOT NULL
   );
   ```

9. Add another policy for reading:
   ```sql
   CREATE POLICY "Anyone can read presentations"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'presentations');
   ```

### Step 4: Create Your First Admin User

1. In Supabase Dashboard, go to **Authentication** → **Users**

2. Click **"Add user"** → **"Create new user"**

3. Fill in:
   - **Email**: `admin@example.com` (or your email)
   - **Password**: Choose a secure password (min 6 characters)

4. Click **"Create user"**

5. Copy the **User UID** from the user list (long UUID string)

6. Go back to **SQL Editor**

7. Run this SQL (replace with your user ID):
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = 'paste-your-user-id-here';
   ```

### Step 5: Enable Realtime (Optional but Recommended)

1. Go to **Database** → **Replication** in sidebar

2. Find the `supabase_realtime` publication

3. Ensure these tables are checked:
   - ☑ events
   - ☑ teams
   - ☑ profiles

4. If not checked, click on the publication and add them

## 🎉 Ready to Test!

Now visit: **http://localhost:3000**

### Test the Admin Flow:

1. Click **"Admin / Jury Login"**
2. Enter your admin credentials
3. You'll be redirected to `/admin`
4. Try creating a team:
   - Go to **Teams** tab
   - Fill in team name (e.g., "Team Alpha")
   - Table number (e.g., 1)
   - Click **"Create Team"**
5. Click **"Show QR Code"** to see the join link

### Test the Student Flow:

1. Copy the join URL from the QR code dialog
2. Open it in a private/incognito window (or different browser)
3. Enter your name
4. Click **"Join Team"**
5. You'll see the student view

### Test Event Phases:

1. As admin, go to **Event Control**
2. Click through the phases:
   - **Start Ideation** → Teams can now edit their canvas
   - **Lock Submissions** → Teams can't edit anymore
   - **Start Pitching** → Go to Pitch Control, select a team, start timer
   - **Start Voting** → Students can now vote
   - **Complete Event** → View leaderboard

## 📱 Testing on Mobile

1. Find your computer's local IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=http://YOUR-IP:3000
   ```

3. Restart the dev server (Ctrl+C, then `npm run dev`)

4. On your mobile (same WiFi), visit: `http://YOUR-IP:3000`

5. Scan the QR code to test the join flow!

## ⚠️ Troubleshooting

### "Invalid API key" error
- Double-check credentials in `.env.local`
- Ensure you copied the **anon** key (not service_role)
- Restart dev server after changing env variables

### Database tables don't exist
- Run the SQL schema again
- Check for errors in the SQL Editor
- Ensure all SQL statements completed successfully

### Can't join team via QR code
- Check that Anonymous auth is enabled
- Verify the join URL has the correct domain
- Check browser console for errors

### File upload fails
- Ensure storage bucket `presentations` exists
- Verify storage policies are set
- Check file is under 50MB

## 📚 What's Next?

- Read `README.md` for full feature list
- Check `SETUP_GUIDE.md` for detailed explanations
- Explore the codebase structure
- Customize colors and branding
- Test the full event flow with friends

## 🎯 Quick Reference

- **Home**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **Team View**: http://localhost:3000/team
- **Student View**: http://localhost:3000/student
- **Jury View**: http://localhost:3000/jury
- **Login**: http://localhost:3000/login

---

Need help? Check the troubleshooting sections in `README.md` and `SETUP_GUIDE.md`!
