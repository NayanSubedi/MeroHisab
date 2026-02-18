
// @ts-nocheck
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// FIX: Use const objects instead of enums
export const BusinessType = {
  SOLE_PROPRIETOR: 'SOLE_PROPRIETOR',
  PARTNERSHIP: 'PARTNERSHIP',
  PVT_LTD: 'PVT_LTD'
};

export const UserRole = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  ACCOUNTANT: 'ACCOUNTANT',
  STAFF: 'STAFF'
};

const prisma = new PrismaClient();
const app = express();
// Cloud providers set the PORT env variable. Default to 5000 locally.
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Token Error:", err);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireAdmin = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// --- Routes ---

// 1. Auth Routes
app.post('/api/auth/register', async (req: any, res: any) => {
  const { 
    businessName, pan, ownerName, phone, email, type, password, panPhoto,
    addressLine1, addressLine2, city, province, country, zipCode,
    taxSystem, annualTurnover, enableBiometricLogin
  } = req.body;

  try {
    const existingBusiness = await prisma.business.findUnique({ where: { pan } });
    if (existingBusiness) return res.status(400).json({ message: 'Business with this PAN already exists' });

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (existingUser) return res.status(400).json({ message: 'User email or phone already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const formattedAddress = `${addressLine1}, ${city}, ${province}`;

    let businessType = BusinessType.SOLE_PROPRIETOR;
    if (type === 'Pvt Ltd') businessType = BusinessType.PVT_LTD;
    if (type === 'Partnership') businessType = BusinessType.PARTNERSHIP;

    await prisma.$transaction(async (tx: any) => {
      const business = await tx.business.create({
        data: {
          name: businessName, pan, address: formattedAddress,
          addressLine1, addressLine2, city, province, country, zipCode,
          ownerName, phone, email,
          type: businessType,
          isVerified: false, // Manual verification required
          panPhoto: panPhoto || null,
          // New tax fields
          taxSystem: taxSystem || 'PAN',
          annualTurnover: annualTurnover || 0,
          // App Settings
          enableBiometricLogin: enableBiometricLogin || false
        }
      });

      await tx.user.create({
        data: {
          name: ownerName, email, phone, password: hashedPassword,
          role: UserRole.OWNER, 
          businessId: business.id
        }
      });
    });

    res.status(201).json({ message: 'Registration successful. Account pending verification.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  const { identifier, password } = req.body;

  // Super Admin Check
  if (identifier === ADMIN_IDENTIFIER && password === ADMIN_PASSWORD) {
     const token = jwt.sign({ id: 'admin-id', role: 'ADMIN', name: 'Super Admin' }, JWT_SECRET, { expiresIn: '12h' });
     return res.json({ 
       token, 
       user: { name: 'Super Admin', role: 'ADMIN', email: 'admin@merohisab.com' },
       business: null
     });
  }

  try {
    const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { phone: identifier }] }
    });

    if (!user) return res.status(400).json({ message: 'User not found' });

    let business = null;
    if (user.businessId) {
        business = await prisma.business.findUnique({ where: { id: user.businessId } });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.role === 'OWNER' && business && !business.isVerified) {
        return res.status(403).json({ 
            message: 'Your business is pending verification.',
            code: 'PENDING_VERIFICATION'
        });
    }

    const token = jwt.sign({ id: user.id, role: user.role, businessId: user.businessId }, JWT_SECRET, { expiresIn: '12h' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser, business });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// 2. User Profile Routes
app.put('/api/user/profile', authenticate, async (req: any, res: any) => {
  const { 
      name, email, newPassword, 
      businessName, addressLine1, addressLine2, city, province, country, zipCode, logo,
      taxSystem, annualTurnover, enableBiometricLogin
  } = req.body;

  try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(401).json({ message: 'Session expired.' });

      const updateData: any = { name, email };
      if (newPassword && newPassword.trim() !== '') {
          updateData.password = await bcrypt.hash(newPassword, 10);
      }
      const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData
      });

      let updatedBusiness = null;
      if (user.role === 'OWNER' && user.businessId) {
          const formattedAddress = `${addressLine1}, ${city}, ${province}`;
          updatedBusiness = await prisma.business.update({
              where: { id: user.businessId },
              data: {
                  name: businessName, address: formattedAddress,
                  addressLine1, addressLine2, city, province, country, zipCode,
                  logo,
                  taxSystem, annualTurnover,
                  enableBiometricLogin
              }
          });
      }
      const { password: _, ...safeUser } = updatedUser;
      res.json({ message: 'Profile updated', user: safeUser, business: updatedBusiness });
  } catch (error) {
      res.status(500).json({ message: 'Failed to update profile' });
  }
});

// 3. Transaction Routes
app.get('/api/transactions', authenticate, async (req: any, res: any) => {
    try {
        if (!req.user.businessId) return res.json([]);
        const transactions = await prisma.transaction.findMany({ 
            where: { businessId: req.user.businessId }, 
            orderBy: { date: 'desc' } 
        });
        res.json(transactions);
    } catch (error) { res.status(500).json({ message: 'Error fetching transactions' }); }
});

app.post('/api/transactions', authenticate, async (req: any, res: any) => {
    try {
        const { id, date, amount, vatAmount, ...rest } = req.body;

        if (!req.user.businessId) return res.status(400).json({ message: 'No business linked to user' });
        
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) {
            return res.status(400).json({ message: 'Valid amount is required' });
        }

        const numericVat = vatAmount ? parseFloat(vatAmount) : 0;

        const transaction = await prisma.transaction.create({ 
            data: { 
                ...rest,
                amount: numericAmount,
                vatAmount: numericVat,
                date: new Date(date), 
                businessId: req.user.businessId 
            } 
        });
        res.json(transaction);
    } catch (error: any) { 
        console.error("Transaction Error:", error.message);
        res.status(500).json({ message: 'Error saving transaction: ' + error.message }); 
    }
});

