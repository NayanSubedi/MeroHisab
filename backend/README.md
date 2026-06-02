# Dainikhisab Backend Setup

This is the backend service for Dainikhisab, built with Node.js, Express, Prisma, and PostgreSQL.

## Prerequisites

1.  **Node.js**: Version 16 or higher.
2.  **PostgreSQL**: You must have a PostgreSQL database server running locally or in the cloud.

## Installation & Setup

### 1. Install Dependencies
Navigate to the backend folder and install the required packages:

```bash
cd backend
npm install
```

### 2. Configure Database Connection
Create a `.env` file in the `backend` root directory:

```bash
touch .env
```

Open `.env` and add the following configuration. Replace `user`, `password`, and `dbname` with your PostgreSQL credentials:

```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
DATABASE_URL="postgresql://postgres:password@localhost:5432/dainikhisab?schema=public"

# Secret key for signing JWT tokens (Change this to a long random string)
JWT_SECRET="your-super-secret-key-change-this"

# Admin Credentials
ADMIN_IDENTIFIER="admin"
ADMIN_PASSWORD="admin123"
```

### 3. Initialize Database (Run Migrations)
This command will create the tables defined in `prisma/schema.prisma` in your PostgreSQL database:

```bash
npx prisma migrate dev --name init
```

*If you see an error, ensure your PostgreSQL server is running and the credentials in `.env` are correct.*

### 4. Start the Server
Run the development server:

```bash
npx ts-node src/server.ts
```

The server will start at `http://192.168.1.64:5000`.

## API Endpoints

-   **POST** `/api/auth/register`: Register a new business (starts as Unverified).
-   **POST** `/api/auth/login`: Login for Owners and Admins.
-   **GET** `/api/admin/businesses`: (Admin Only) View all registered businesses.
-   **PATCH** `/api/admin/verify/:id`: (Admin Only) Verify or unverify a business.
-   **DELETE** `/api/admin/business/:id`: (Admin Only) Remove a business.

## Admin Access
Admin credentials are now managed via the `.env` file (`ADMIN_IDENTIFIER` and `ADMIN_PASSWORD`). 
Ensure these are set before attempting to log in as an administrator.
