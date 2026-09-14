const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Feed Service running' }));

app.get('/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });

    // 1. Fetch followed users
    const friendRes = await axios.get(`${process.env.FRIEND_URL || 'http://friend-service:4006'}/following/${req.user.userId}`, {
      headers: { Authorization: req.headers.authorization }
    });
    const followingIds = friendRes.data.data;
    
    // Include current user
    followingIds.push(req.user.userId);

    // 2. Fetch all posts (or filter if post service supports it)
    // To keep it simple and aligned with the microservices constraints where post-service has a / endpoint, we fetch all posts and filter here.
    // In production, post-service should have an endpoint taking userIds array.
    const postRes = await axios.get(`${process.env.POST_URL || 'http://post-service:4003'}/`, {
      headers: { Authorization: req.headers.authorization }
    });
    
    const allPosts = postRes.data.data;
    
    // 3. Filter and sort
    const feedPosts = allPosts.filter(post => followingIds.includes(post.userId.toString()) || followingIds.includes(post.userId));
    
    res.status(200).json({
      success: true,
      data: feedPosts,
      followingIds: followingIds.filter(id => id !== req.user.userId),
      isDiscovery: false,
      message: 'Feed retrieved'
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`Feed Service running on port ${PORT}`));
