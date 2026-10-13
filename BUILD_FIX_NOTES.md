GOCHATI BUILD FIX

Restored missing Gochati source files and static assets referenced by the routes:
- src/components/gochat-shell.tsx
- src/routes/chat.$personId.tsx
- src/lib/gochat-data.ts and src/lib/gochat-sound.ts
- src/assets/benjamin.jpg, mia.jpg, adam.jpg, elizabeth.jpg

The TanStack route tree includes /chat/$personId. Verify with `bun run build` before production deployment.
