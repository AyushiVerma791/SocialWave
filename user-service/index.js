const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/user-db')
  .then(() => console.log('User Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

const ProfileSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: false }, // Map to Auth user ID
  username: { type: String, required: true, unique: true },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' }
}, { timestamps: true });
ProfileSchema.index({ username: 1 });

const Profile = mongoose.model('Profile', ProfileSchema);

// Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, data: null, message: 'Invalid token' });
  }
};

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'User Service running' }));

app.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const users = await Profile.find({ username: { $regex: query, $options: 'i' } }).limit(10);
    res.status(200).json({ success: true, data: users, message: 'Users found' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error searching users' });
  }
});

app.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'User not found' });
    res.status(200).json({ success: true, data: profile, message: 'User profile retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.post('/', authMiddleware, async (req, res) => {
  try {
    const { _id, username, bio, avatarUrl } = req.body;
    let profile = await Profile.findById(_id);
    if (profile) return res.status(409).json({ success: false, data: null, message: 'Profile already exists' });
    
    profile = new Profile({ _id, username, bio, avatarUrl });
    await profile.save();
    res.status(201).json({ success: true, data: profile, message: 'Profile created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.id) {
      return res.status(403).json({ success: false, data: null, message: 'Forbidden: Cannot edit other profiles' });
    }
    const { bio, avatarUrl } = req.body;
    
    // Automatically create the profile document if it doesn't exist yet!
    const profile = await Profile.findByIdAndUpdate(
      req.params.id, 
      { 
        $set: { bio, avatarUrl },
        $setOnInsert: { _id: req.params.id, username: req.user.username }
      }, 
      { new: true, upsert: true }
    );
    
    res.status(200).json({ success: true, data: profile, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