app.delete('/api/transactions/:id', authenticate, async (req: any, res: any) => {
    try {
        if (!req.user.businessId) return res.status(403).json({ message: 'Unauthorized' });

        const transaction = await prisma.transaction.findFirst({
            where: { id: req.params.id, businessId: req.user.businessId }
        });

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        await prisma.transaction.delete({ where: { id: req.params.id } });
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error("Delete Error", error);
        res.status(500).json({ message: 'Error deleting transaction' });
    }
});

// 4. Staff/User Management Routes (Owner Only)
app.get('/api/users', authenticate, async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({ where: { businessId: req.user.businessId } });
        const safeUsers = users.map((u: any) => { const { password, ...rest } = u; return rest; });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching staff' }); }
});

app.post('/api/users', authenticate, async (req: any, res: any) => {
    try {
        if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Restricted' });
        const { name, email, phone, role, password } = req.body;
        
        const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
        if (existing) return res.status(400).json({ message: 'User exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.user.create({ 
            data: { 
                name, email, phone, password: hashedPassword, role, 
                businessId: req.user.businessId, status: 'Active'
            } 
        });
        const { password: _, ...safeUser } = newUser;
        res.json(safeUser);
    } catch (error) { res.status(500).json({ message: 'Error creating user' }); }
});

app.delete('/api/users/:id', authenticate, async (req: any, res: any) => {
    try {
        if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Restricted' });
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot delete self' });
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted' });
    } catch (error) { res.status(500).json({ message: 'Error deleting user' }); }
});

// 5. Admin Routes (Restricted)
app.get('/api/admin/businesses', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const businesses = await prisma.business.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(businesses);
    } catch (error) { res.status(500).json({ message: 'Error fetching businesses' }); }
});

app.get('/api/admin/users', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        // FILTER: Only return admins, exclude business owners/staff
        const users = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            include: { business: true },
            orderBy: { createdAt: 'desc' }
        });
        const safeUsers = users.map((u: any) => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching users' }); }
});

app.post('/api/admin/create-admin', authenticate, requireAdmin, async (req: any, res: any) => {
    const { name, email, phone, password } = req.body;
    try {
        const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
        if (existing) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.user.create({
            data: {
                name, email, phone, password: hashedPassword,
                role: UserRole.ADMIN,
                status: 'Active'
            }
        });
        const { password: _, ...safeUser } = newAdmin;
        res.json(safeUser);
    } catch (error) {
        console.error("Create Admin Error:", error);
        res.status(500).json({ message: 'Error creating admin' });
    }
});

app.get('/api/admin/business/:id/users', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({
            where: { businessId: req.params.id },
            orderBy: { createdAt: 'desc' }
        });
        const safeUsers = users.map((u: any) => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching business users' });
    }
});

app.patch('/api/admin/verify/:id', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const updated = await prisma.business.update({ where: { id: req.params.id }, data: { isVerified: req.body.isVerified } });
        res.json(updated);
    } catch (error) { res.status(500).json({ message: 'Error updating status' }); }
});

app.delete('/api/admin/business/:id', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        await prisma.business.delete({ where: { id: req.params.id } });
        res.json({ message: 'Business removed' });
    } catch (error) { res.status(500).json({ message: 'Error removing business' }); }
});

// --- Catch-All 404 Handler ---
// IMPORTANT: This must be the LAST route defined
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://192.168.1.64:${PORT}`);
});