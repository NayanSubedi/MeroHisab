
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import Models & Enums
import Business, { BusinessType } from './models/Business';
import User, { UserRole } from './models/User';
import Transaction from './models/Transaction';
import AuditLog, { AuditAction } from './models/AuditLog';
// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!JWT_SECRET || !DATABASE_URL || !ADMIN_IDENTIFIER || !ADMIN_PASSWORD) {
  console.error("FATAL ERROR: Missing critical environment variables.");
  process.exit(1);
}

// ==========================================
// 2. MONGOOSE CONNECTION & DB SEED
// ==========================================
mongoose.connect(DATABASE_URL)
  .then(async () => {
    console.log('✅ Connected to MongoDB via Mongoose');
    
    // Seed initial Super Admin if none exists
    try {
      const adminExists = await User.findOne({ role: 'ADMIN' });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await User.create({
          name: 'Super Admin',
          email: ADMIN_IDENTIFIER,
          phone: '0000000000',
          password: hashedPassword,
          role: UserRole.ADMIN,
          status: 'Active'
        });
        console.log(`✅ Seeded default Super Admin (${ADMIN_IDENTIFIER})`);
      }
    } catch (e) {
      console.error('❌ Failed to seed admin:', e);
    }
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 3. MIDDLEWARE
// ==========================================
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));

const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verify user actually still exists in DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User account has been deleted' });
    }

    // If the user belongs to a business, verify the business still exists
    if (user.businessId) {
       const business = await Business.findById(user.businessId);
       if (!business) {
         return res.status(401).json({ message: 'Business account has been deleted' });
       }
    }

    req.user = { ...decoded, name: user.name };
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

