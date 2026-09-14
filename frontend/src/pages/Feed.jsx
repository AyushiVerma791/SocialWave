import React, { useState, useEffect } from 'react';
import { feedAPI } from '../api';
import { useAuth } from '../AuthContext';
import Stories from '../components/Stories';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingCount, setFollowingCount] = useState(-1); // to check if following anyone

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const res = await feedAPI.getFeed(user.userId);
      setPosts(res.data?.data || []);
      setFollowingCount(res.data?.followingIds ? res.data.followingIds.length : 0);
      setError('');
    } catch (e) {
      if (e.response?.status === 503) {
        setError('Feed service is currently disabled.');
      } else {
        setError('Failed to load feed.');
      }
    }
    setLoading(false);
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  const handlePostDelete = (postId) => {
    setPosts(posts.filter(p => p._id !== postId));
  };

  if (loading) return <div className="loading-spinner">Loading feed...</div>;

  return (
    <div className="feed-container">
      <Stories />
      <CreatePost onPostCreated={handlePostCreated} />
      
      {error && <div className="error-message">{error}</div>}
      
      {!error && posts.length === 0 && followingCount === 0 && (
        <div className="empty-state">
          <h3>Welcome to SocialWave!</h3>
          <p>Follow people to see their posts here.</p>
          <Link to="/profile" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}>Find people to follow →</Link>
        </div>
      )}

      {!error && posts.length === 0 && followingCount > 0 && (
        <div className="empty-state">
          <h3>Your feed is quiet</h3>
          <p>Nobody you follow has posted yet.</p>
        </div>
      )}

      <div className="posts-list">
        {posts.map(post => (
          <PostCard 
            key={post._id} 
            post={post} 
            onUpdate={handlePostUpdate} 
            onDelete={handlePostDelete} 
          />
        ))}
      </div>
    </div>
  );
}
