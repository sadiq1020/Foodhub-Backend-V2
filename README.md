# 🍽️ FoodHub V2

A full-stack multi-role food delivery platform where customers can browse meals, place orders, and pay online — while providers list their meals and manage incoming orders, and admins oversee the entire platform.

---

## 🌐 Live URLs

| Service | URL |
|---|---|
| Frontend | https://foodhub-frontend-v2.vercel.app |
| Backend API | https://foodhub-backend-v2.onrender.com |

> **Note:** The backend is hosted on Render's free tier. If it hasn't received traffic recently, the first request may take 30–50 seconds to wake up.

---

## 📌 Project Description

FoodHub V2 is a complete food delivery web application with three distinct user roles:

- **Customers** can browse meals, search and filter by category or dietary preference, save favourites, add to cart, place orders, pay via Stripe, and leave reviews.
- **Providers** register their restaurant, wait for admin approval, then list meals and manage incoming orders with real-time status updates.
- **Admins** manage the entire platform — approving or rejecting providers, managing categories, viewing all orders and users, and suspending or activating accounts.

---

## ✨ Features

### Authentication & Security
- Email + password registration with **6-digit OTP email verification** (10-minute expiry)
- **Google OAuth** login for customers — works perfectly in local development. Currently disabled on the live version due to cross-domain cookie limitations between the free tiers of Render and Vercel.
- Forgot password / OTP reset flow
- Change password for logged-in users
- Role-based access control (CUSTOMER, PROVIDER, ADMIN)
- Suspended users cannot log in

### Core Backend Architecture
- Global error handler with `catchAsync` + `AppError` — centralized error handling across all controllers
- **Zod request validation middleware** — schema-based input validation on all routes
- **Env variable validation on boot** — server refuses to start if any required variable is missing
- `QueryBuilder` utility — search, filter, sort, and paginate on all list endpoints
- Standardized API response format: `{ success, message, data, meta }`

### Meals & Categories
- Providers can create, edit, and delete meals with **Cloudinary image uploads** (5MB limit, jpg/png/webp)
- Dietary tags, spice level, and availability toggle per meal
- Meals are blocked from going live until the provider is approved
- Admins manage categories with their own image uploads (2MB limit)
- Public meal and provider endpoints only return approved providers

### Orders & Payments
- Customers place orders from the cart with delivery address
- **Stripe hosted checkout** with webhook signature verification and idempotency via `stripeEventId`
- Order status flow: `PLACED → PREPARING → READY → DELIVERED → CANCELLED`
- **Auto-cancel cron job** — runs every 15 minutes, cancels PLACED + UNPAID orders older than 30 minutes

### Email Notifications
- OTP verification and password reset emails
- Order confirmation with payment link
- Payment success confirmation
- Order status update emails (PREPARING, READY, DELIVERED)
- Order cancellation notification

### Additional Features
- **File cleanup on request failure** — orphaned Cloudinary files deleted automatically via global error handler
- **Meal favourites / bookmarks** — customers can save, unsave, and list their favourite meals
- **Reviews** — customers can create, edit, and delete reviews on delivered orders (one review per meal per order)
- **Provider approval flow** — new providers start as PENDING; admin approves or rejects with a reason; rejected providers see the rejection reason on their dashboard
- **Pagination** on all list endpoints with `page`, `limit`, `total`, and `totalPages` metadata

---

## 🛠️ Technologies Used

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express + TypeScript | Server framework |
| Prisma ORM + PostgreSQL (Neon) | Database |
| Better Auth | Authentication + Google OAuth |
| Stripe | Payments + webhooks |
| Cloudinary | Image storage and transforms |
| Nodemailer | Email via Gmail SMTP |
| node-cron | Scheduled background jobs |
| Zod | Schema validation |
| Multer | File upload handling (memory storage) |

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) + TypeScript | React framework |
| Better Auth client | Session management |
| TanStack Query + custom `api.ts` | Data fetching |
| React Hook Form + Zod | Form validation |
| shadcn/ui + Tailwind CSS | UI components and styling |
| Zustand | Cart state (per-user localStorage) |
| Sonner | Toast notifications |
| Stripe.js | Payment redirect |

### Infrastructure
| Service | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| Neon | PostgreSQL database |
| Cloudinary | Image CDN |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database (or a Neon account)
- Cloudinary account
- Stripe account
- Gmail account with App Password enabled
- Google Cloud project with OAuth 2.0 credentials

---

### Backend Setup

**1. Clone the repository**
```bash
git clone https://github.com/sadiq1020/Foodhub-Backend-V2.git
cd Foodhub-Backend-V2
```

**2. Install dependencies**
```bash
npm install
```

**3. Create a `.env` file** in the root with the following variables:
```env
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=your_postgresql_connection_string

# Better Auth
BETTER_AUTH_SECRET=your_secret_key_min_32_chars
BETTER_AUTH_URL=http://localhost:5000

# Frontend URL (for CORS)
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=your_gmail@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin Seed
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=yourpassword
```

**4. Run database migrations and seed admin**
```bash
npx prisma migrate deploy
npm run seed:admin
```

**5. Start the development server**
```bash
npm run dev
```

The backend will be running at `http://localhost:5000`

---

### Frontend Setup

**1. Clone the repository**
```bash
git clone https://github.com/sadiq1020/Foodhub-Frontend-V2.git
cd Foodhub-Frontend-V2
```

**2. Install dependencies**
```bash
npm install
```

**3. Create a `.env.local` file** in the root:
```env
NODE_ENV=development

# Backend URL (used server-side for Next.js rewrites)
BACKEND_URL=http://localhost:5000

# Better Auth (must match backend secret exactly)
BETTER_AUTH_SECRET=your_secret_key_min_32_chars

# Public URLs (exposed to browser)
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
```

**4. Start the development server**
```bash
npm run dev
```

The frontend will be running at `http://localhost:3000`

---

### Stripe Webhook (Local Development)

To test Stripe payments locally, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:5000/webhook
```

Copy the `whsec_` secret it outputs and paste it into your `.env` as `STRIPE_WEBHOOK_SECRET`.

---

## 👤 Default Admin Credentials

After running `npm run seed:admin`, log in with the credentials you set in `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file.

---

## 📁 Repository Links

- **Frontend:** https://github.com/sadiq1020/Foodhub-Frontend-V2
- **Backend:** https://github.com/sadiq1020/Foodhub-Backend-V2