// ==========================================
// 4. ROUTES
// ==========================================
app.get('/', (req: any, res: any) => {
    res.send("Dainikhisab Backend is Running. API endpoints are at /api/...");
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req: any, res: any) => {
  const { 
    businessName, pan, ownerName, phone, email, type, password, panPhoto,
    addressLine1, addressLine2, city, province, country, zipCode,
    taxSystem, annualTurnover
  } = req.body;

  try {
    const existingBusiness = await Business.findOne({ pan });
    if (existingBusiness) return res.status(400).json({ message: 'Business with this PAN already exists' });

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) return res.status(400).json({ message: 'User email or phone already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const formattedAddress = `${addressLine1}, ${city}, ${province}`;

    let businessType = BusinessType.SOLE_PROPRIETOR;
    if (type === 'Pvt Ltd') businessType = BusinessType.PVT_LTD;
    if (type === 'Partnership') businessType = BusinessType.PARTNERSHIP;

    try {
      const newBusiness = await Business.create({
        name: businessName, pan, address: formattedAddress,
        addressLine1, addressLine2, city, province, country, zipCode,
        ownerName, phone, email, type: businessType,
        isVerified: false, panPhoto: panPhoto || null,
        taxSystem: taxSystem || 'PAN', annualTurnover: annualTurnover || 0
      });

      await User.create({
        name: ownerName, email, phone, password: hashedPassword,
        role: UserRole.OWNER, businessId: newBusiness._id
      });

      res.status(201).json({ message: 'Registration successful. Account pending verification.' });
    } catch (txErr) {
      throw txErr;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).lean();
    if (!user) return res.status(400).json({ message: 'User not found' });

    let business = null;
    if (user.businessId) {
        business = await Business.findById(user.businessId).lean();
    }

    if (user.role === 'OWNER' && !business) {
        return res.status(400).json({ message: 'Critical Error: Attached Business Profile could not be found. Please register a new account or contact support.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.role === 'OWNER' && business && !business.isVerified) {
        return res.status(403).json({ message: 'Your business is pending verification.', code: 'PENDING_VERIFICATION' });
    }

    const token = jwt.sign({ id: user._id, role: user.role, businessId: user.businessId }, JWT_SECRET, { expiresIn: '12h' });
    const safeUser: any = Object.assign({}, (user as any)._doc || user);
    delete safeUser.password;
    safeUser.id = (user as any)._id; // Front-end compatibility

    if (business) (business as any).id = (business as any)._id;

    res.json({ token, user: safeUser, business });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// --- User Profile Routes ---
app.get('/api/user/profile', authenticate, async (req: any, res: any) => {
  try {
      const user = await User.findById(req.user.id).lean();
      if (!user) return res.status(401).json({ message: 'User not found. Session invalid.' });
      
      let business = null;
      if (user.businessId) {
          business = await Business.findById(user.businessId).lean();
      }

      const getBusinessType = (t: string) => {
          if (t === 'PVT_LTD') return 'Pvt Ltd';
          if (t === 'PARTNERSHIP') return 'Partnership';
          return 'Sole Proprietor';
      };

      const profile = {
          id: business ? business._id : 'admin',
          name: business ? business.name : user.name,
          pan: business ? business.pan : 'N/A',
          address: business ? business.address : 'N/A',
          addressLine1: business?.addressLine1,
          addressLine2: business?.addressLine2,
          city: business?.city,
          province: business?.province,
          country: business?.country,
          zipCode: business?.zipCode,
          logo: business?.logo,
          ownerName: user.name,
          email: user.email,
          phone: user.phone || '',
          type: business ? getBusinessType(business.type) : 'Sole Proprietor',
          role: user.role,
          isVerified: business ? business.isVerified : true,
          taxSystem: business?.taxSystem || 'PAN',
          annualTurnover: business?.annualTurnover || 0
      };

      res.json({ profile });
  } catch (error) {
      console.error("Profile Fetch Error:", error);
      res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', authenticate, async (req: any, res: any) => {
  const { 
      name, email, newPassword, businessName, addressLine1, addressLine2, 
      city, province, country, zipCode, logo, taxSystem, annualTurnover
  } = req.body;

  try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: 'Session expired.' });

      const updateData: any = { name, email };
      if (newPassword && newPassword.trim() !== '') {
          updateData.password = await bcrypt.hash(newPassword, 10);
      }
      
      const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).lean();

      let updatedBusiness = null;
      if (user.role === 'OWNER' && user.businessId) {
          const formattedAddress = `${addressLine1}, ${city}, ${province}`;
          updatedBusiness = await Business.findByIdAndUpdate(
              user.businessId,
              {
                  name: businessName, address: formattedAddress, addressLine1, addressLine2, 
                  city, province, country, zipCode, logo, taxSystem, annualTurnover
              },
              { new: true }
          ).lean();
      }
      
      const safeUser: any = Object.assign({}, updatedUser);
      delete safeUser.password;
      safeUser.id = safeUser._id;
      res.json({ message: 'Profile updated', user: safeUser, business: updatedBusiness });
  } catch (error) {
      res.status(500).json({ message: 'Failed to update profile' });
  }
});

// --- Transaction Routes ---
app.get('/api/transactions', authenticate, async (req: any, res: any) => {
    try {
        if (!req.user.businessId) return res.json([]);
        const transactions = await Transaction.find({ businessId: req.user.businessId }).sort({ date: -1 });
        
        // Map _id to id for frontend
        const formatted = transactions.map(t => ({...t.toObject(), id: t._id}));
        res.json(formatted);
    } catch (error) { res.status(500).json({ message: 'Error fetching transactions' }); }
});

app.post('/api/transactions', authenticate, async (req: any, res: any) => {
    try {
        const { id, date, amount, vatAmount, ...rest } = req.body;

        if (!req.user.businessId) return res.status(400).json({ message: 'No business linked to user' });
        
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) return res.status(400).json({ message: 'Valid amount is required' });

        const transaction = await Transaction.create({ 
            ...rest, amount: numericAmount, vatAmount: vatAmount ? parseFloat(vatAmount) : 0,
            date: new Date(date), businessId: req.user.businessId 
        });

        res.json({ ...transaction.toObject(), id: transaction._id });
    } catch (error) { res.status(500).json({ message: 'Error saving transaction: ' + error.message }); }
});

app.put('/api/transactions/:id', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { date, amount, vatAmount, ...updateData } = req.body;

        const updated = await Transaction.findOneAndUpdate(
            { _id: id, businessId: req.user.businessId },
            { ...updateData, amount: parseFloat(amount), vatAmount: vatAmount ? parseFloat(vatAmount) : 0, date: new Date(date) },
            { new: true }
        );
        res.json({ ...updated.toObject(), id: updated._id });
    } catch (error) { res.status(500).json({ message: 'Error updating transaction' }); }
});

