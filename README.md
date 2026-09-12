# Student Study Tracker Portal

A full-stack web application for college students and mentors to track study progress, habits, and provide mentorship.

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **Icons:** Lucide React
- **Backend:** Supabase (Authentication + PostgreSQL Database)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (for backend setup)

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd student-study-tracker
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

4. Start development server
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Project Structure

```
src/
├── assets/          # Static assets (images, fonts, etc.)
├── components/      # Reusable React components
├── context/         # React Context providers
├── hooks/           # Custom React hooks
├── layouts/         # Layout components (page wrappers)
├── lib/             # Library configurations (Supabase client, etc.)
├── pages/           # Page components organized by feature
│   ├── auth/        # Login, Signup pages
│   ├── student/     # Student dashboard pages
│   └── mentor/      # Mentor dashboard pages
├── routes/          # React Router configuration
├── services/        # API/service layer functions
├── styles/          # Additional CSS/Tailwind configurations
└── utils/           # Utility/helper functions
```

## Features (Planned)

### Student Features
- Track assignments and study work
- Create and track habits
- Write private journal entries
- View mentor remarks
- View overall progress

### Mentor Features
- View assigned students
- Review student progress
- Add remarks and ratings
- Assign additional work
- View journals (when permitted)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

## License

This project is for educational purposes.
