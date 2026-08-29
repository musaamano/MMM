const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetLog = require('../models/PasswordResetLog');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Find user by username (role is now optional)
    const query = { username };
    if (role) query.role = role;
    
    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Wrong password' });

    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/register (admin only in production)
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role, phone, department, employeeId } = req.body;

    if (!name || !username || !email || !password || !role) {
      return res.status(400).json({ message: 'name, username, email, password and role are required' });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      const field = exists.username === username ? 'Username' : 'Email';
      return res.status(400).json({ message: `${field} already exists` });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashed, role, phone, department, employeeId });
    await user.save();

    const { password: _pw, ...userOut } = user.toObject();
    res.status(201).json({ message: 'User created successfully', user: userOut });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with that email or username' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Log the password reset request
    const resetLog = new PasswordResetLog({
      user: user._id,
      token: hashedToken,
      tokenExpires: user.resetPasswordExpires,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    await resetLog.save();

    // In production, send email here
    // For now, just log the reset URL
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    console.log('Password Reset URL:', resetUrl);
    console.log('User:', user.email);

    res.json({ 
      message: 'Password reset link sent to your email',
      // Remove this in production
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/verify-reset-token/:token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    res.json({ message: 'Token is valid' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      // Mark as expired in log
      await PasswordResetLog.updateOne(
        { token: hashedToken },
        { status: 'expired' }
      );
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Update log status
    await PasswordResetLog.updateOne(
      { token: hashedToken },
      { status: 'completed', completedAt: new Date() }
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/reset-logs - Get password reset logs (Admin only)
router.get('/reset-logs', async (req, res) => {
  try {
    const logs = await PasswordResetLog.find()
      .populate('user', 'name email username')
      .sort({ requestedAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;