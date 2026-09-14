import React, { useState } from 'react';
import { Heart, MessageCircle, Repeat, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react';
import { postAPI, commentAPI } from '../api';
import { useAuth } from '../AuthContext';

export default function PostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  
  const isLiked = post.likes.includes(user.userId);
  const isSaved = post.savedBy.includes(user.userId);
  const isOwner = post.userId === user.userId;

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      if (isLiked) {
        await postAPI.unlike(post._id);
        onUpdate({ ...post, likes: post.likes.filter(id => id !== user.userId) });
      } else {
        await postAPI.like(post._id);
        onUpdate({ ...post, likes: [...post.likes, user.userId] });
      }
    } catch (e) {
      console.error(e);
    }
    setIsLiking(false);
  };

  const handleSave = async () => {
    try {
      await postAPI.save(post._id);
      if (isSaved) {
        onUpdate({ ...post, savedBy: post.savedBy.filter(id => id !== user.userId) });
      } else {
        onUpdate({ ...post, savedBy: [...post.savedBy, user.userId] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRepost = async () => {
    try {
      await postAPI.repost(post._id);
      alert('Reposted successfully!');
      // Update UI or just let feed refresh next time
    } catch (e) {
      alert(e.response?.data?.message || 'Error reposting');
    }
  };

  const loadComments = async () => {
    if (!showComments) {
      const res = await commentAPI.getComments(post._id);
      setComments(res.data.data);
    }
    setShowComments(!showComments);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await commentAPI.createComment({ postId: post._id, text: newComment, postOwnerId: post.userId });
      setComments([...comments, res.data.data]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this post?")) {
      try {
        await postAPI.deletePost(post._id);
        if (onDelete) onDelete(post._id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <div className="avatar">{post.username.charAt(0).toUpperCase()}</div>
          <div>
            <div className="post-username">{post.username}</div>
            <div className="post-time">{new Date(post.createdAt).toLocaleString()}</div>
          </div>
        </div>
        {isOwner && (
          <button className="icon-btn delete-btn" onClick={handleDelete}>
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {post.isRepost && (
        <div className="repost-badge">
          <Repeat size={14} /> Reposted
        </div>
      )}

      {post.content && <p className="post-content">{post.content}</p>}
      
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post media" className="post-image" onDoubleClick={handleLike} />
      )}

      <div className="post-actions">
        <button className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
          <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
          <span>{post.likes.length}</span>
        </button>
        <button className="action-btn" onClick={loadComments}>
          <MessageCircle size={22} />
        </button>
        <button className="action-btn" onClick={handleRepost}>
          <Repeat size={22} />
          <span>{post.repostedBy.length}</span>
        </button>
        <button className={`action-btn save-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave}>
          <Bookmark size={22} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.map(c => (
            <div key={c._id} className="comment">
              <strong>{c.username}</strong>: {c.text}
            </div>
          ))}
          <form onSubmit={submitComment} className="comment-form">
            <input 
              type="text" 
              placeholder="Add a comment..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button type="submit" disabled={!newComment.trim()}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}
