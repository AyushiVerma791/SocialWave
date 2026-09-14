import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4008';

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data)
};

export const userAPI = {
  getProfile: (id) => api.get(`/user/${id}`),
  updateProfile: (id, data) => api.put(`/user/${id}`, data),
  searchUsers: (query) => api.get(`/user/search/${query}`)
};

export const postAPI = {
  createPost: (data) => api.post('/post', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getPosts: () => api.get('/post'),
  getPost: (id) => api.get(`/post/${id}`),
  like: (postId) => api.post('/post/like', { postId }),
  unlike: (postId) => api.post('/post/unlike', { postId }),
  save: (postId) => api.post('/post/save', { postId }),
  getSaved: (userId) => api.get(`/post/saved/${userId}`),
  repost: (postId) => api.post('/post/repost', { postId }),
  deletePost: (id) => api.delete(`/post/${id}`)
};

export const feedAPI = {
  getFeed: (userId) => api.get(`/feed/${userId}`)
};

export const commentAPI = {
  createComment: (data) => api.post('/comment', data),
  getComments: (postId) => api.get(`/comment/${postId}`)
};

export const friendAPI = {
  follow: (targetUserId) => api.post('/friend/follow', { targetUserId }),
  unfollow: (targetUserId) => api.post('/friend/unfollow', { targetUserId }),
  getFollowing: (id) => api.get(`/friend/following/${id}`),
  getFollowers: (id) => api.get(`/friend/followers/${id}`),
  getRecommendations: (userId) => api.get(`/friend/recommendations/${userId}`)
};

export const notifyAPI = {
  getNotifications: (userId) => api.get(`/notify/${userId}`),
  markRead: (id) => api.put(`/notify/${id}/read`),
  markAllRead: (userId) => api.put(`/notify/read-all/${userId}`)
};

export const storyAPI = {
  createStory: (data) => api.post('/story', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getUserStories: (userId) => api.get(`/story/user/${userId}`),
  getFeed: () => api.get('/story/feed'),
  viewStory: (id) => api.post(`/story/${id}/view`),
  likeStory: (id) => api.post(`/story/${id}/like`),
  deleteStory: (id) => api.delete(`/story/${id}`)
};

export const controllerAPI = {
  getServices: () => api.get('/services'),
  toggleService: (service, status) => api.post('/toggle', { service, status })
};

export default api;
