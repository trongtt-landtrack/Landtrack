# Rules.md

## 1. Project Overview
LandTrack is a real-time property management and tracking application built with React, Vite, Tailwind CSS, and Firebase.

## 2. Security Logic
- **Domain Locking:** Implemented in `src/main.tsx`. The app checks the current hostname against an `ALLOWED_DOMAINS` list. If the domain is not authorized, the user is redirected to `google.com`.
- **Firestore Security Rules:** Defined in `firestore.rules`.
    - **Default Deny:** All access is denied by default.
    - **Validation:** Strict validation for all collections (`projects`, `users`, `favorites`, `user_history`).
    - **Size Limits:** Enforced `size()` limits on all string fields to prevent DoS attacks.
    - **Immutable Fields:** Protected critical fields (e.g., `id`, `email`, `createdAt`, `uid`, `timestamp`) from being modified after creation.
    - **Ownership:** Enforced strict ownership checks for user-specific data.
    - **Role-Based Access:** Implemented `isSuperAdmin` and `isManagement` checks for sensitive operations.

## 3. Performance Logic
- **Lazy Loading:** Implemented in `src/App.tsx` using `React.lazy` and `Suspense` for main pages (`ProjectsPage`, `ProjectDetailPage`, `ProfilePage`, `AdminPage`, `LoginPage`).
- **Caching:** Memory cache duration for Google Sheets API data in `src/services/googleSheets.ts` is set to 15 minutes.

## 4. PWA Logic
- **Manifest:** Defined in `public/manifest.json`.
- **Installation Prompt:** Handled by `src/components/InstallPWA.tsx`, which listens for the `beforeinstallprompt` event.

## 5. UI/UX Logic
- **Mobile Optimization:** Unit data display in `src/components/UnitDataTab.tsx` uses card views for better readability on mobile devices.
- **Project Cards:** `src/components/ProjectCard.tsx` uses a modern card design with image-based branding and clear status badges.
