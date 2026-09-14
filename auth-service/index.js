const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/auth-db')
  .then(() => console.log('Auth Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Auth Service running' }));

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, data: null, message: 'All fields required' });
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(409).json({ success: false, data: null, message: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '7d' });
    
    res.status(201).json({
      success: true,
      data: { token, userId: user._id, username: user.username, email: user.email },
      message: 'Account created successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    const user = await User.findOne({ $or: [{ email }, { username: email }, { username }] });
    if (!user) return res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '7d' });
    
    res.status(200).json({
      success: true,
      data: { token, userId: user._id, username: user.username, email: user.email },
      message: 'Login successful'
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
