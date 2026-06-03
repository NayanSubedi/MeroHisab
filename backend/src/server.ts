// @ts-nocheck
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
// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/dainikhisab?directConnection=true';

// ==========================================
// 2. MONGOOSE CONNECTION
// ==========================================
mongoose.connect(DATABASE_URL)
  .then(() => console.log('✅ Connected to MongoDB via Mongoose'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 3. MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Token Error:", err);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireAdmin = async (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// ==========================================
// 4. ROUTES
// ==========================================
app.get('/', (req, res) => {
    res.send("Dainikhisab Backend is Running. API endpoints are at /api/...");
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (identifier === ADMIN_IDENTIFIER && password === ADMIN_PASSWORD) {
     const token = jwt.sign({ id: 'admin-id', role: 'ADMIN', name: 'Super Admin' }, JWT_SECRET, { expiresIn: '12h' });
     return res.json({ token, user: { name: 'Super Admin', role: 'ADMIN', email: 'admin@dainikhisab.com' }, business: null });
  }

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
    const { password: _, ...safeUser } = user;
    safeUser.id = user._id; // Front-end compatibility

    if (business) business.id = business._id;

    res.json({ token, user: safeUser, business });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// --- User Profile Routes ---
app.put('/api/user/profile', authenticate, async (req, res) => {
  const { 
      name, email, newPassword, businessName, addressLine1, addressLine2, 
      city, province, country, zipCode, logo, taxSystem, annualTurnover
  } = req.body;

  try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: 'Session expired.' });

      const updateData = { name, email };
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
      
      const { password: _, ...safeUser } = updatedUser;
      safeUser.id = safeUser._id;
      res.json({ message: 'Profile updated', user: safeUser, business: updatedBusiness });
  } catch (error) {
      res.status(500).json({ message: 'Failed to update profile' });
  }
});

// --- Transaction Routes ---
app.get('/api/transactions', authenticate, async (req, res) => {
    try {
        if (!req.user.businessId) return res.json([]);
        const transactions = await Transaction.find({ businessId: req.user.businessId }).sort({ date: -1 });
        
        // Map _id to id for frontend
        const formatted = transactions.map(t => ({...t.toObject(), id: t._id}));
        res.json(formatted);
    } catch (error) { res.status(500).json({ message: 'Error fetching transactions' }); }
});

app.post('/api/transactions', authenticate, async (req, res) => {
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

app.put('/api/transactions/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, amount, ...updateData } = req.body;

        const updated = await Transaction.findOneAndUpdate(
            { _id: id, businessId: req.user.businessId },
            { ...updateData, amount: parseFloat(amount), date: new Date(date) },
            { new: true }
        );
        res.json({ ...updated.toObject(), id: updated._id });
    } catch (error) { res.status(500).json({ message: 'Error updating transaction' }); }
});

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
    try {
        const tx = await Transaction.findOneAndDelete({ _id: req.params.id, businessId: req.user.businessId });
        if (!tx) return res.status(404).json({ message: 'Transaction not found' });
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) { res.status(500).json({ message: 'Error deleting transaction' }); }
});

// --- Staff/User Management ---
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const users = await User.find({ businessId: req.user.businessId }).lean();
        const safeUsers = users.map(u => { const { password, ...rest } = u; return { ...rest, id: u._id }; });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching staff' }); }
});

app.post('/api/users', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Restricted' });
        const { name, email, phone, role, password } = req.body;
        
        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) return res.status(400).json({ message: 'User exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await User.create({ 
            name, email, phone, password: hashedPassword, role, 
            businessId: req.user.businessId, status: 'Active'
        });

        const { password: _, ...safeUser } = newUser.toObject();
        safeUser.id = safeUser._id;
        res.json(safeUser);
    } catch (error) { res.status(500).json({ message: 'Error creating user' }); }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Restricted' });
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot delete self' });
        
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) { res.status(500).json({ message: 'Error deleting user' }); }
});

// --- Admin Routes ---
app.get('/api/admin/businesses', authenticate, requireAdmin, async (req, res) => {
    try {
        const businesses = await Business.find().sort({ createdAt: -1 }).lean();
        res.json(businesses.map(b => ({ ...b, id: b._id })));
    } catch (error) { res.status(500).json({ message: 'Error fetching businesses' }); }
});

app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'ADMIN' }).populate('businessId').sort({ createdAt: -1 }).lean();
        const safeUsers = users.map(u => { 
            const { password, ...rest } = u; 
            return { ...rest, business: u.businessId, id: u._id }; 
        });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching users' }); }
});

app.post('/api/admin/create-admin', authenticate, requireAdmin, async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await User.create({
            name, email, phone, password: hashedPassword, role: UserRole.ADMIN, status: 'Active'
        });

        const { password: _, ...safeUser } = newAdmin.toObject();
        safeUser.id = safeUser._id;
        res.json(safeUser);
    } catch (error) { res.status(500).json({ message: 'Error creating admin' }); }
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'You cannot delete your own account.' });

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'User deleted successfully' });
    } catch (error) { res.status(500).json({ message: 'Error deleting user.' }); }
});

app.patch('/api/admin/users/:id/password', authenticate, requireAdmin, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });

        res.json({ message: 'Password updated successfully' });
    } catch (error) { res.status(500).json({ message: 'Error updating password' }); }
});

app.get('/api/admin/business/:id/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ businessId: req.params.id }).sort({ createdAt: -1 }).lean();
        const safeUsers = users.map(u => { const { password, ...rest } = u; return { ...rest, id: u._id }; });
        res.json(safeUsers);
    } catch (error) { res.status(500).json({ message: 'Error fetching business users' }); }
});

app.patch('/api/admin/verify/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { isVerified, rejectionReason } = req.body;
        const updateData = { isVerified };

        if (isVerified) updateData.rejectionReason = null; 
        else if (rejectionReason) updateData.rejectionReason = rejectionReason;

        const updated = await Business.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ ...updated.toObject(), id: updated._id });
    } catch (error) { res.status(500).json({ message: 'Error updating status' }); }
});

app.delete('/api/admin/business/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        // FindOneAndDelete triggers the middleware we set up to cascade delete users & transactions
        await Business.findOneAndDelete({ _id: req.params.id });
        res.json({ message: 'Business removed' });
    } catch (error) { res.status(500).json({ message: 'Error removing business' }); }
});

// Catch-All 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});