/**
 * Supabase Configuration
 * Initialize Supabase client for authentication and database
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
export const SUPABASE_CONFIG = {
    url: 'https://zbmoapgmnovzaadjpfwi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibW9hcGdtbm92emFhZGpwZndpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTQ5ODAsImV4cCI6MjA5NTE5MDk4MH0.z5EBr54syaTAL-19Dnk8q46jcJk1fMt_XHAAymjlPn8'
};

// Supabase client instance
let supabaseClient = null;

// Initialize Supabase client
export function initSupabase(url, anonKey) {
    // Check if credentials are configured
    if (url.includes('YOUR_PROJECT_ID') || anonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
        console.warn(' Supabase not configured!');
        console.warn('Please update supabase-config.js with your Supabase credentials.');
        console.warn('Get credentials from: https://app.supabase.com/project/_/settings/api');
        return null;
    }
    
    try {
        supabaseClient = createClient(url, anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
        
        console.log('✅ Supabase initialized successfully');
        console.log('🔗 Connected to:', url);
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        return null;
    }
}

// Get Supabase client instance
export function getSupabase() {
    if (!supabaseClient) {
        console.error('Supabase client not initialized. Call initSupabase() first.');
        return null;
    }
    return supabaseClient;
}

export default supabaseClient;
