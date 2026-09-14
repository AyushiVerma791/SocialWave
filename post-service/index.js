const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/post-db')
  .then(() => console.log('Post Service connected to DB'))
  .catch(err => console.error('DB connection error:', err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  content: { type: String, default: '' },
  imageUrl: { type: String, default: null },
  imagePublicId: { type: String, default: null },
  likes: [{ type: mongoose.Schema.Types.ObjectId }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId }],
  isRepost: { type: Boolean, default: false },
  originalPostId: { type: mongoose.Schema.Types.ObjectId, default: null },
  repostedBy: [{ type: mongoose.Schema.Types.ObjectId }]
}, { timestamps: true });

PostSchema.index({ userId: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ savedBy: 1 });

const Post = mongoose.model('Post', PostSchema);

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

// Healthcheck route intentionally removed so GET / correctly fetches posts

app.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, { folder: 'socialwave/posts' });
      imageUrl = uploadResponse.secure_url;
      imagePublicId = uploadResponse.public_id;
    }

    const post = new Post({
      userId: req.user.userId,
      username: req.user.username,
      content,
      imageUrl,
      imagePublicId
    });
    await post.save();
    res.status(201).json({ success: true, data: post, message: 'Post created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Failed to create post' });
  }
});

app.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: posts, message: 'Posts retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Failed to retrieve posts' });
  }
});

app.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, data: null, message: 'Post not found' });
    res.status(200).json({ success: true, data: post, message: 'Post retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error retrieving post' });
  }
});

app.post('/like', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, data: null, message: 'Post not found' });
    if (!post.likes.includes(req.user.userId)) {
      post.likes.push(req.user.userId);
      await post.save();
    }
    res.status(200).json({ success: true, data: post, message: 'Post liked' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error liking post' });
  }
});

app.post('/unlike', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, data: null, message: 'Post not found' });
    post.likes = post.likes.filter(id => id.toString() !== req.user.userId);
    await post.save();
    res.status(200).json({ success: true, data: post, message: 'Post unliked' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error unliking post' });
  }
});

app.post('/save', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, data: null, message: 'Post not found' });
    const hasSaved = post.savedBy.includes(req.user.userId);
    if (hasSaved) {
      post.savedBy = post.savedBy.filter(id => id.toString() !== req.user.userId);
    } else {
      post.savedBy.push(req.user.userId);
    }
    await post.save();
    res.status(200).json({ success: true, data: post, message: hasSaved ? 'Post unsaved' : 'Post saved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error saving post' });
  }
});

app.get('/saved/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    const posts = await Post.find({ savedBy: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: posts, message: 'Saved posts retrieved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error retrieving saved posts' });
  }
});

app.post('/repost', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.body;
    const originalPost = await Post.findById(postId);
    if (!originalPost) return res.status(404).json({ success: false, data: null, message: 'Post not found' });
    if (originalPost.userId.toString() === req.user.userId) return res.status(400).json({ success: false, data: null, message: 'Cannot repost own post' });
    
    if (originalPost.repostedBy.includes(req.user.userId)) return res.status(400).json({ success: false, data: null, message: 'Already reposted' });

    originalPost.repostedBy.push(req.user.userId);
    await originalPost.save();

    const repost = new Post({
      userId: req.user.userId,
      username: req.user.username,
      content: originalPost.content,
      imageUrl: originalPost.imageUrl,
      imagePublicId: originalPost.imagePublicId,
      isRepost: true,
      originalPostId: originalPost._id
    });
    await repost.save();
    res.status(201).json({ success: true, data: repost, message: 'Reposted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error reposting' });
  }
});

app.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, data: null, message: 'Post not found' });
    if (post.userId.toString() !== req.user.userId) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    
    if (post.imagePublicId) {
      await cloudinary.uploader.destroy(post.imagePublicId);
    }
    
    // Also handle original post if this was a repost
    if (post.isRepost && post.originalPostId) {
      const orig = await Post.findById(post.originalPostId);
      if (orig) {
        orig.repostedBy = orig.repostedBy.filter(id => id.toString() !== req.user.userId);
        await orig.save();
      }
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: null, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: 'Error deleting post' });
  }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`Post Service running on port ${PORT}`));
