import React, { useState, useEffect } from 'react';
import { notifyAPI } from '../api';
import { useAuth } from '../AuthContext';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notifyAPI.getNotifications(user.userId);
      setNotifications(res.data.data);
    } catch (e) {
      console.error("Failed to load notifications");
    }
    setLoading(false);
  };

  const handleMarkRead = async (id, currentStatus) => {
    if (currentStatus) return; // already read
    try {
      await notifyAPI.markRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notifyAPI.markAllRead(user.userId);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'post_like':
      case 'story_like': return <Heart color="#e91e63" size={24} />;
      case 'comment': return <MessageCircle color="#2196f3" size={24} />;
      case 'follow': return <UserPlus color="#4caf50" size={24} />;
      default: return <Bell color="#ff9800" size={24} />;
    }
  };

  if (loading) return <div className="loading-spinner">Loading notifications...</div>;

  return (
    <div className="notifications-container">
      <div className="page-header space-between">
        <h2>Notifications</h2>
        {notifications.some(n => !n.read) && (
          <button className="btn-secondary small" onClick={handleMarkAllRead}>Mark all read</button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">No notifications yet.</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n._id} 
              className={`notification-item ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleMarkRead(n._id, n.read)}
            >
              <div className="notification-icon">
                {getIcon(n.type)}
              </div>
              <div className="notification-content">
                <p>{n.message}</p>
                <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {!n.read && <div className="unread-dot"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
