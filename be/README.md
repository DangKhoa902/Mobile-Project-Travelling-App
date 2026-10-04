# Travel App Backend

Node.js API built with Express, TypeScript, Prisma 7, and MariaDB.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` for your MariaDB database.
3. Generate Prisma Client with `npm run db:generate`.
4. Create/apply the development migration with `npm run db:migrate -- --name init`.
5. Start the API with `npm run dev`.

The API listens on port `3000` by default (override with `PORT`). `GET /health` checks database connectivity.

For a production build, run `npm run build` and then `npm start`.
