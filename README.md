# MeroHisab - Nepal MSME Accounting App

## Overview
MeroHisab is a secure, mobile-friendly web application designed for Nepal-based MSMEs (Micro, Small, and Medium Enterprises). It facilitates business registration, billing, expense tracking, and financial reporting with a focus on local compliance (PAN/VAT).

## Features
- **Dashboard**: Real-time financial overview with charts and compliance alerts.
- **Invoice Generator**: Create professional invoices with support for Cash, QR, and Card payments.
- **Bill Upload**: Extract data from receipts using your custom AI model.
- **Financial Reports**: View Profit & Loss, Cash Flow statements, and visual analytics.
- **Compliance**: Automatic detection of missing PAN on high-value transactions.
- **Admin Portal**: Verify businesses and manage system access.

## Architecture
- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT

## Setup & Running

### 1. Backend Setup (Database)
The application requires the backend server to be running first.

1.  Navigate to the `backend` folder.
2.  Follow the instructions in `backend/README.md` to:
    -   Install dependencies.
    -   Configure your PostgreSQL connection in `.env`.
    -   Run database migrations.
    -   Start the server.

### 2. Frontend Setup

If you are setting this up locally, initialize a Vite project and copy the files:

```bash
# Create a new Vite project
npm create vite@latest merohisab -- --template react-ts

# Navigate to the directory
cd merohisab

# Install dependencies
npm install lucide-react recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

*Note: Ensure your `tailwind.config.js` is configured to scan your source files.*

### 3. Running the App

```bash
npm run dev
```

Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Connecting Your Custom AI Model

This application is configured to connect to your own custom AI/OCR backend model for extracting bill details.

1.  Open `services/aiService.ts`.
2.  Update `CUSTOM_MODEL_API_URL` to point to your backend API (e.g., `http://localhost:8000/predict`).
3.  Set `USE_MOCK_DATA = false`.
4.  Ensure your backend accepts a JSON POST request with an `image` field (base64 extracted) and returns JSON matching the `ExtractedBillData` interface (or update the mapping logic in `services/aiService.ts`).
"# MeroHisab" 
