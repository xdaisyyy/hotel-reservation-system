import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Venues() {
  const [venues, setVenues] = useState([]);
  const [bookedDates, setBookedDates] = useState([]); 
  const [selectedVenue, setSelectedVenue] = useState(null); 
  const [formData, setFormData] = useState({ venue_id: '', event_date: '', event_time: '8:00 AM - 12:00 PM', guest_count: '', extra_hours: 0 });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const minAllowedDate = new Date();
  minAllowedDate.setDate(minAllowedDate.getDate() + 7);
  const minDateStr = minAllowedDate.toISOString().split('T')[0];

  useEffect(() => {
    axios.get('http://localhost:3000/api/venues').then(res => setVenues(res.data)).catch(err => console.error(err));
  }, []);

  const handleVenueChange = (e) => {
    const selectedId = e.target.value;
    setFormData({ ...formData, venue_id: selectedId, event_date: '' }); 

    if (selectedId) {
      axios.get(`http://localhost:3000/api/reservations/venue/${selectedId}`)
        .then(res => {
          const formattedDates = res.data.map(date => new Date(date).toISOString().split('T')[0]);
          setBookedDates(formattedDates);
        })
        .catch(err => console.error("Error fetching dates:", err));
    } else {
      setBookedDates([]);
    }
  };

  const selectedVenueData = venues.find(v => v.venue_id.toString() === formData.venue_id);
  const hourlyRate = 2000; 

  let calculatedPrice = 0;
  if (selectedVenueData) {
    calculatedPrice = parseFloat(selectedVenueData.price);
    calculatedPrice += (parseInt(formData.extra_hours) || 0) * hourlyRate;
  }

  const showToast = (message, type = 'success') => {
    setToast(message); setToastType(type);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseInt(formData.guest_count) > selectedVenueData.capacity) return showToast(`Error: Max capacity is ${selectedVenueData.capacity} guests.`, 'error');
    if (formData.event_date < minDateStr) return showToast(`Error: Requires 7 days advance notice.`, 'error');
    if (bookedDates.includes(formData.event_date)) return showToast(`Error: This venue is already booked on ${formData.event_date}.`, 'error');

    axios.post('http://localhost:3000/api/reservations', {
      venue_id: formData.venue_id, event_date: formData.event_date, event_time: formData.event_time,
      guest_count: formData.guest_count, total_price: calculatedPrice, extra_hours: formData.extra_hours
    }, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
      showToast(`Successfully booked! Total: ₱${calculatedPrice.toLocaleString()}`, 'success');
      setFormData({ venue_id: '', event_date: '', event_time: '8:00 AM - 12:00 PM', guest_count: '', extra_hours: 0 });
      setBookedDates([]);
    }).catch(err => showToast(err.response?.data?.error || "Error booking.", 'error'));
  };

  const getVenueImage = (name) => {
    if (name.toLowerCase().includes('garden')) return "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=1000&auto=format&fit=crop";
    if (name.toLowerCase().includes('ballroom')) return "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop";
  };

  return (
    <div>
      <nav className="navbar">
        <a href="/" className="nav-logo"> GALA</a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/venues" style={{ color: 'var(--gold)' }}>Venues</a>
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

      <header className="hero">
        <h1>Our Venues</h1>
        <p>Book your perfect setting below.</p>
      </header>

      <div className="container">
        
        {/* LOGIN CHECK */}
        {!token ? (
          <div className="premium-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '50px' }}>
            <h2 style={{ marginBottom: '20px' }}>Please Login to Book</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
              You need to be logged in to make a reservation. Please login or create an account to continue.
            </p>
            <a href="/login" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Go to Login Page</a>
          </div>
        ) : (
          <div className="form-wrapper" style={{ minHeight: 'auto', marginBottom: '50px' }}>
            <div className="premium-card">
              <h2>New Venue Reservation</h2>
              <form onSubmit={handleSubmit}>
                
                <div className="form-group">
                  <label>Select Venue</label>
                  <select className="form-control" value={formData.venue_id} onChange={handleVenueChange} required>
                    <option value="">Choose a venue...</option>
                    {venues.map(v => <option key={v.venue_id} value={v.venue_id}>{v.name} (₱{parseFloat(v.price).toLocaleString()})</option>)}
                  </select>
                </div>

                {formData.venue_id && bookedDates.length > 0 && (
                  <div className="error-alert" style={{ marginBottom: '20px', marginTop: '-10px' }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '5px' }}>Unavailable Dates:</strong>
                      <span style={{ fontSize: '14px', display: 'block', lineHeight: '1.5' }}>
                        {bookedDates.sort().join(' • ')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Event Date (Requires 7-day notice)</label>
                  <input type="date" className="form-control" min={minDateStr} value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label>Event Time Schedule</label>
                  <select className="form-control" value={formData.event_time} onChange={(e) => setFormData({...formData, event_time: e.target.value})}>
                    <option value="8:00 AM - 12:00 PM">Morning: 8:00 AM - 12:00 PM</option>
                    <option value="1:00 PM - 5:00 PM">Afternoon: 1:00 PM - 5:00 PM</option>
                    <option value="6:00 PM - 10:00 PM">Evening: 6:00 PM - 10:00 PM</option>
                    <option value="8:00 AM - 5:00 PM">Whole Day</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Extra Hours (₱2,000 / hour)</label>
                  <input type="number" className="form-control" min="0" placeholder="0" value={formData.extra_hours} onChange={(e) => setFormData({...formData, extra_hours: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Number of Guests</label>
                  <input type="number" className="form-control" placeholder="Enter guest count" value={formData.guest_count} onChange={(e) => setFormData({...formData, guest_count: e.target.value})} required min="1" />
                </div>

                {formData.venue_id && (
                  <div style={{ background: 'var(--bg-input)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--gold)' }}>
                    <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Venue Base Price:</span> <span>₱{parseFloat(selectedVenueData.price).toLocaleString()}</span></p>
                    {parseInt(formData.extra_hours) > 0 && (
                      <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#e6c86a' }}><span>Extension ({formData.extra_hours} hours):</span> <span>+ ₱{(parseInt(formData.extra_hours) * hourlyRate).toLocaleString()}</span></p>
                    )}
                    <hr style={{ borderColor: 'var(--border-color)', margin: '10px 0' }}/>
                    <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', color: 'var(--gold)' }}><span>Total Price:</span> <span>₱{calculatedPrice.toLocaleString()}</span></p>
                  </div>
                )}
                <button type="submit" className="btn">Book Now</button>
              </form>
            </div>
          </div>
        )}

        <div className="venue-grid">
          {venues.map(venue => (
            <div className="venue-card" key={venue.venue_id} onClick={() => setSelectedVenue(venue)}>
              <img src={getVenueImage(venue.name)} alt={venue.name} className="venue-img" />
              <div className="venue-info">
                <h3>{venue.name}</h3>
                <p><i className="fa-solid fa-users"></i> {venue.capacity} guests</p>
                <p><i className="fa-solid fa-tag"></i> ₱{parseFloat(venue.price).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedVenue && (
        <div className="modal-overlay" onClick={() => setSelectedVenue(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedVenue(null)}>×</button>
            <img src={getVenueImage(selectedVenue.name)} alt={selectedVenue.name} className="modal-img" />
            <div className="modal-body">
              <h2>{selectedVenue.name}</h2>
              <p className="modal-description">{selectedVenue.description}</p>
              <div className="modal-details" style={{ flexDirection: 'column', gap: '10px' }}>
                <p><strong>Capacity:</strong> {selectedVenue.capacity} guests</p>
                <p><strong>Rate:</strong> ₱{parseFloat(selectedVenue.price).toLocaleString()}</p>
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                  <strong style={{ color: 'var(--gold)' }}>Inclusions:</strong>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                    {selectedVenue.inclusions?.split(',').map((item, i) => (
                      <li key={i} style={{ fontSize: '14px' }}><span style={{ color: '#2ecc71' }}>✓</span> {item.trim()}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-notification" style={{ borderColor: toastType === 'error' ? '#e74c3c' : 'var(--gold)', borderLeftColor: toastType === 'error' ? '#e74c3c' : 'var(--gold)', color: toastType === 'error' ? '#e74c3c' : 'var(--gold)' }}>{toast}</div>}
    </div>
  );
}

export default Venues;