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

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/notify-db')
  .then(() => console.log('Notification Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['post_like', 'comment', 'follow', 'story_like', 'general'], required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fromUsername: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

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

app.get('/', (req, res) => res.status(200).json({ success: true, message: 'Notification Service running' }));

app.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, message, type, fromUserId, fromUsername } = req.body;
    // Don't send notification to self
    if (userId.toString() === fromUserId.toString()) {
      return res.status(200).json({ success: true, message: 'Self notification skipped' });
    }

    const notification = new Notification({ userId, message, type, fromUserId, fromUsername });
    await notification.save();
    res.status(201).json({ success: true, data: notification, message: 'Notification created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.get('/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: notifications, message: 'Notifications retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, data: null, message: 'Not found' });
    if (notification.userId.toString() !== req.user.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    
    notification.read = true;
    await notification.save();
    res.status(200).json({ success: true, data: notification, message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

app.put('/read-all/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    await Notification.updateMany({ userId: req.params.userId }, { $set: { read: true } });
    res.status(200).json({ success: true, data: null, message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4007;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
