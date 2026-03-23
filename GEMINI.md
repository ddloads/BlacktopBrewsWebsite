# Blacktop Brews Coffee Shop Website

A modern, dynamic website for **Blacktop Brews**, a mobile coffee trailer. This project features a high-performance frontend for customers and a comprehensive administrative dashboard for real-time content management.

## Project Overview

- **Purpose:** Provide a digital presence for a mobile coffee business, featuring a dynamic menu, location schedule, and event booking information.
- **Architecture:** Client-Server architecture using a Node.js/Express backend and a Vanilla JavaScript frontend.
- **Data Management:** Content is persisted in a JSON-based "database" with automatic backup cycles.
- **Key Features:**
    - Dynamic menu with categories and items.
    - Weekly schedule and location tracker.
    - Image gallery with auto-slide and upload capabilities.
    - Protected admin dashboard for site updates.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Storage:** File-based JSON (`data/site-data.json`)
- **Authentication:** Express-session with password protection
- **File Handling:** Multer (for image uploads)

## Getting Started

### Prerequisites
- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project
- **Development/Production:**
  ```bash
   npm start
   ```
- The server runs on `http://localhost:3000` by default.
- **Admin Access:** Navigate to `http://localhost:3000/admin.html`.
- **Default Admin Password:** `blacktopbrews2026` (Configurable via `ADMIN_PASSWORD` environment variable).

## Project Structure

- `server.js`: Main Express server and API implementation.
- `index.html`: Public-facing storefront.
- `admin.html`: Content management dashboard.
- `script.js`: Frontend logic for data fetching and rendering.
- `admin.js`: Administrative logic and API interactions.
- `styles.css` / `admin.css`: Visual styling.
- `data/`: 
    - `site-data.json`: Primary application state.
    - `site-data-backup-*.json`: Automated backups created during updates.
- `uploads/`: Repository for user-uploaded images (logo, gallery, etc.).

## Development Conventions

### Data Persistence
- **Always** use the API endpoints for updates to ensure data integrity and trigger backup creation.
- Data is structured hierarchically in `site-data.json`. Maintain the existing schema when adding new fields.

### Styling
- Adhere to the established CSS variable system in `styles.css` for consistent colors and spacing.
- Mobile-first responsive design is preferred.

### Authentication
- Security is handled via `express-session`. 
- Sensitive routes in `server.js` are protected by the `requireAuth` middleware.

### Backups
- The server automatically maintains the last 5 backups of the site data in the `data/` directory.

## Key API Endpoints

- `GET /api/data`: Fetch current site content (Public).
- `POST /api/login`: Authenticate admin session.
- `PUT /api/data`: Update entire site configuration (Protected).
- `POST /api/upload`: Upload single image to `/uploads` (Protected).
- `GET /api/uploads`: List all uploaded files (Protected).
