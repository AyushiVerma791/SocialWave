import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { postAPI } from '../api';
import { useAuth } from '../AuthContext';

export default function CreatePost({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('content', content);
    if (image) formData.append('image', image);

    try {
      const res = await postAPI.createPost(formData);
      onPostCreated(res.data.data);
      setContent('');
      removeImage();
    } catch (e) {
      alert('Error creating post');
    }
    setLoading(false);
  };

  return (
    <div className="create-post-card">
      <div className="create-post-header">
        <div className="avatar">{user?.username?.charAt(0).toUpperCase()}</div>
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
      </div>
      
      {preview && (
        <div className="image-preview-container">
          <img src={preview} alt="Preview" className="image-preview" />
          <button className="remove-image-btn" onClick={removeImage}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="create-post-actions">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleImageChange}
        />
        <button className="icon-btn" onClick={() => fileInputRef.current.click()}>
          <ImageIcon size={20} />
          <span>Photo</span>
        </button>
        <button 
          className="btn-primary" 
          onClick={handleSubmit} 
          disabled={loading || (!content.trim() && !image)}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
