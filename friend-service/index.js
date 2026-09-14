const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/friend-db')
  .then(() => console.log('Friend Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

const FollowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

FollowSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });

const Follow = mongoose.model('Follow', FollowSchema);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
    next();
  } catch (err) {
    return res.status(401).json({ success: false, data: null, message: 'Invalid token' });
  }
};

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Friend Service running' }));

app.post('/follow', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === req.user.userId) {
      return res.status(400).json({ success: false, data: null, message: 'Invalid target user' });
    }

    const follow = new Follow({ userId: req.user.userId, targetUserId });
    await follow.save();

    // Send notification
    axios.post(`${process.env.NOTIFY_URL || 'http://notification-service:4007'}/`, {
      userId: targetUserId,
      message: `👤 ${req.user.username} started following you`,
      type: 'follow',
      fromUserId: req.user.userId,
      fromUsername: req.user.username
    }, { headers: { Authorization: req.headers.authorization } }).catch(e => console.error("Notification failed"));

    res.status(200).json({ success: true, data: follow, message: 'Followed successfully' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, data: null, message: 'Already following' });
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.post('/unfollow', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    await Follow.findOneAndDelete({ userId: req.user.userId, targetUserId });
    res.status(200).json({ success: true, data: null, message: 'Unfollowed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.get('/following/:id', async (req, res) => {
  try {
    const following = await Follow.find({ userId: req.params.id });
    res.status(200).json({ success: true, data: following.map(f => f.targetUserId), message: 'Following retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.get('/followers/:id', async (req, res) => {
  try {
    const followers = await Follow.find({ targetUserId: req.params.id });
    res.status(200).json({ success: true, data: followers.map(f => f.userId), message: 'Followers retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.get('/recommendations/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    
    // Very simple recommendation: users who follow us, or just mutuals.
    // To make it simple, we fetch everyone we follow, and everyone who follows us.
    const myFollowing = await Follow.find({ userId: req.user.userId });
    const myFollowers = await Follow.find({ targetUserId: req.user.userId });
    
    const followingIds = myFollowing.map(f => f.targetUserId.toString());
    const followerIds = myFollowers.map(f => f.userId.toString());
    
    const scores = {};
    
    followerIds.forEach(id => {
      if (!followingIds.includes(id) && id !== req.user.userId) {
        scores[id] = (scores[id] || 0) + 3;
      }
    });

    // Just fetch some random users from user-service if we don't have enough recommendations
    // Actually, getting all users would be slow in production, but for this demo let's assume we proxy a search or fetch profiles
    let recommendations = Object.entries(scores).map(([userId, score]) => ({ userId, score })).sort((a, b) => b.score - a.score).slice(0, 10);
    
    // Populate usernames (Normally we fetch from user-service)
    try {
      if (recommendations.length > 0) {
        for (let rec of recommendations) {
          const userRes = await axios.get(`${process.env.USER_URL || 'http://user-service:4002'}/${rec.userId}`);
          rec.username = userRes.data.data.username;
        }
      }
    } catch(e) {
      console.error("Error fetching usernames for recommendations");
    }

    res.status(200).json({ success: true, data: recommendations, message: 'Recommendations retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4006;
app.listen(PORT, () => console.log(`Friend Service running on port ${PORT}`));
