const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const servicesStatus = {
  auth: true,
  user: true,
  post: true,
  feed: true,
  comment: true,
  friend: true,
  notification: true,
  story: true
};

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Controller Service running' });
});

app.get('/services', (req, res) => {
  res.status(200).json({ success: true, data: servicesStatus, message: 'Service statuses retrieved' });
});

app.get('/services/:name', (req, res) => {
  const name = req.params.name;
  if (servicesStatus[name] !== undefined) {
    res.status(200).json({ success: true, data: { [name]: servicesStatus[name] }, message: 'Service status retrieved' });
  } else {
    res.status(404).json({ success: false, data: null, message: 'Service not found' });
  }
});

app.post('/toggle', (req, res) => {
  const { service, status } = req.body;
  if (servicesStatus[service] !== undefined && typeof status === 'boolean') {
    servicesStatus[service] = status;
    res.status(200).json({ success: true, data: servicesStatus, message: `Service ${service} toggled to ${status}` });
  } else {
    res.status(400).json({ success: false, data: null, message: 'Invalid service or status' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Controller Service running on port ${PORT}`));
