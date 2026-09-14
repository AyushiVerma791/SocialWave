import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import axios from 'axios';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(morgan('dev'));

const CTRL_URL = process.env.CTRL_URL || 'http://controller-service:4000';

let servicesStatus = {
  auth: true, user: true, post: true, feed: true,
  comment: true, friend: true, notification: true, story: true
};

const fetchStatuses = async () => {
  try {
    const res = await axios.get(`${CTRL_URL}/services`);
    if (res.data && res.data.success) {
      servicesStatus = res.data.data;
    }
  } catch (error) {
    console.error('Failed to fetch service status from controller');
  }
};

setInterval(fetchStatuses, 10000);
fetchStatuses();

const checkService = (serviceName) => (req, res, next) => {
  if (servicesStatus[serviceName] === false) {
    return res.status(503).json({ success: false, data: null, message: `${serviceName} service is currently disabled` });
  }
  next();
};

app.get('/', (req, res) => res.json({ success: true, message: 'API Gateway running' }));

app.get('/services', async (req, res) => {
  try {
    const response = await axios.get(`${CTRL_URL}/services`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: 'Failed to reach controller' });
  }
});
app.post('/toggle', express.json(), async (req, res) => {
  try {
    const response = await axios.post(`${CTRL_URL}/toggle`, req.body);
    await fetchStatuses();
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: 'Failed to reach controller' });
  }
});

const proxyOptions = (target) => ({
  target,
  changeOrigin: true
});

// CRITICAL FIX: Do NOT use express.json() globally before these proxies!
app.use('/auth', checkService('auth'), createProxyMiddleware(proxyOptions(process.env.AUTH_URL || 'http://auth-service:4001')));
app.use('/user', checkService('user'), createProxyMiddleware(proxyOptions(process.env.USER_URL || 'http://user-service:4002')));
app.use('/post', checkService('post'), createProxyMiddleware(proxyOptions(process.env.POST_URL || 'http://post-service:4003')));
app.use('/feed', checkService('feed'), createProxyMiddleware(proxyOptions(process.env.FEED_URL || 'http://feed-service:4004')));
app.use('/comment', checkService('comment'), createProxyMiddleware(proxyOptions(process.env.COMMENT_URL || 'http://comment-service:4005')));
app.use('/friend', checkService('friend'), createProxyMiddleware(proxyOptions(process.env.FRIEND_URL || 'http://friend-service:4006')));
app.use('/notify', checkService('notification'), createProxyMiddleware(proxyOptions(process.env.NOTIFY_URL || 'http://notification-service:4007')));
app.use('/story', checkService('story'), createProxyMiddleware(proxyOptions(process.env.STORY_URL || 'http://story-service:4009')));

const PORT = process.env.PORT || 4008;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
