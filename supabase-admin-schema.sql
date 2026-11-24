-- Supabase Database Schema for Nilco Bags Admin Panel
-- Run this in your Supabase SQL Editor
-- This script will set up the database schema safely

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create admin_profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Store password directly (for simpler auth)
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'admin', 'super_admin'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Remove foreign key constraint to auth.users (using standalone auth)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_profiles_id_fkey'
    ) THEN
        ALTER TABLE admin_profiles 
        DROP CONSTRAINT admin_profiles_id_fkey;
    END IF;
END
$$;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    discount_percentage INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    images TEXT[], -- Array of image URLs
    thumbnail_url VARCHAR(500),
    sizes TEXT[], -- Array of available sizes
    colors TEXT[], -- Array of available colors
    rating DECIMAL(3, 2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

-- Create audit_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login'
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'admin_profile', etc.
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON admin_profiles(email);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_is_active ON admin_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON admin_profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Drop and recreate triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON admin_profiles;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create 'products' storage bucket for product photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for 'products' bucket
DROP POLICY IF EXISTS "Public Access for products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload for products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for products bucket" ON storage.objects;

CREATE POLICY "Public Access for products bucket" ON storage.objects
    FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Public Upload for products bucket" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "Public Update for products bucket" ON storage.objects
    FOR UPDATE USING (bucket_id = 'products');

CREATE POLICY "Public Delete for products bucket" ON storage.objects
    FOR DELETE USING (bucket_id = 'products');

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can insert admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can update admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can delete admin profiles" ON admin_profiles;

DROP POLICY IF EXISTS "Admins can view all products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Authenticated admins can view products" ON products;

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

-- Admin profiles policies (simplified for standalone auth)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_profiles' 
        AND policyname = 'Admins can view all admin profiles'
    ) THEN
        CREATE POLICY "Admins can view all admin profiles" ON admin_profiles
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_profiles' 
        AND policyname = 'Admins can insert admin profiles'
    ) THEN
        CREATE POLICY "Admins can insert admin profiles" ON admin_profiles
            FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_profiles' 
        AND policyname = 'Admins can update admin profiles'
    ) THEN
        CREATE POLICY "Admins can update admin profiles" ON admin_profiles
            FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_profiles' 
        AND policyname = 'Admins can delete admin profiles'
    ) THEN
        CREATE POLICY "Admins can delete admin profiles" ON admin_profiles
            FOR DELETE USING (true);
    END IF;
END $$;

-- Products policies
DO $$
BEGIN
    -- Public read access for client site (active products only)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Public can view active products'
    ) THEN
        CREATE POLICY "Public can view active products" ON products
            FOR SELECT USING (is_active = true);
    END IF;

    -- Admins can view all products (including inactive)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Admins can view all products'
    ) THEN
        CREATE POLICY "Admins can view all products" ON products
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Admins can insert products'
    ) THEN
        CREATE POLICY "Admins can insert products" ON products
            FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Admins can update products'
    ) THEN
        CREATE POLICY "Admins can update products" ON products
            FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Admins can delete products'
    ) THEN
        CREATE POLICY "Admins can delete products" ON products
            FOR DELETE USING (true);
    END IF;
END $$;

-- Audit log policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_log' 
        AND policyname = 'Admins can view audit logs'
    ) THEN
        CREATE POLICY "Admins can view audit logs" ON audit_log
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_log' 
        AND policyname = 'System can insert audit logs'
    ) THEN
        CREATE POLICY "System can insert audit logs" ON audit_log
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Function to handle new user signup and create admin profile
-- Note: This trigger will be created but needs to be enabled via Supabase Dashboard
-- or using the service role. For now, we'll create the profile manually or via signup.

-- Create a function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    admin_id_val UUID;
    new_data_json JSONB;
    old_data_json JSONB;
