# Email Confirmation Setup Guide

## Changes Made

✅ **Removed Google Sign-In**
- Removed all Google OAuth functionality from LoginScreen and RegisterScreen
- Removed Google sign-in buttons and related code

✅ **Enabled Email Confirmation**
- Updated `authService.ts` to enable email confirmation
- Users must now confirm their email before accessing the app

✅ **Updated Registration Form**
- Changed "Email Address" label to "Email"
- Added email confirmation modal after registration

✅ **Created HTML Email Template**
- Created `supabase_email_template.html` with a beautiful, responsive design
- Template displays the username (email) prominently

---

## Setting Up Email Template in Supabase

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Email Templates**

### Step 2: Update Confirmation Email Template

1. Find the **"Confirm signup"** template
2. Click **Edit** or **Customize**
3. Copy the entire content from `supabase_email_template.html`
4. Paste it into the template editor
5. Click **Save**

### Step 3: Enable Email Confirmation

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, make sure:
   - ✅ **Enable email confirmations** is **ON**
   - ✅ **Secure email change** is enabled (optional but recommended)
3. Click **Save**

### Step 4: Configure Email Settings

1. Go to **Settings** → **Auth**
2. Under **Email**, configure:
   - **SMTP Host**: (Use Supabase default or configure custom SMTP)
   - **SMTP Port**: (Default: 587)
   - **SMTP User**: (Your email service credentials)
   - **SMTP Password**: (Your email service password)
   - **Sender email**: (Email address that sends confirmation emails)
   - **Sender name**: `AquaNet`

---

## Email Template Variables

The template uses Supabase's built-in variables:
- `{{ .FullName }}` - User's full name
- `{{ .Email }}` - User's email address (displayed as username)
- `{{ .ConfirmationURL }}` - Link to confirm email

---

## How It Works

1. **User Registers:**
   - User fills out registration form
   - Clicks "Create Account"
   - Modal appears: "Check Your Email"

2. **Email Sent:**
   - Supabase sends confirmation email
   - Email contains beautiful HTML template
   - Shows username (email) prominently

3. **User Confirms:**
   - User clicks confirmation link in email
   - Account is activated
   - User can now log in

4. **User Logs In:**
   - User enters email and password
   - If email not confirmed, they'll see an error
   - After confirmation, login works normally

---

## Testing

1. Register a new account
2. Check your email inbox
3. You should see the beautiful HTML email
4. Click the confirmation link
5. Try logging in

---

## Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email logs: **Authentication** → **Users** → Click user → **Email Logs**

### Template Not Showing
- Make sure you saved the template in Supabase
- Check that HTML is properly formatted
- Verify template is set for "Confirm signup" type

### Confirmation Link Not Working
- Check that `emailRedirectTo` in `authService.ts` matches your Supabase callback URL
- Verify redirect URLs in Supabase: **Authentication** → **URL Configuration**

---

## Customization

You can customize the email template by editing `supabase_email_template.html`:
- Change colors (currently using AquaNet blue: `#0ea5e9`)
- Modify layout and spacing
- Add your logo
- Change text content

Then copy the updated HTML to Supabase email template editor.

---

## Notes

- The email template is responsive and works on mobile devices
- The username (email) is displayed prominently in a highlighted box
- The confirmation button is large and easy to click
- Alternative text link is provided if button doesn't work

