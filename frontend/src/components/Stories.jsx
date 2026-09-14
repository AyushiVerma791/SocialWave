import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { storyAPI } from '../api';
import { useAuth } from '../AuthContext';

export default function Stories() {
  const { user } = useAuth();
  const [groupedStories, setGroupedStories] = useState([]);
  const [viewingStoryGroup, setViewingStoryGroup] = useState(null);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyFile, setStoryFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const res = await storyAPI.getFeed();
      setGroupedStories(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    if (!storyText && !storyFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('text', storyText);
    formData.append('bgColor', '#9c27b0'); // default
    if (storyFile) formData.append('media', storyFile);

    try {
      await storyAPI.createStory(formData);
      setShowCreate(false);
      setStoryText('');
      setStoryFile(null);
      loadStories();
    } catch (e) {
      alert("Failed to post story");
    }
    setUploading(false);
  };

  const openStoryViewer = (gIndex) => {
    setGroupIndex(gIndex);
    setStoryIndex(0);
    setViewingStoryGroup(groupedStories[gIndex]);
    recordView(groupedStories[gIndex].stories[0]._id);
  };

  const recordView = async (id) => {
    try {
      await storyAPI.viewStory(id);
    } catch (e) {}
  };

  const nextStory = () => {
    if (storyIndex < viewingStoryGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      recordView(viewingStoryGroup.stories[storyIndex + 1]._id);
    } else if (groupIndex < groupedStories.length - 1) {
      openStoryViewer(groupIndex + 1);
    } else {
      closeViewer();
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groupedStories[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setViewingStoryGroup(prevGroup);
    }
  };

  const closeViewer = () => {
    setViewingStoryGroup(null);
  };

  const handleLikeStory = async () => {
    try {
      const currentStory = viewingStoryGroup.stories[storyIndex];
      await storyAPI.likeStory(currentStory._id);
      // visual flair could be added here
    } catch (e) {}
  };

  // Auto progression
  useEffect(() => {
    if (viewingStoryGroup) {
      const timer = setTimeout(() => {
        nextStory();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [viewingStoryGroup, storyIndex]);

  return (
    <div className="stories-container">
      <div className="story-tray">
        <div className="story-item create" onClick={() => setShowCreate(true)}>
          <div className="story-ring empty">
            <div className="story-avatar">
              <Plus size={24} />
            </div>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {groupedStories.map((group, idx) => (
          <div key={group.userId} className="story-item" onClick={() => openStoryViewer(idx)}>
            <div className="story-ring active">
              <div className="story-avatar">
                {group.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="story-username">{group.userId === user.userId ? 'You' : group.username}</span>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="create-story-modal">
            <h3>Create Story</h3>
            <textarea 
              placeholder="Type something..." 
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              rows={4}
            />
            <input type="file" accept="image/*,video/*" onChange={e => setStoryFile(e.target.files[0])} />
            <div className="modal-actions">
              <button onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={uploading}>
                {uploading ? 'Posting...' : 'Share Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingStoryGroup && (
        <div className="story-viewer-overlay">
          <div className="story-viewer-content">
            <div className="story-progress-container">
              {viewingStoryGroup.stories.map((s, idx) => (
                <div key={s._id} className="story-progress-bar">
                  <div 
                    className="story-progress-fill" 
                    style={{ 
                      width: idx < storyIndex ? '100%' : (idx === storyIndex ? '100%' : '0%'),
                      transition: idx === storyIndex ? 'width 5s linear' : 'none'
                    }} 
                  />
                </div>
              ))}
            </div>
            
            <div className="story-header">
              <div className="story-user">
                <div className="avatar small">{viewingStoryGroup.username.charAt(0).toUpperCase()}</div>
                <span>{viewingStoryGroup.username}</span>
              </div>
              <button className="icon-btn" onClick={closeViewer}><X color="white" /></button>
            </div>

            <div className="story-body" onDoubleClick={handleLikeStory} style={{ backgroundColor: viewingStoryGroup.stories[storyIndex].bgColor }}>
              {viewingStoryGroup.stories[storyIndex].mediaUrl && (
                viewingStoryGroup.stories[storyIndex].mediaType === 'video' ? 
                  <video src={viewingStoryGroup.stories[storyIndex].mediaUrl} autoPlay playsInline /> :
                  <img src={viewingStoryGroup.stories[storyIndex].mediaUrl} alt="Story" />
              )}
              {viewingStoryGroup.stories[storyIndex].text && (
                <div className="story-text-overlay">{viewingStoryGroup.stories[storyIndex].text}</div>
              )}
            </div>

            <div className="story-nav left" onClick={prevStory}><ChevronLeft color="white" size={32} /></div>
            <div className="story-nav right" onClick={nextStory}><ChevronRight color="white" size={32} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
