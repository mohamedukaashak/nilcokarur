# Nilco Bags Admin Panel Setup Guide

## Overview
This guide will help you set up the complete Admin Panel for Nilco Bags with Supabase authentication integration.

## Prerequisites
- Node.js and npm installed
- Supabase account (free tier works)
- Basic knowledge of SQL and database management

## Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready (2-3 minutes)
4. Go to Project Settings > API to get your credentials

### 2. Update Supabase Configuration
Update `src/js/supabase-config.js` with your Supabase credentials:

```javascript
export const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 3. Run Database Schema
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-admin-schema.sql`
4. Click "Run" to execute the schema

This will create:
- `admin_profiles` table (linked to Supabase Auth)
- `products` table (for product management)
- `audit_log` table (for tracking admin actions)
- Proper indexes and security policies
- Triggers for automatic profile creation
- Function to create initial admin user

### 4. Create Initial Admin User
After running the schema, create the default admin user by running this SQL command in the SQL Editor:

```sql
SELECT create_initial_admin();
```

This will create:
- Email: `admin@nilcobags.com`
- Password: `admin123`
- Role: Super Admin

## Admin Panel Files Created

### 1. Admin Login Page
- **File**: `src/admin-login.html`
- **Purpose**: Secure login interface for admin users
- **Features**: 
  - Modern design matching the main site
  - Supabase Auth integration
  - Email/password authentication
  - Session management
  - Error handling

### 2. Admin Dashboard
- **File**: `src/admin-dashboard.html`
- **Purpose**: Main admin interface
- **Features**:
  - Responsive sidebar navigation
  - Dashboard statistics
  - Product management (CRUD)
  - Admin user management
  - Clean, professional design

### 3. Admin Authentication Module
- **File**: `src/js/admin-auth.js`
- **Purpose**: Handle admin authentication using Supabase Auth
- **Features**:
  - Supabase Auth integration
  - Secure login verification
  - Session management via Supabase
  - Admin profile verification
  - Action logging

### 4. Admin Dashboard Module
- **File**: `src/js/admin-dashboard.js`
- **Purpose**: Handle all admin operations
- **Features**:
  - Product CRUD operations
  - Admin user management via Supabase Auth
  - Statistics display
  - Form validation
  - Modal handling

## Access the Admin Panel

### Default Admin Credentials
- **Email**: admin@nilcobags.com
- **Password**: admin123
- **Note**: These credentials are stored in Supabase Auth, not in a custom table

### Access URLs
- **Admin Login**: http://localhost:3201/admin-login.html
- **Admin Dashboard**: http://localhost:3201/admin-dashboard.html
- **Main Website**: http://localhost:3201/index.html

## Features Overview

### Product Management
- **Add Products**: Create new bag products with all details
- **Edit Products**: Modify existing product information
- **Delete Products**: Remove products from the catalog
- **Product Fields**: Name, category, price, stock, images, sizes, colors, description, featured status

### Admin User Management
- **Add Admin Users**: Create new admin accounts
- **Edit Admin Users**: Modify admin user details
- **Delete Admin Users**: Remove admin access
- **Role Management**: Admin vs Super Admin roles
- **Activity Tracking**: View admin login history

### Dashboard Statistics
- Total products count
- Total admin users count
- Product categories count
- Recent activity tracking

### Security Features
- Password hashing (SHA-256)
- Session management via localStorage
- Admin access verification
- Action logging (audit trail)
- Row-level security policies

## Design Consistency

The admin panel is designed to match the existing Nilco Bags website:

- **Color Scheme**: Uses the same green (#16a34a) primary color
- **Typography**: Same Inter font family
- **Components**: Consistent buttons, forms, cards
- **Layout**: Professional sidebar-based layout
- **Responsive**: Mobile-friendly design
- **Styling**: Matches the clean, modern aesthetic

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Access Admin Panel
- Navigate to admin-login.html
- Login with default credentials
- Access the dashboard

### 3. Make Changes
- Edit admin files as needed
- Changes will auto-reload via BrowserSync

### 4. Test Functionality
- Test login/logout
- Test product CRUD operations
- Test admin user management
- Verify security features

## Production Deployment

### 1. Build for Production
```bash
npm run build
```

### 2. Deploy
- Upload the `dist` folder to your hosting
- Ensure Supabase credentials are properly configured
- Update default admin password in production

### 3. Security Considerations
- Change default admin password immediately
- Use environment variables for Supabase credentials
- Implement proper password hashing (bcrypt) in production
- Enable SSL/HTTPS
- Set up proper CORS policies in Supabase

## Troubleshooting

### Login Issues
- Verify Supabase credentials in supabase-config.js
- Check if admin user exists in database
- Ensure password hash matches
- Check browser console for errors

### Database Issues
- Verify SQL schema was executed successfully
- Check RLS policies are properly configured
- Ensure admin user exists and is active

### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check that Bootstrap is loaded
- Verify CSS files are being served correctly

### JavaScript Errors
- Check browser console for specific errors
- Verify all JS files are being loaded
- Ensure Supabase client is initialized
- Check for network connectivity issues

## Customization

### Add New Features
1. Add new sections to admin-dashboard.html
2. Create corresponding JS functions in admin-dashboard.js
3. Update navigation in the sidebar
4. Add database tables if needed
5. Update RLS policies

### Modify Design
- CSS is in `<style>` tags within HTML files
- Uses Tailwind CSS utility classes
- Bootstrap components for modals and forms
- Custom admin-specific styles in each file

### Extend Functionality
- Add image upload capability
- Implement advanced filtering/search
- Add export functionality
- Create reports and analytics
- Add email notifications

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Supabase configuration
3. Review the SQL schema
4. Check network connectivity
5. Ensure all dependencies are installed

## Notes

- The admin panel is completely separate from the client authentication
- Admin users are stored in a separate table from regular users
- All admin actions are logged for audit purposes
- The design is responsive and works on mobile devices
- No client-side functionality is affected by the admin panel