app.delete('/api/transactions/:id', authenticate, async (req: any, res: any) => {
    try {
        const tx = await Transaction.findOneAndDelete({ _id: req.params.id, businessId: req.user.businessId });
        if (!tx) return res.status(404).json({ message: 'Transaction not found' });
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) { res.status(500).json({ message: 'Error deleting transaction' }); }
});

// --- Staff/User Management ---
app.get('/api/users', authenticate, async (req: any, res: any) => {
    try {
        const users = await User.find({ businessId: req.user.businessId }).lean();
        const safeUsers = users.map(u => { const { password, ...rest } = u; return { ...rest, id: u._id }; });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching staff' }); }
});

app.post('/api/users', authenticate, async (req: any, res: any) => {
    try {
        if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Restricted' });
        const { name, email, phone, role, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: 'All fields (name, email, phone, password) are required.' });
        }
        
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: `A user with email "${email}" already exists.` });

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) return res.status(400).json({ message: `A user with phone "${phone}" already exists.` });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await User.create({ 
            name, email, phone, password: hashedPassword, role, 
            businessId: req.user.businessId, status: 'Active'
        });

        const safeUser: any = Object.assign({}, newUser.toObject());
        delete safeUser.password;
        safeUser.id = safeUser._id;
        res.json(safeUser);
    } catch (error) { res.status(500).json({ message: 'Error creating user' }); }
});

app.delete('/api/users/:id', authenticate, async (req: any, res: any) => {
    try {
        if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Restricted' });
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot delete self' });
        
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: 'User not found' });
        if (userToDelete.businessId?.toString() !== req.user.businessId?.toString()) {
           return res.status(403).json({ message: 'Cannot delete users from other businesses.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) { res.status(500).json({ message: 'Error deleting user' }); }
});

// --- Admin Routes ---
app.get('/api/admin/businesses', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const businesses = await Business.find().sort({ createdAt: -1 }).lean();
        res.json(businesses.map(b => ({ ...b, id: b._id })));
    } catch (error) { res.status(500).json({ message: 'Error fetching businesses' }); }
});

app.get('/api/admin/users', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const users = await User.find({ role: 'ADMIN' }).populate('businessId').sort({ createdAt: -1 }).lean();
        const safeUsers = users.map(u => { 
            const safeU = Object.assign({}, u) as any;
            delete safeU.password;
            return { ...safeU, business: u.businessId, id: u._id }; 
        });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching users' }); }
});

app.post('/api/admin/create-admin', authenticate, requireAdmin, async (req: any, res: any) => {
    const { name, email, phone, password } = req.body;
    try {
        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await User.create({
            name, email, phone, password: hashedPassword, role: UserRole.ADMIN, status: 'Active'
        });

        const safeUser: any = Object.assign({}, newAdmin.toObject());
        delete safeUser.password;
        safeUser.id = safeUser._id;

        await AuditLog.create({
            adminId: req.user.id, adminName: req.user.name,
            action: AuditAction.CREATE_ADMIN,
            details: `Created new admin account: ${name}`,
            targetId: newAdmin._id.toString()
        });

        res.json(safeUser);
    } catch (error) { res.status(500).json({ message: 'Error creating admin' }); }
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'You cannot delete your own account.' });

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await AuditLog.create({
            adminId: req.user.id, adminName: req.user.name,
            action: AuditAction.DELETE_USER,
            details: `Deleted user: ${user.name} (${user.email})`,
            targetId: req.params.id
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) { res.status(500).json({ message: 'Error deleting user.' }); }
});

app.patch('/api/admin/users/:id/password', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });

        await AuditLog.create({
            adminId: req.user.id, adminName: req.user.name,
            action: AuditAction.CHANGE_PASSWORD,
            details: `Changed password for user ID: ${req.params.id}`,
            targetId: req.params.id
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) { res.status(500).json({ message: 'Error updating password' }); }
});

app.get('/api/admin/business/:id/users', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const users = await User.find({ businessId: req.params.id }).sort({ createdAt: -1 }).lean();
        const safeUsers = users.map(u => { 
            const safeU = Object.assign({}, u) as any;
            delete safeU.password;
            return { ...safeU, id: u._id }; 
        });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching business users' }); }
});

