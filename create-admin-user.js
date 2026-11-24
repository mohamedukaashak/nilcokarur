// Create Admin User for Nilco Bags Admin Panel
// Run this script with: node create-admin-user.js
// Make sure you have your Supabase credentials in .env or update them below

const { createClient } = require('@supabase/supabase-js');

// Update these with your Supabase project credentials
const SUPABASE_URL = 'https://bakiycsjweenjxxncsdk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE';

// Admin user details
const ADMIN_EMAIL = 'admin@nilcobags.com';
const ADMIN_PASSWORD = 'nilco@2026';
const ADMIN_FULL_NAME = 'Super Admin';
const ADMIN_ROLE = 'super_admin';

async function createAdminUser() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Creating admin user...');

    // Create user in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_FULL_NAME,
        role: ADMIN_ROLE
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return;
    }

    console.log('User created successfully:', userData.user.id);

    // Create admin profile
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .insert({
        id: userData.user.id,
        email: ADMIN_EMAIL,
        full_name: ADMIN_FULL_NAME,
        role: ADMIN_ROLE,
        is_active: true
      })
      .select();

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      return;
    }

    console.log('Admin profile created successfully!');
    console.log('You can now login with:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Admin Panel: http://localhost:3200/admin-login.html`);

  } catch (error) {
    console.error('Error:', error);
  }
}

createAdminUser();
