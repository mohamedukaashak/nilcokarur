# ⚡ Quick Setup - 5 Minutes to Working Authentication

## 🎯 Goal: Get Supabase authentication running in 5 simple steps

---

## Step 1️⃣: Create Supabase Project (2 minutes)

1. **Go to**: https://app.supabase.com
2. **Click**: "New Project"
3. **Fill in**:
   - Name: FreshCart
   - Database Password: (create a strong one, save it)
   - Region: Choose closest to you
4. **Click**: "Create new project"
5. **Wait**: ~2 minutes for setup

✅ **Done!**

---

## Step 2️⃣: Get Your Credentials (30 seconds)

1. **Click**: Settings (gear icon) in left sidebar
2. **Click**: API
3. **Copy these two values**:
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

✅ **Done!**

---

## Step 3️⃣: Update Config File (30 seconds)

1. **Open**: `src/js/supabase-config.js`
2. **Find** (lines 11-12):
   ```javascript
   url: 'https://YOUR_PROJECT_ID.supabase.co',
   anonKey: 'YOUR_SUPABASE_ANON_KEY'
   ```
3. **Replace** with your actual values:
   ```javascript
   url: 'https://abcdefghijk.supabase.co',
   anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   ```
4. **Save** the file

✅ **Done!**

---

## Step 4️⃣: Setup Database (1 minute)

1. **Go to**: SQL Editor in Supabase dashboard
2. **Click**: "New Query"
3. **Open file**: `supabase-setup.sql` (in project root)
4. **Copy** entire file content
5. **Paste** into SQL Editor
6. **Click**: "Run" (or Ctrl+Enter)
7. **Should see**: "Success. No rows returned"

✅ **Done!**

---

## Step 5️⃣: Create Storage Bucket (30 seconds)

1. **Click**: Storage in left sidebar
2. **Click**: "New Bucket"
3. **Name**: `avatars`
4. **Public**: Toggle ON (✅)
5. **Click**: "Create"

✅ **Done!**

---

## 🎉 TEST IT! (1 minute)

### Run the site:
```bash
npm run dev
```

### Open in browser:
```
http://localhost:3203
```

### Test Registration:
1. Click **User icon** (top right)
2. Click **Sign Up** tab
3. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Phone: 1234567890
   - Password: test123456
   - Confirm: test123456
   - ✅ Check terms
4. Click **Sign Up**
5. ✅ Should see success message!

### Verify in Supabase:
1. Go to **Authentication** → **Users**
2. You should see: test@example.com
3. Go to **Table Editor** → **profiles**
4. You should see the profile record!

---

## 🚨 Troubleshooting

### "Supabase not configured" warning?
→ You didn't update `supabase-config.js` with real credentials

### "relation profiles does not exist"?
→ You didn't run the SQL setup

### Login fails?
→ User doesn't exist, sign up first

### Can't see user in dashboard?
→ Check browser console for errors

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Console shows: "✅ Supabase initialized successfully"
- ✅ Registration creates user in dashboard
- ✅ Login shows user name in navbar
- ✅ Profile updates save to database
- ✅ Session persists after page reload

---

## 📝 That's It!

**Total Time**: ~5 minutes
**Steps**: 5 simple actions
**Result**: Full authentication system working!

---

## 📚 Need More Help?

- **Detailed Guide**: `SUPABASE_SETUP.md`
- **Complete Summary**: `AUTHENTICATION_SUMMARY.md`
- **SQL File**: `supabase-setup.sql`
- **Supabase Docs**: https://supabase.com/docs

---

**🎊 Congratulations! Your authentication is live!**
