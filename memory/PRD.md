# Kopplingsguide - PRD

## Original Problem Statement
Bygg en app där användare loggar in via personlig kod. Efter inloggning får användaren tillgång till gemensam kod samt informationsblad för att koppla om vattnet i en fastighet.

## User Personas
1. **Fastighetsanvändare** - Boende som behöver access till nyckelskåp och instruktioner vid vattenpumpproblem
2. **Administratör** - Fastighetsförvaltare som skapar/hanterar åtkomstkoder och uppdaterar instruktioner

## Core Requirements (Static)
- [x] Inloggning med personlig kod för användare
- [x] Admin-inloggning med e-post/lösenord
- [x] Visa gemensam nyckelskåpskod efter inloggning
- [x] Steg-för-steg instruktioner med bilder
- [x] PDF-nedladdning (via print)
- [x] Admin: Skapa/redigera/ta bort åtkomstkoder
- [x] Admin: Uppdatera nyckelskåpskod och instruktioner

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT-baserad med httpOnly cookies
- **Design**: Swiss/High-Contrast theme (Chivo + IBM Plex fonts)

## What's Been Implemented (2026-03-28)
- User login page with personal code input
- Admin login page with email/password
- User dashboard with shared keybox code display
- Expandable instruction steps with images
- Admin dashboard with tabs for codes and settings
- Access code CRUD (create, read, update, delete, toggle active)
- Settings management (shared code, description, instruction steps)
- JWT authentication with cookies
- PDF download via browser print

## Prioritized Backlog
### P0 (Critical) - DONE
- All core features implemented

### P1 (Important)
- Proper PDF generation with jsPDF or similar
- Email notifications when codes are created
- Audit log for admin actions

### P2 (Nice to have)
- QR code for instructions
- Multiple language support
- Dark mode

## Next Tasks
1. Add proper PDF generation library
2. Add audit logging
3. Consider adding email notifications
