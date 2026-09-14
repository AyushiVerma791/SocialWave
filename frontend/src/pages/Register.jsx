import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, username, password, confirmPassword } = formData;
    
    if (!email || !username || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const success = await register(username, email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Registration failed. Username or email may already be in use.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-brand">SocialWave</h1>
        <p className="auth-subtitle">Sign up to see photos and videos from your friends.</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} />
          <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />
          
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
        
        <div className="auth-switch">
          Have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
