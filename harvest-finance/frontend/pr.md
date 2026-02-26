# feat: Build Authentication UI Components

Closes #4

## Summary

Implements complete authentication UI with login, signup (with role selection), and forgot password pages. Includes form validation with Zod, JWT token storage with Zustand, password strength indicator, and protected route wrapper.

## Changes

### New Files

| File | Description |
|------|-------------|
| `src/lib/validations/auth.ts` | Zod schemas for login, signup, and forgot-password forms with password strength utility |
| `src/lib/stores/auth-store.ts` | Zustand auth store with JWT localStorage persistence and mock API actions |
| `src/components/auth/ProtectedRoute.tsx` | Protected route wrapper — redirects unauthenticated users to `/login` |
| `src/components/auth/PasswordStrength.tsx` | Visual password strength indicator with 4 color-coded bars |
| `src/app/signup/page.tsx` | Signup page with role selection cards (Farmer 🌾 / Buyer 🛒 / Inspector 🔍) |
| `src/app/forgot-password/page.tsx` | Forgot password flow with email input → success confirmation |

### Modified Files

| File | Description |
|------|-------------|
| `src/app/login/page.tsx` | Full rewrite with react-hook-form + Zod validation, auth store integration, show/hide password toggle |
| `src/app/layout.tsx` | Updated metadata title and description |

## Features

- ✅ Login form with validation and JWT token storage
- ✅ Signup form with Zod validation and password strength indicator
- ✅ Role selection (Farmer / Buyer / Inspector) as interactive cards
- ✅ "Forgot Password" flow (email → success message)
- ✅ Error handling and display with alert banners
- ✅ Protected route wrapper with redirect to login
- ✅ Loading states with spinners on all form submissions
- ✅ Mobile-responsive forms
- ✅ Accessibility (ARIA labels, `role="alert"`, `aria-invalid`, `aria-busy`)
- ✅ No backend integration (mock API calls)

## Testing

- `npm run build` passes with exit code 0
- All 3 auth pages compile and render correctly
- Form validation errors display on empty/invalid submissions
- Password strength indicator updates in real-time

## Screenshots

<!-- Add screenshots of /login, /signup, and /forgot-password here -->
