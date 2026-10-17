const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const multer = require('multer');
const { uploadMedia, deleteMedia } = require('./storage');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/story-db')
  .then(() => console.log('Story Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

const storage = multer.memoryStorage();
const upload = multer({ storage });

const StorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  mediaUrl: { type: String, default: null },
  mediaPublicId: { type: String, default: null },
  mediaType: { type: String, default: 'image' }, // 'image' or 'video'
  text: { type: String, default: '' },
  bgColor: { type: String, default: '#000000' },
  viewers: [{ type: mongoose.Schema.Types.ObjectId }],
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

StorySchema.index({ userId: 1 });
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete from DB when expiresAt is reached

const Story = mongoose.model('Story', StorySchema);

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

app.get('/healthz', (req, res) => res.status(200).json({ status: 'UP', service: 'story-service' }));
app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Story Service running' }));

app.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { text, bgColor } = req.body;
    let mediaUrl = null;
    let mediaPublicId = null;
    let mediaType = 'text';

    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video/');
      mediaType = isVideo ? 'video' : 'image';

      const uploadRes = await uploadMedia({
        file: req.file,
        folder: 'socialwave/stories',
        resourceType: mediaType
      });
      mediaUrl = uploadRes.url;
      mediaPublicId = uploadRes.publicId;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const story = new Story({
      userId: req.user.userId,
      username: req.user.username,
      mediaUrl,
      mediaPublicId,
      mediaType,
      text,
      bgColor,
      expiresAt
    });
    await story.save();
    res.status(201).json({ success: true, data: story, message: 'Story created' });
  } catch (err) {
    console.error("Story Creation Error:", err);
    res.status(500).json({ success: false, data: null, message: 'Failed to create story' });
  }
});

// Get stories for a specific user, grouped
app.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const stories = await Story.find({ userId: req.params.userId, expiresAt: { $gt: new Date() } }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: stories, message: 'Stories retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

// Get all active stories grouped by user, filtered by who the current user follows
app.get('/feed', authMiddleware, async (req, res) => {
  try {
    // 1. Fetch followed users
    const friendRes = await axios.get(`${process.env.FRIEND_URL || 'http://friend-service:4006'}/following/${req.user.userId}`, {
      headers: { Authorization: req.headers.authorization }
    });
    const followingIds = friendRes.data.data;
    followingIds.push(req.user.userId); // Include self

    const activeStories = await Story.find({ 
      userId: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: 1 });

    // Group by user
    const grouped = {};
    activeStories.forEach(story => {
      if (!grouped[story.userId]) {
        grouped[story.userId] = {
          userId: story.userId,
          username: story.username,
          stories: []
        };
      }
      grouped[story.userId].stories.push(story);
    });

    // Make sure current user is first
    let result = Object.values(grouped);
    const currentUserStories = result.find(g => g.userId.toString() === req.user.userId);
    if (currentUserStories) {
      result = result.filter(g => g.userId.toString() !== req.user.userId);
      result.unshift(currentUserStories);
    }

    res.status(200).json({ success: true, data: result, message: 'Stories feed retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.post('/:id/view', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, data: null, message: 'Story not found' });
    
    if (!story.viewers.includes(req.user.userId)) {
      story.viewers.push(req.user.userId);
      await story.save();
    }
    res.status(200).json({ success: true, data: null, message: 'View recorded' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, data: null, message: 'Story not found' });
    
    if (story.userId.toString() !== req.user.userId) {
      axios.post(`${process.env.NOTIFY_URL || 'http://notification-service:4007'}/`, {
        userId: story.userId,
        message: `❤️ ${req.user.username} liked your story`,
        type: 'story_like',
        fromUserId: req.user.userId,
        fromUsername: req.user.username
      }, { headers: { Authorization: req.headers.authorization } }).catch(e => console.error("Notification failed"));
    }
    
    res.status(200).json({ success: true, data: null, message: 'Story liked' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, data: null, message: 'Story not found' });
    if (story.userId.toString() !== req.user.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    
    if (story.mediaPublicId) {
      await deleteMedia(story.mediaPublicId, story.mediaType);
    }
    await Story.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: null, message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error deleting story' });
  }
});

const PORT = process.env.PORT || 4009;
const server = app.listen(PORT, () => console.log(`Story Service running on port ${PORT}`));

const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down Story Service gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed.');
    } catch (e) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
