-- ============================================
-- SUPABASE DATABASE SETUP FOR FRESHCART
-- Run these queries in Supabase SQL Editor
-- ============================================
-- IMPORTANT: Run ALL of these queries in order!
-- ============================================

-- 1. CREATE PROFILES TABLE
-- ============================================
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

-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE SECURITY POLICIES FOR PROFILES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 4. CREATE TRIGGER FOR AUTO PROFILE CREATION
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to create profile when user signs up
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

-- Trigger to call the function on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================
-- Note: First create the 'avatars' bucket manually in Storage dashboard

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

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
        AND auth.uid() = (SELECT owner FROM storage.objects WHERE id = id)
    );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid() = (SELECT owner FROM storage.objects WHERE id = id)
    );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if profiles table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'profiles';

-- Check if policies are created
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- END OF SETUP
-- ============================================
