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

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/comment-db')
  .then(() => console.log('Comment Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, required: true }
}, { timestamps: true });

CommentSchema.index({ postId: 1 });

const Comment = mongoose.model('Comment', CommentSchema);

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

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Comment Service running' }));

app.post('/', authMiddleware, async (req, res) => {
  try {
    const { postId, text } = req.body;
    if (!postId || !text) return res.status(400).json({ success: false, data: null, message: 'postId and text required' });

    const comment = new Comment({
      userId: req.user.userId,
      username: req.user.username,
      postId,
      text
    });
    await comment.save();

    // Notify post owner (ideally we should fetch the post owner from post-service, 
    // but we can just fire a generic notification to the notification service which we will handle.
    // Wait, we don't have the post owner ID here. Let's assume frontend passes postOwnerId, or we fetch it.
    // It's cleaner to let the frontend pass the postOwnerId.
    const { postOwnerId } = req.body;
    if (postOwnerId && postOwnerId !== req.user.userId) {
      axios.post(`${process.env.NOTIFY_URL || 'http://notification-service:4007'}/`, {
        userId: postOwnerId,
        message: `💬 ${req.user.username} commented on your post`,
        type: 'comment',
        fromUserId: req.user.userId,
        fromUsername: req.user.username
      }, { headers: { Authorization: req.headers.authorization } }).catch(e => console.error("Notification failed", e.message));
    }

    res.status(201).json({ success: true, data: comment, message: 'Comment created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: comments, message: 'Comments retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, () => console.log(`Comment Service running on port ${PORT}`));
