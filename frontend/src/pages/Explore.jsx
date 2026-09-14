import React, { useState, useEffect } from 'react';
import { postAPI } from '../api';
import PostCard from '../components/PostCard';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExplore();
  }, []);

  const loadExplore = async () => {
    try {
      setLoading(true);
      const res = await postAPI.getPosts();
      setPosts(res.data?.data || []);
      setError('');
    } catch (e) {
      setError('Failed to load explore feed.');
    }
    setLoading(false);
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

  return (
    <div className="feed-container">
      <div className="page-header">
        <h2>Explore</h2>
        <p>Discover posts from everyone on SocialWave.</p>
      </div>
      
      {loading && <div className="loading-spinner">Loading explore...</div>}
      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadExplore} className="btn-primary">Retry</button>
        </div>
      )}
      
      {!loading && !error && posts.length === 0 && (
        <div className="empty-state">
          <h3>No posts found</h3>
          <p>It's very quiet here...</p>
        </div>
      )}

      <div className="posts-list">
        {posts.map(post => (
          <PostCard 
            key={post._id} 
            post={post} 
            onUpdate={handlePostUpdate} 
          />
        ))}
      </div>
    </div>
  );
}
