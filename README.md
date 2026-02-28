# Empire HQ

A centralized admin dashboard for monitoring and managing all Empire ventures.

## Features

- 🔐 **Google OAuth Authentication** - Secure login via Supabase Auth
- 📱 **Responsive Design** - Mobile-first with bottom tabs on mobile, sidebar on desktop
- 🎨 **Dark Admin Theme** - Sky Blue (#00A8E8) accent with dark backgrounds
- 🏢 **Multi-App Monitoring** - Dashboard overview of all ventures
- ⚡ **Real-time Updates** - Live status monitoring (coming soon)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Supabase Auth (Google OAuth)
- **Database**: Supabase (shared with vibeyap project)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Access to the vibeyap Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SaltyBallers/empire-hq.git
   cd empire-hq
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy the `.env.local.example` to `.env.local` and fill in the values:
   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xvdxuerzyscsoekwztbp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles with custom CSS variables
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Dashboard home page
│   ├── login/
│   │   └── page.tsx         # Google OAuth login page
│   ├── pipelines/
│   │   └── page.tsx         # Pipeline monitoring (placeholder)
│   ├── accounts/
│   │   └── page.tsx         # Account management (placeholder)
│   └── costs/
│       └── page.tsx         # Cost tracking (placeholder)
├── components/
│   ├── AppLayout.tsx        # Main app layout wrapper
│   └── Navigation.tsx       # Desktop sidebar + mobile bottom tabs
├── lib/
│   ├── supabase.ts          # Supabase client (browser)
│   └── supabase-server.ts   # Supabase client (server/middleware)
└── middleware.ts            # Auth middleware for route protection
```

## Key Features

### Authentication Flow
- Users must authenticate with Google OAuth to access the dashboard
- Unauthenticated users are automatically redirected to `/login`
- Session persistence handled via Supabase SSR cookies
- Logout functionality available in navigation

### Responsive Navigation
- **Desktop (≥1024px)**: Fixed sidebar with full navigation and logout
- **Mobile (<1024px)**: Header with logout + bottom tab navigation

### Theme & Styling
- Dark admin aesthetic with Sky Blue (#00A8E8) primary color
- Custom CSS variables for consistent theming
- Tailwind CSS v4 with inline theme configuration
- Mobile-first responsive design

## Deployment

### Vercel Deployment

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Set environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Configure domain** (if using custom domain like empire-hq.vercel.app)

### Supabase Configuration

The app uses the same Supabase project as vibeyap. Ensure the deployment URL is added to the Supabase Auth redirect allowlist:

```
https://empire-hq.vercel.app
```

## Development

### Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement changes
3. Test thoroughly
4. Submit PR for review
5. Deploy after approval

## Roadmap

- [ ] **Pipeline Dashboard** - GitHub Actions, Vercel deployments monitoring
- [ ] **Account Management** - Cross-platform user directory and permissions
- [ ] **Cost Tracking** - Vercel, Supabase, domain, and service cost analysis
- [ ] **Real-time Alerts** - Notifications for failures, budget overruns
- [ ] **Analytics Integration** - Usage metrics and performance monitoring

## Contributing

1. Follow the existing code style and patterns
2. Ensure responsive design works on both mobile and desktop
3. Test authentication flows thoroughly
4. Update documentation for new features

## License

Private project for Empire HQ internal use.