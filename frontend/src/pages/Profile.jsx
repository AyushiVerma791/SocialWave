import React, { useState, useEffect } from 'react';
import { userAPI, friendAPI, postAPI } from '../api';
import { useAuth } from '../AuthContext';
import PostCard from '../components/PostCard';
import { UserPlus, UserMinus, Edit2 } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ following: 0, followers: 0, saved: 0 });
  const [activeTab, setActiveTab] = useState('Following');
  
  const [savedPosts, setSavedPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      let profileData;
      try {
        const pRes = await userAPI.getProfile(user.userId);
        profileData = pRes.data.data;
      } catch (err) {
        if (err.response?.status === 404) {
          // Initialize profile if it doesn't exist
          try {
            const initRes = await userAPI.updateProfile(user.userId, { bio: '' });
            profileData = { _id: user.userId, username: user.username, bio: '', avatarUrl: '' };
          } catch(e) {
            profileData = { _id: user.userId, username: user.username, bio: '', avatarUrl: '' };
          }
        } else {
          throw err;
        }
      }
      
      setProfile(profileData);
      setEditBio(profileData.bio || '');
      
      const fRes = await friendAPI.getFollowing(user.userId);
      const followersRes = await friendAPI.getFollowers(user.userId);
      setFollowing(fRes.data.data);
      
      const sRes = await postAPI.getSaved(user.userId);
      setSavedPosts(sRes.data.data);
      
      setStats({
        following: fRes.data.data.length,
        followers: followersRes.data.data.length,
        saved: sRes.data.data.length
      });

      loadRecommendations();
    } catch (e) {
      console.error(e);
      // Fallback so it doesn't hang forever
      setProfile({ _id: user.userId, username: user.username, bio: 'Failed to load completely', avatarUrl: '' });
    }
  };

  const loadRecommendations = async () => {
    try {
      const recRes = await friendAPI.getRecommendations(user.userId);
      setRecommendations(recRes.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const res = await userAPI.searchUsers(query);
        setSearchResults(res.data.data.filter(u => u._id !== user.userId && !following.includes(u._id)));
      } catch (e) { }
    } else {
      setSearchResults([]);
    }
  };

  const handleFollow = async (targetId) => {
    try {
      await friendAPI.follow(targetId);
      loadProfileData(); // refresh
    } catch (e) {
      alert("Error following user");
    }
  };

  const handleUnfollow = async (targetId) => {
    try {
      await friendAPI.unfollow(targetId);
      loadProfileData();
    } catch (e) {}
  };

  const saveProfile = async () => {
    try {
      await userAPI.updateProfile(user.userId, { bio: editBio });
      setProfile({ ...profile, bio: editBio });
      setIsEditing(false);
    } catch (e) {
      alert("Error updating profile");
    }
  };

  if (!profile) return <div className="loading-spinner">Loading profile...</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar large">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <div className="profile-top">
            <h2>{profile.username}</h2>
            {!isEditing ? (
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="profile-edit-actions">
                <button className="btn-primary" onClick={saveProfile}>Save</button>
                <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            )}
          </div>
          
          <div className="profile-stats">
            <span><strong>{stats.followers}</strong> followers</span>
            <span><strong>{stats.following}</strong> following</span>
            <span><strong>{stats.saved}</strong> saved</span>
          </div>
          
          <div className="profile-bio">
            {isEditing ? (
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="bio-input" />
            ) : (
              <p>{profile.bio || "No bio yet."}</p>
            )}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={activeTab === 'Following' ? 'active' : ''} onClick={() => setActiveTab('Following')}>Find People</button>
        <button className={activeTab === 'Saved' ? 'active' : ''} onClick={() => setActiveTab('Saved')}>Saved Posts</button>
      </div>

      <div className="profile-content">
        {activeTab === 'Saved' && (
          <div className="saved-posts">
            {savedPosts.length === 0 ? <p className="empty-state">No saved posts.</p> : null}
            {savedPosts.map(post => <PostCard key={post._id} post={post} onUpdate={p => setSavedPosts(savedPosts.map(sp => sp._id === p._id ? p : sp))} />)}
          </div>
        )}

        {activeTab === 'Following' && (
          <div className="people-discovery">
            <div className="search-users">
              <h3>Find People to Follow</h3>
              <input type="text" placeholder="Search by username..." value={searchQuery} onChange={handleSearch} />
              
              <div className="user-list">
                {searchResults.map(u => (
                  <div key={u._id} className="user-list-item">
                    <div className="user-list-info">
                      <div className="avatar">{u.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <strong>{u.username}</strong>
                        <p>{u.bio}</p>
                      </div>
                    </div>
                    <button className="btn-primary small" onClick={() => handleFollow(u._id)}><UserPlus size={16} /> Follow</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="recommendations">
              <h3>People You May Know</h3>
              <div className="user-list">
                {recommendations.filter(r => r.username).map(r => (
                  <div key={r.userId} className="user-list-item">
                    <div className="user-list-info">
                      <div className="avatar">{r.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <strong>{r.username}</strong>
                        <span className="rec-score">Score: {r.score}</span>
                      </div>
                    </div>
                    <button className="btn-primary small" onClick={() => handleFollow(r.userId)}><UserPlus size={16} /> Follow</button>
                  </div>
                ))}
                {recommendations.length === 0 && <p className="text-muted">No recommendations right now.</p>}
              </div>
            </div>
            
            <div className="following-list-management" style={{marginTop: '2rem'}}>
               <h3>People You Follow</h3>
               <p className="text-muted">You are following {following.length} users.</p>
               {/* Could list them and add unfollow button here */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
