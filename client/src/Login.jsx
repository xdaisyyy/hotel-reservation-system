import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
    first_name: '', 
    last_name: '', 
    email: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    const url = isLogin ? 'http://localhost:3000/api/auth/login' : 'http://localhost:3000/api/auth/register';
    
    const payload = isLogin 
      ? { email: formData.email, password: formData.password } 
      : formData;

    try {
      const res = await axios.post(url, payload);
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (res.data.user.role === 'admin') navigate('/dashboard');
        else navigate('/');
      } else {
        setIsLogin(true);
        setSuccess('Registration successful! Please log in.');
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-main)' }}>
      <div className="premium-card" style={{ width: '450px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>{isLogin ? 'Login' : 'Register'}</h2>
        {error && <div className="error-alert" style={{ marginBottom: '20px' }}>{error}</div>}
        {success && <div className="success-alert" style={{ marginBottom: '20px' }}>{success}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>First Name</label>
                <input type="text" className="form-control" required 
                  value={formData.first_name} 
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" className="form-control" required 
                  value={formData.last_name} 
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" required 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-control" required 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>
          
          <button type="submit" className="btn">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)} style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 'bold' }}>
              {isLogin ? 'Register' : 'Login'}
            </span>
          </p>
          <a href="/" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

export default Login;