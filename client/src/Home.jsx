import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Home() {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ client_name: '', rating: 5, comment: '' });
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchReviews();
    if (user) {
      setNewReview(prev => ({ ...prev, client_name: user.name }));
    }
  }, []);

  const fetchReviews = () => {
    axios.get('http://localhost:3000/api/reviews')
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:3000/api/reviews', newReview, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        setToast("Thank you for your feedback!");
        setNewReview({ client_name: user?.name || '', rating: 5, comment: '' });
        fetchReviews();
      })
      .catch((err) => setToast(err.response?.data?.error || "Error submitting review."));
  };

  const hasReviewed = user && reviews.some(review => review.user_id === user.id);

  return (
    <div>
      <nav className="navbar">
        <a href="/" className="nav-logo"> GALA</a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/venues">Venues</a>
          <a href="/rooms">Rooms</a>
          {user?.role === 'admin' ? (
            <a href="/dashboard">Admin Dashboard</a>
          ) : user ? (
            <a href="/login" onClick={() => localStorage.clear()}>Log out</a>
          ) : (
            <a href="/login">Login</a>
          )}
        </div>
      </nav>

      {/* WELCOME BANNER */}
      {user && (
        <div style={{ 
          background: 'var(--bg-card)', 
          borderBottom: '1px solid var(--gold)',
          padding: '15px 50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ color: 'var(--gold)', margin: 0, fontFamily: 'Cinzel, serif' }}>
            Welcome, {user.name}!
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
            Role: {user.role === 'admin' ? 'Administrator' : 'Client'}
          </p>
        </div>
      )}

      <header className="hero">
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Welcome to GALA</h1>
        <p style={{ fontSize: '18px', marginBottom: '30px' }}>
          Where Filipino warmth meets refined elegance. Whether you are planning a grand debut, an intimate wedding, 
          or simply looking for a luxurious stay, GALA is your premier destination for unforgettable moments.
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <a href="/venues" className="btn" style={{ width: 'auto', textDecoration: 'none' }}>Book a Venue</a>
          <a href="/rooms" className="btn" style={{ width: 'auto', textDecoration: 'none', background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)' }}>Book a Room</a>
        </div>
      </header>

      <div className="container">
        <h2 style={{ marginBottom: '10px' }}>Our Favorites</h2>
        <p style={{ color: 'var(--text-muted)' }}>Glimpses of the unforgettable moments we've hosted.</p>
        
        <div className="favorites-grid">
          <img src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop" alt="Wedding Setup" />
          <img src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=1000&auto=format&fit=crop" alt="Garden Party" />
          <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop" alt="Hotel Exterior" />
        </div>

        <div style={{ marginTop: '80px', marginBottom: '50px' }}>
          <h2>What Our Clients Say</h2>
          <div className="reviews-grid">
            {reviews.map(review => (
              <div className="review-card" key={review.review_id}>
                <div className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                <p className="review-comment">"{review.comment}"</p>
                <p className="review-author">- {review.client_name}</p>
              </div>
            ))}
          </div>

          <div className="premium-card" style={{ marginTop: '40px', maxWidth: '100%' }}>
            {!token ? (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '10px' }}>Leave a Review</h3>
                <p style={{ color: 'var(--text-muted)' }}>Please <a href="/login" style={{ color: 'var(--gold)' }}>login</a> to leave a review.</p>
              </div>
            ) : hasReviewed ? (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '10px' }}>Thank You!</h3>
                <p style={{ color: 'var(--text-muted)' }}>You have already submitted your review for GALA.</p>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: '20px', color: 'var(--gold)' }}>Leave a Review</h3>
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input type="text" className="form-control" placeholder="Your Name" required style={{ flex: 1, minWidth: '150px' }}
                    value={newReview.client_name} onChange={(e) => setNewReview({...newReview, client_name: e.target.value})} />
                  
                  {/* UPDATED: Added 1 and 2 stars */}
                  <select className="form-control" style={{ width: '120px' }}
                    value={newReview.rating} onChange={(e) => setNewReview({...newReview, rating: e.target.value})}>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>

                  <input type="text" className="form-control" placeholder="Your Experience..." required style={{ flex: 2, minWidth: '200px' }}
                    value={newReview.comment} onChange={(e) => setNewReview({...newReview, comment: e.target.value})} />
                  <button type="submit" className="btn" style={{ width: 'auto' }}>Submit</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
}

export default Home;