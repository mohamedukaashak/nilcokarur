# Supabase Authentication Setup Guide

## 🚀 Complete End-to-End Authentication Integration

This guide will walk you through setting up Supabase authentication for your FreshCart e-commerce site.

---

## 📋 Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Project Created**: Create a new project in Supabase dashboard
3. **Node.js Installed**: Already have this since the project runs

---

## 🔧 Step 1: Get Supabase Credentials

### 1.1 Access Your Project Settings
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click on **Settings** (gear icon) in the sidebar
4. Click on **API** in the settings menu

### 1.2 Copy Your Credentials
You'll need these two values:
- **Project URL**: `https://your-project-id.supabase.co`
- **anon public key**: A long string starting with `eyJ...`

---

## 🔐 Step 2: Configure Supabase in Your Project

### 2.1 Update Configuration File
Open `src/js/supabase-config.js` and replace:

```javascript
export const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',  // Replace with your URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY'            // Replace with your key
};
```

With your actual credentials:

```javascript
export const SUPABASE_CONFIG = {
    url: 'https://abcdefghijk.supabase.co',      // Your actual project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Your actual anon key
};
```

---

## 🗄️ Step 3: Set Up Database Tables

### 3.1 Create Profiles Table
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Run this SQL to create the profiles table:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### 3.2 Verify Table Creation
1. Go to **Table Editor** in Supabase
2. You should see a `profiles` table
3. The table should have all the columns listed above

---

## 📦 Step 4: Set Up Storage (For Profile Photos)

### 4.1 Create Avatars Bucket
1. In Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Name it: `avatars`
4. Set as **Public bucket**: ✅ Yes
5. Click **Create**

### 4.2 Set Storage Policies
Run this SQL in **SQL Editor**:

```sql
-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
    );

-- Allow public access to view avatars
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid() = owner
    );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid() = owner
    );
```

---

## ⚙️ Step 5: Configure Authentication Settings

### 5.1 Email Authentication
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure settings:
   - ✅ Enable Email Signup: Yes
   - ✅ Confirm email: Optional (disable for easier testing)
   - Double confirm email: No

### 5.2 Password Requirements
By default, Supabase requires minimum 6 characters for passwords. The code already validates this.

### 5.3 Session Management
The code handles:
- ✅ Auto-refresh tokens
- ✅ Persistent sessions (localStorage)
- ✅ Session detection on page load

---

## 🧪 Step 6: Test Authentication

### 6.1 Start Development Server
```bash
npm run dev
```

### 6.2 Test User Registration
1. Open site in browser: `http://localhost:3203`
2. Click on **User icon** in navbar
3. Click **Sign Up** tab
4. Fill in:
   - Full Name: Test User
   - Email: test@example.com
   - Phone: 1234567890
   - Password: test123456
   - Confirm Password: test123456
   - Check Terms checkbox
5. Click **Sign Up**
6. Check console for success message

### 6.3 Test User Login
1. Click on **User icon** in navbar
2. Fill in:
   - Email: test@example.com
   - Password: test123456
3. Click **Login**
4. Should see user name in navbar

### 6.4 Test Profile Update
1. Click on user name in navbar
2. Click **View Profile**
3. Update information
4. Click **Save Changes**

### 6.5 Test Logout
1. Click on user name in navbar
2. Click **Logout**
3. Should return to logged-out state

---

## 🔍 Step 7: Verify in Supabase Dashboard

### 7.1 Check Users
1. Go to **Authentication** → **Users**
2. You should see registered users
3. Click on a user to see details

### 7.2 Check Profiles
1. Go to **Table Editor** → **profiles**
2. You should see profile records
3. All fields should be populated

### 7.3 Check Storage
1. Go to **Storage** → **avatars**
2. If users uploaded photos, they'll appear here

---

## 🎯 Features Implemented

### ✅ Login Features
- Email/password authentication
- Form validation (email format, required fields)
- Error handling with user-friendly messages
- Loading states during authentication
- Session persistence (stay logged in)
- Auto-login on page revisit

