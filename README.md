# SmartPark Frontend

A smart parking management web app that links credit cards with vehicle license plates, providing real-time parking availability through a 3D digital twin viewer.

## Tech Stack

- **React 19** + **Vite** — fast dev/build 
- **React Three Fiber** + **Three.js** + **Drei** — 3D parking lot visualization
- **React Router** — client side routing with protected routes
- **Socket.io** — near real-time parking slot updates
- **Lucide React** — icons

## Pages

| Route | Description |
|---|---|
| `/login` | Login |
| `/register` | Register (name, email, password, gender, birthday) |
| `/` | Home dashboard — cards, privilege programs, quick actions |
| `/availability` | 3D parking lot viewer with real-time slot status |
| `/edit` | My Cards — list all linked credit cards |
| `/edit/card/:cardId` | Card detail — view/edit/delete linked vehicles |
| `/edit/add-card` | Add new card (3-step wizard) |
| `/profile` | Edit user profile (name, gender, birthday) |
| `/history` | Parking session history |
| `/admin` | Admin dashboard — sensor logs (admin role only) |

## Running

```bash
# Install dependencies
npm i

# Start dev server (proxies /api to localhost:3000)
npm run dev

# Production build
npm run build
```

## Environment Variables

`VITE_API_URL`  Backend API base URL. Leave empty in dev (Vite proxy handles it). Set to backend URL in production. 