app.patch('/api/admin/verify/:id', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const { isVerified, rejectionReason } = req.body;
        const updateData: any = { isVerified };

        if (isVerified) updateData.rejectionReason = null; 
        else if (rejectionReason) updateData.rejectionReason = rejectionReason;

        const updated = await Business.findByIdAndUpdate(req.params.id, updateData, { new: true });

        await AuditLog.create({
            adminId: req.user.id, adminName: req.user.name,
            action: isVerified ? AuditAction.VERIFY_BUSINESS : AuditAction.REJECT_BUSINESS,
            details: isVerified ? `Verified business: ${updated.name}` : `Rejected business: ${updated.name} (Reason: ${rejectionReason})`,
            targetId: req.params.id
        });

        res.json({ ...(updated as any).toObject(), id: (updated as any)._id });
    } catch (error) { res.status(500).json({ message: 'Error updating status' }); }
});

app.delete('/api/admin/business/:id', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        // FindOneAndDelete triggers the middleware we set up to cascade delete users & transactions
        const deletedBusiness = await Business.findOneAndDelete({ _id: req.params.id });
        if (deletedBusiness) {
            await AuditLog.create({
                adminId: req.user.id, adminName: req.user.name,
                action: AuditAction.DELETE_BUSINESS,
                details: `Deleted business: ${deletedBusiness.name} (PAN: ${deletedBusiness.pan})`,
                targetId: req.params.id
            });
        }
        res.json({ message: 'Business removed' });
    } catch (error) { res.status(500).json({ message: 'Error removing business' }); }
});

app.get('/api/admin/audit-logs', authenticate, requireAdmin, async (req: any, res: any) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
        res.json(logs.map(log => ({ ...log, id: log._id })));
    } catch (error) { res.status(500).json({ message: 'Error fetching audit logs' }); }
});

// --- Dev Seed Routes ---
app.post('/api/dev/seed-sample-data', async (req: any, res: any) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ message: 'businessId query param required' });

        const business = await Business.findById(businessId);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        // Delete existing transactions for a clean slate
        await Transaction.deleteMany({ businessId });

        const transactionsToInsert = [];
        const today = new Date();
        
        // Generate for last 20 months
        for (let m = 20; m >= 0; m--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 15);
            const isDashain = monthDate.getMonth() === 9; // Oct
            const isYearEnd = monthDate.getMonth() === 11; // Dec
            
            // Base revenue: 150k + up to 50k variance
            let monthlyRevenue = 150000 + (Math.random() * 50000);
            if (isDashain) monthlyRevenue *= 1.4; // 40% bump
            if (isYearEnd) monthlyRevenue *= 1.25; // 25% bump
            
            // Base expense: 90k + up to 20k variance
            let monthlyExpense = 90000 + (Math.random() * 20000);
            if (isDashain) monthlyExpense *= 1.3;
            
            // Generate multiple smaller transactions per month instead of one big one
            
            // --- Sales ---
            const numSales = Math.floor(Math.random() * 6) + 8; // 8-13 sales per month
            for (let i = 0; i < numSales; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                transactionsToInsert.push({
                    date,
                    type: 'SALES',
                    category: 'Sales Revenue',
                    amount: monthlyRevenue / numSales,
                    vatAmount: (monthlyRevenue / numSales) * 0.13,
                    partyName: `Customer ${Math.floor(Math.random() * 100) + 1}`,
                    businessId,
                    createdAt: date
                });
            }
            
            // --- Expenses ---
            const expenseTypes = [
                { cat: 'Office Supplies', share: 0.1 },
                { cat: 'Utilities', share: 0.2 },
                { cat: 'Rent', share: 0.4 },
                { cat: 'Miscellaneous', share: 0.3 }
            ];
            
            for (const et of expenseTypes) {
                const day = Math.floor(Math.random() * 28) + 1;
                const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                transactionsToInsert.push({
                    date,
                    type: 'EXPENSE',
                    category: et.cat,
                    amount: monthlyExpense * et.share,
                    partyName: `${et.cat} Vendor`,
                    businessId,
                    createdAt: date
                });
            }
        }

        await Transaction.insertMany(transactionsToInsert);
        res.json({ message: `Seeded ${transactionsToInsert.length} sample transactions spanning 18 months.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to seed data' });
    }
});

// Catch-All 404 Handler
app.use((req: any, res: any) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});