# Required Dependencies for Authentication

Run these commands to install the required dependencies for authentication:

## Core Supabase Dependencies
```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage
```

## If you don't have these navigation dependencies already:
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs
```

## For Expo projects, also install:
```bash
npx expo install react-native-safe-area-context react-native-screens
```

## Environment Setup

1. Create a `.env` file in your project root:
```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. Update `app/services/authService.ts` with your actual Supabase credentials:
```typescript
const SUPABASE_URL = 'your-supabase-url-here';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key-here';
```

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the SQL script from `supabase_schema.sql` in your Supabase SQL editor
3. Get your project URL and anon key from Settings > API
4. Update the credentials in your authService.ts file