BEGIN
    -- Skip audit logging if no admin context (e.g., direct SQL execution)
    admin_id_val := auth.uid();
    
    IF admin_id_val IS NULL THEN
        -- No authenticated user, skip logging
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Convert records to JSONB to safely check for fields
    IF TG_OP = 'INSERT' THEN
        new_data_json := to_jsonb(NEW);
        -- Try to get created_by from the record if it exists
        admin_id_val := COALESCE((new_data_json->>'created_by')::UUID, auth.uid());
        
        IF admin_id_val IS NOT NULL THEN
            INSERT INTO audit_log (admin_id, action, entity_type, entity_id, new_data)
            VALUES (
                admin_id_val,
                'create',
                TG_TABLE_NAME,
                NEW.id,
                row_to_json(NEW)
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        new_data_json := to_jsonb(NEW);
        old_data_json := to_jsonb(OLD);
        -- Try to get updated_by from the record if it exists
        admin_id_val := COALESCE((new_data_json->>'updated_by')::UUID, auth.uid());
        
        IF admin_id_val IS NOT NULL THEN
            INSERT INTO audit_log (admin_id, action, entity_type, entity_id, old_data, new_data)
            VALUES (
                admin_id_val,
                'update',
                TG_TABLE_NAME,
                NEW.id,
                row_to_json(OLD),
                row_to_json(NEW)
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        old_data_json := to_jsonb(OLD);
        -- Try to get updated_by from the record if it exists
        admin_id_val := COALESCE((old_data_json->>'updated_by')::UUID, auth.uid());
        
        IF admin_id_val IS NOT NULL THEN
            INSERT INTO audit_log (admin_id, action, entity_type, entity_id, old_data)
            VALUES (
                admin_id_val,
                'delete',
                TG_TABLE_NAME,
                OLD.id,
                row_to_json(OLD)
            );
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers for audit logging
DROP TRIGGER IF EXISTS log_products_changes ON products;
DROP TRIGGER IF EXISTS log_admin_profiles_changes ON admin_profiles;

CREATE TRIGGER log_products_changes
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Note: Disabled trigger on admin_profiles since it doesn't have created_by/updated_by fields
-- CREATE TRIGGER log_admin_profiles_changes
--     AFTER INSERT OR UPDATE OR DELETE ON admin_profiles
--     FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- IMPORTANT: To enable automatic admin profile creation when users sign up:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Database > Triggers
-- 3. Create a new trigger on auth.users table (after insert)
-- 4. Use this SQL in the trigger function body:
--    INSERT INTO admin_profiles (id, email, full_name, role, is_active)
--    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'), COALESCE(NEW.raw_user_meta_data->>'role', 'admin'), true);

-- NOTE: To create the initial admin user, use Supabase Dashboard:
-- 1. Go to Authentication > Users in your Supabase dashboard
-- 2. Click "Add user"
-- 3. Email: admin@nilcobags.com
-- 4. Password: admin123
-- 5. User metadata: {"full_name": "Super Admin", "role": "super_admin"}
-- 6. Click "Create user"
-- 7. Then manually create the admin profile by running:
--    INSERT INTO admin_profiles (id, email, full_name, role, is_active)
--    SELECT id, email, 'Super Admin', 'super_admin', true FROM auth.users WHERE email = 'admin@nilcobags.com';

-- RECOMMENDED METHOD: Create admin user using Supabase Auth functions
-- This uses Supabase's built-in auth.signup function which handles proper password hashing

-- First, drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS log_admin_profiles_changes ON admin_profiles;

DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Try to sign up the user using Supabase Auth
    -- This will create the user in auth.users with proper password hashing
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@nilcobags.com';
    
    IF user_id IS NULL THEN
        -- Create user using auth.signup (requires service role)
        -- Note: This function may not be available directly in SQL
        -- Alternative: Use the HTTP endpoint or Supabase Dashboard
        
        -- For SQL-only approach, we'll use bcrypt password hashing
        -- Password: nilco@2026
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'admin@nilcobags.com',
            crypt('nilco@2026', gen_salt('bf')), -- bcrypt password hashing
            NOW(),
            '{"full_name": "Super Admin", "role": "super_admin"}',
            NOW(),
            NOW()
        ) RETURNING id INTO user_id;
        
        -- Create admin profile
        INSERT INTO admin_profiles (id, email, full_name, role, is_active)
        VALUES (user_id, 'admin@nilcobags.com', 'Super Admin', 'super_admin', true);
        
        RAISE NOTICE 'Admin user created successfully with ID: %', user_id;
        RAISE NOTICE 'Email: admin@nilcobags.com';
        RAISE NOTICE 'Password: nilco@2026';
    ELSE
        -- Update existing admin profile if user exists
        INSERT INTO admin_profiles (id, email, full_name, role, is_active)
        VALUES (user_id, 'admin@nilcobags.com', 'Super Admin', 'super_admin', true)
        ON CONFLICT (id) DO UPDATE SET
            role = 'super_admin',
            is_active = true,
            full_name = 'Super Admin';
        
        RAISE NOTICE 'Admin profile updated for existing user with ID: %', user_id;
    END IF;
END $$;

-- BEST PRACTICE: Use Supabase Dashboard to create the user with a proper password
-- Then run this SQL to create the admin profile:
--
-- STEPS:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user"
-- 3. Email: admin@nilcobags.com
-- 4. Password: nilco@2026
-- 5. User metadata: {"full_name": "Super Admin", "role": "super_admin"}
-- 6. Click "Create user"
-- 7. Then run the SQL below to create the admin profile

INSERT INTO admin_profiles (id, email, full_name, role, is_active)
SELECT id, email, 'Super Admin', 'super_admin', true
FROM auth.users
WHERE email = 'admin@nilcobags.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    full_name = 'Super Admin';

-- DEBUG: Check if admin profile exists
SELECT 
    u.id as user_id,
    u.email as user_email,
    ap.id as profile_id,
    ap.email as profile_email,
    ap.full_name,
    ap.role,
    ap.is_active
FROM auth.users u
LEFT JOIN admin_profiles ap ON u.id = ap.id
WHERE u.email = 'admin@nilcobags.com';

-- TEMPORARY FIX: Disable RLS temporarily to create admin profile
ALTER TABLE admin_profiles DISABLE ROW LEVEL SECURITY;

-- Force create/update admin profile
INSERT INTO admin_profiles (id, email, full_name, role, is_active)
SELECT id, email, 'Super Admin', 'super_admin', true
FROM auth.users
WHERE email = 'admin@nilcobags.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    full_name = 'Super Admin';

-- Re-enable RLS
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Verify the profile was created
SELECT * FROM admin_profiles WHERE email = 'admin@nilcobags.com';

-- FIX: Drop any problematic triggers on auth.users that might prevent user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- STANDALONE AUTH: Create admin user directly in admin_profiles table
-- This bypasses Supabase Auth entirely for simpler development
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Check if admin already exists
    SELECT id INTO admin_id FROM admin_profiles WHERE email = 'admin@nilcobags.com';

    IF admin_id IS NULL THEN
        -- Create new admin user directly
        admin_id := gen_random_uuid();
        INSERT INTO admin_profiles (id, email, password, full_name, role, is_active)
        VALUES (
            admin_id,
            'admin@nilcobags.com',
            'nilco@2026',
            'Super Admin',
            'super_admin',
            true
        );
        RAISE NOTICE 'Admin user created successfully';
    ELSE
        -- Update existing admin
        UPDATE admin_profiles
        SET
            password = 'nilco@2026',
            full_name = 'Super Admin',
            role = 'super_admin',
            is_active = true
        WHERE id = admin_id;
        RAISE NOTICE 'Admin user updated successfully';
    END IF;
END $$;

-- Verify admin user creation
SELECT * FROM admin_profiles WHERE email = 'admin@nilcobags.com';

-- Alternative: Create user directly via SQL using service role
-- This bypasses the Dashboard user creation issues
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@nilcobags.com';

    IF user_id IS NULL THEN
        -- Create user using Supabase's internal function (requires service role)
        -- This is a workaround for Dashboard user creation issues
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@nilcobags.com',
            '', -- Empty password - will need to be reset
            NOW(),
            '{"full_name": "Super Admin", "role": "super_admin"}',
            NOW(),
            NOW(),
            NOW()
        ) RETURNING id INTO user_id;

        RAISE NOTICE 'User created with ID: %', user_id;
        RAISE NOTICE 'IMPORTANT: You need to reset the password via Supabase Dashboard';
    ELSE
        RAISE NOTICE 'User already exists with ID: %', user_id;
    END IF;
END $$;

-- NEW: Create admin user directly in admin_profiles table with password
-- This is simpler and doesn't require Supabase Auth
DO $$
BEGIN
    INSERT INTO admin_profiles (id, email, password, full_name, role, is_active)
    VALUES (
        gen_random_uuid(),
        'admin@nilcobags.com',
        'nilco@2026', -- Plain text password (for development only)
        'Super Admin',
        'super_admin',
        true
    )
    ON CONFLICT (email) DO UPDATE SET
        password = 'nilco@2026',
        role = 'super_admin',
        is_active = true,
        full_name = 'Super Admin';

    RAISE NOTICE 'Admin user created/updated in admin_profiles table';
    RAISE NOTICE 'Email: admin@nilcobags.com';
    RAISE NOTICE 'Password: nilco@2026';
END $$;