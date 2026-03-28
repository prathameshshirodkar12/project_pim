# PIM Project (Node + React + WooCommerce)

## Overview
Full-stack Product Information Management (PIM) app:
- Backend: Node.js + Express + MongoDB + Mongoose
- Frontend: React + Axios
- WooCommerce sync on product creation

## Structure
```
PIMproject/
  backend/
    server.js
    models/Product.js
    routes/productRoutes.js
    package.json
    .env.example
  frontend/
    public/index.html
    src/App.js
    src/App.css
    src/index.js
    package.json
  README.md
```

## Setup
1) Ensure MongoDB is running.
   - easiest: run `mongod --dbpath C:\data\db` (create folder first)
   - or start service as admin: `Start-Process powershell -Verb runAs` then `net start MongoDB`
   - or docker: `docker run -d -p 27017:27017 --name mongodb mongo:6`

2) Backend
```powershell
cd C:\Users\prath\OneDrive\Desktop\PIMproject\backend
npm install
copy .env.example .env
# (edit .env with your values)
npm run dev
```

3) Frontend
```powershell
cd C:\Users\prath\OneDrive\Desktop\PIMproject\frontend
npm install
npm start
```

## API
- `GET /api/health`
- `POST /api/products`
- `GET /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## WooCommerce
Set in `.env`:
- `WOO_BASE_URL`
- `WOO_CONSUMER_KEY`
- `WOO_CONSUMER_SECRET`

Behavior:
- `POST /api/products` creates the local product and attempts WooCommerce sync
- `PUT /api/products/:id` updates the local product and syncs the linked WooCommerce item when available
- `DELETE /api/products/:id` deletes the linked WooCommerce item first, then removes the local product
- if WooCommerce credentials are missing, local CRUD still works and the API returns a clear `wooSkipped` reason

## Troubleshooting
- `System error 5` when starting service: use admin shell or `mongod` direct.
- Ensure server shows `MongoDB connected` then `Server running on port 5000`.
- CORS is enabled by default.
