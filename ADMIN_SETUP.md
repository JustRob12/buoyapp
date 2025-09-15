# Admin Dashboard Setup Guide

This guide explains how to set up the admin dashboard with role-based access control for the BuoyApp.

## Database Schema Changes

The user profile system now supports three roles:
- **Role 0**: Admin (can access all features + manage accounts)
- **Role 1**: Researcher (approved users, can access the app)
- **Role 2**: Pending (newly registered users waiting for approval)

### Required Database Updates

Run the following SQL commands in your Supabase SQL editor to update the existing schema:

```sql
-- Update the role column constraint to allow role 2
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (0, 1, 2));

-- Update the default role to 2 (pending)
ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 2;
```

### Update the trigger function
```sql
-- Update the handle_new_user function to default to role 2
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, fullname, username, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'fullname', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::INTEGER, 2) -- Default to pending
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## How to Create an Admin User

### Option 1: Manual Database Update
1. Register a new account through the app
2. In Supabase dashboard, go to Table Editor > user_profiles
3. Find your user record and change the `role` from `2` to `0`

### Option 2: SQL Command
```sql
-- Replace 'your-user-id' with the actual user ID from auth.users
UPDATE public.user_profiles 
SET role = 0 
WHERE id = 'your-user-id';
```

## Features

### For Regular Users (Role 2 - Pending)
- Can register for an account
- See a "Pending Approval" screen after login
- Must wait for admin approval to access the app

### For Approved Users (Role 1 - Researcher)
- Full access to all app features
- Can view and edit their profile
- Standard user experience

### For Admins (Role 0 - Admin)
- All researcher features
- Additional "Manage Accounts" option in profile dropdown
- Can approve or reject pending user registrations
- Can see list of all pending users with registration details

## User Flow

1. **New User Registration**:
   - User registers → Gets role 2 (pending)
   - Success message mentions waiting for admin approval
   - User can log in but sees "Pending Approval" screen

2. **Admin Approval Process**:
   - Admin logs in → Sees "Manage Accounts" in profile menu
   - Admin views pending users with their details
   - Admin can approve (changes role to 1) or reject (deletes account)

3. **Approved User Experience**:
   - User logs in → Gets full access to the app
   - Normal app functionality available

## Security Notes

- Row Level Security (RLS) policies ensure users can only see their own data
- Admins have special permissions to view all user profiles
- Pending users cannot access main app features
- User role changes are logged and auditable

## Troubleshooting

### User Stuck in Pending State
- Check if admin properly approved the user (role should be 1)
- Verify database constraints are properly set
- User may need to log out and back in for role changes to take effect

### Admin Can't See Manage Accounts
- Verify admin user has role 0 in the database
- Check that ProfileDropdown component is properly imported
- Ensure user profile is loaded correctly in AuthContext