### ✅ Signup Features
- Full name, email, phone collection
- Password confirmation validation
- Minimum password length (6 characters)
- Terms of service acceptance
- Profile photo upload (optional)
- Automatic profile creation in database
- Email verification (if enabled)

### ✅ Profile Features
- View and edit profile information
- Update name, phone, address
- Upload/change profile photo
- Image preview before upload
- Real-time UI updates
- Avatar display in navbar

### ✅ Security Features
- Row Level Security (RLS) enabled
- Users can only access their own data
- Secure password storage (Supabase handles)
- Session token management
- Protected routes and data

### ✅ UI/UX Features
- Clean modal with tabs
- Smooth transitions between login/signup
- Loading spinners during operations
- Success/error notifications
- Mobile-responsive design
- Active session indicator

---

## 📱 Mobile Integration

The authentication works seamlessly with the mobile bottom navigation:
- Tap **Account icon** → Opens login modal if not logged in
- Tap **Account icon** → Opens profile modal if logged in
- User avatar and name shown in desktop navbar
- Session persists across page reloads

---

## 🐛 Troubleshooting

### Issue: "Supabase not configured" warning
**Solution**: Update `supabase-config.js` with actual credentials

### Issue: Login fails with "Invalid credentials"
**Solution**: 
- Check if user exists in Supabase dashboard
- Verify email and password are correct
- Check browser console for errors

### Issue: Profile not created after signup
**Solution**:
- Verify SQL trigger was created successfully
- Check Supabase logs in Dashboard → Logs
- Ensure profiles table exists

### Issue: Image upload fails
**Solution**:
- Check `avatars` storage bucket exists
- Verify storage policies are set
- Check file size (max 5MB)
- Ensure file is an image

### Issue: Session not persisting
**Solution**:
- Check browser localStorage is enabled
- Verify `autoRefreshToken` is true in config
- Check console for session errors

---

## 🔒 Security Best Practices

1. **Never expose your service_role key** - only use anon key in frontend
2. **Enable email confirmation** for production
3. **Set up rate limiting** in Supabase dashboard
4. **Monitor authentication logs** regularly
5. **Use strong password policies**
6. **Enable 2FA** for admin accounts
7. **Regular security audits** of RLS policies

---

## 📊 Database Schema

```
profiles table:
┌──────────────┬──────────────┬─────────────────────────────────┐
│ Column       │ Type         │ Description                     │
├──────────────┼──────────────┼─────────────────────────────────┤
│ id           │ UUID         │ References auth.users.id        │
│ full_name    │ TEXT         │ User's full name                │
│ phone        │ TEXT         │ Phone number                    │
│ avatar_url   │ TEXT         │ Profile photo URL               │
│ address      │ TEXT         │ Street address                  │
│ city         │ TEXT         │ City                            │
│ state        │ TEXT         │ State                           │
│ pin_code     │ TEXT         │ Postal code                     │
│ created_at   │ TIMESTAMP    │ Account creation time           │
│ updated_at   │ TIMESTAMP    │ Last update time                │
└──────────────┴──────────────┴─────────────────────────────────┘
```

---

## 🎓 Next Steps

After authentication is working:
1. **Integrate with cart** - associate cart with user
2. **Order history** - track user orders in database
3. **Address book** - save multiple delivery addresses
4. **Wishlist** - user-specific product wishlists
5. **Email templates** - customize confirmation emails
6. **Password reset** - implement forgot password flow
7. **Social login** - add Google, Facebook, etc.

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- Authentication Guide: https://supabase.com/docs/guides/auth
- Discord Community: https://discord.supabase.com

---

## ✅ Completion Checklist

- [ ] Supabase account created
- [ ] Project created and credentials copied
- [ ] `supabase-config.js` updated with credentials
- [ ] Profiles table created with SQL
- [ ] Storage bucket `avatars` created
- [ ] Storage policies configured
- [ ] Email provider enabled
- [ ] Test user registered successfully
- [ ] Test user login successful
- [ ] Profile update working
- [ ] Logout working
- [ ] Session persistence verified
- [ ] Mobile navigation integration tested

---

**🎉 Once all steps are complete, your authentication system is fully operational!**
