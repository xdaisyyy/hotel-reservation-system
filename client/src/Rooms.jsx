import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [bookedDates, setBookedDates] = useState([]); 
  const [selectedRoom, setSelectedRoom] = useState(null); 
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  
  const [bookingData, setBookingData] = useState({ 
    room_id: '', check_in_date: '', check_out_date: '', check_in_time: '2:00 PM', check_out_time: '12:00 PM', guest_count: '', extra_hours: 0 
  });
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    axios.get('http://localhost:3000/api/rooms').then(res => setRooms(res.data)).catch(err => console.error(err));
  }, []);

  const handleRoomChange = (e) => {
    const selectedId = e.target.value;
    setBookingData({ ...bookingData, room_id: selectedId, check_in_date: '', check_out_date: '' });

    if (selectedId) {
      axios.get(`http://localhost:3000/api/room-reservations/room/${selectedId}`)
        .then(res => setBookedDates(res.data))
        .catch(err => console.error("Error fetching room dates:", err));
    } else {
      setBookedDates([]);
    }
  };

  const selectedRoomData = rooms.find(r => r.room_id.toString() === bookingData.room_id);

  const calculateNights = () => {
    if (!bookingData.check_in_date || !bookingData.check_out_date) return 0;
    const checkIn = new Date(bookingData.check_in_date);
    const checkOut = new Date(bookingData.check_out_date);
    if (checkOut <= checkIn) return 0;
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  const hourlyRate = 1000; 

  const calculateRoomTotal = () => {
    if (!selectedRoomData || nights === 0) return 0;
    let baseTotal = nights * parseFloat(selectedRoomData.price);
    let extensionTotal = (parseInt(bookingData.extra_hours) || 0) * hourlyRate;
    return baseTotal + extensionTotal;
  };

  const showToast = (message, type = 'success') => {
    setToast(message); setToastType(type);
    setTimeout(() => setToast(null), 4000);
  };

  const handleBookRoom = (e) => {
    e.preventDefault();
    if (parseInt(bookingData.guest_count) > selectedRoomData.capacity) return showToast(`Max capacity is ${selectedRoomData.capacity} guests.`, 'error');
    
    axios.post('http://localhost:3000/api/room-reservations', {
      room_id: bookingData.room_id, check_in_date: bookingData.check_in_date, check_out_date: bookingData.check_out_date,
      check_in_time: bookingData.check_in_time, check_out_time: bookingData.check_out_time,
      guest_count: bookingData.guest_count, total_price: calculateRoomTotal(), extra_hours: bookingData.extra_hours
    }, { headers: { Authorization: `Bearer ${token}` } })
    .then(() => {
      showToast(`Room Booked! Total: ₱${calculateRoomTotal().toLocaleString()}`, 'success');
      setBookingData({ room_id: '', check_in_date: '', check_out_date: '', check_in_time: '2:00 PM', check_out_time: '12:00 PM', guest_count: '', extra_hours: 0 });
      setBookedDates([]);
    }).catch(err => showToast(err.response?.data?.error || "Error booking room.", 'error'));
  };

  const getRoomImage = (name) => {
    if (name.toLowerCase().includes('standard')) return "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1000&auto=format&fit=crop";
    if (name.toLowerCase().includes('family')) return "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1000&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1000&auto=format&fit=crop";
  };

  return (
    <div>
      <nav className="navbar">
        <a href="/" className="nav-logo"> GALA</a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/venues">Venues</a>
          <a href="/rooms" style={{ color: 'var(--gold)' }}>Rooms</a>
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
        <h1>Our Rooms & Suites</h1>
        <p>Experience comfort and luxury in our meticulously designed rooms.</p>
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
              <h2>New Room Reservation</h2>
              <form onSubmit={handleBookRoom}>
                
                <div className="form-group">
                  <label>Room Type</label>
                  <select className="form-control" required value={bookingData.room_id} onChange={handleRoomChange}>
                    <option value="">Select...</option>
                    {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name} (₱{parseFloat(r.price).toLocaleString()}/night)</option>)}
                  </select>
                </div>

                {bookingData.room_id && bookedDates.length > 0 && (
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
                  <label>Check-in Date</label>
                  <input type="date" className="form-control" required min={todayStr} value={bookingData.check_in_date} onChange={(e) => setBookingData({...bookingData, check_in_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Check-in Time</label>
                  <select className="form-control" value={bookingData.check_in_time} onChange={(e) => setBookingData({...bookingData, check_in_time: e.target.value})}>
                    <option value="2:00 PM">2:00 PM (Standard)</option>
                    <option value="12:00 PM">12:00 PM (Early)</option>
                    <option value="3:00 PM">3:00 PM</option>
                    <option value="4:00 PM">4:00 PM</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Check-out Date</label>
                  <input type="date" className="form-control" required min={bookingData.check_in_date || todayStr} value={bookingData.check_out_date} onChange={(e) => setBookingData({...bookingData, check_out_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Check-out Time</label>
                  <select className="form-control" value={bookingData.check_out_time} onChange={(e) => setBookingData({...bookingData, check_out_time: e.target.value})}>
                    <option value="12:00 PM">12:00 PM (Standard)</option>
                    <option value="10:00 AM">10:00 AM (Early)</option>
                    <option value="1:00 PM">1:00 PM</option>
                    <option value="2:00 PM">2:00 PM (Late)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Extra Hours (₱1,000 / hour)</label>
                  <input type="number" className="form-control" min="0" placeholder="0" value={bookingData.extra_hours} onChange={(e) => setBookingData({...bookingData, extra_hours: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Number of Guests (Max {selectedRoomData ? selectedRoomData.capacity : '-'})</label>
                  <input type="number" className="form-control" required min="1" max={selectedRoomData?.capacity} placeholder="Enter guest count" value={bookingData.guest_count} onChange={(e) => setBookingData({...bookingData, guest_count: e.target.value})} />
                </div>

                {calculateRoomTotal() > 0 && (
                  <div style={{ background: 'var(--bg-input)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--gold)' }}>
                    <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Room Base Price ({nights} nights):</span> <span>₱{(nights * parseFloat(selectedRoomData.price)).toLocaleString()}</span></p>
                    {parseInt(bookingData.extra_hours) > 0 && (
                      <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#e6c86a' }}><span>Extension ({bookingData.extra_hours} hours):</span> <span>+ ₱{(parseInt(bookingData.extra_hours) * hourlyRate).toLocaleString()}</span></p>
                    )}
                    <hr style={{ borderColor: 'var(--border-color)', margin: '10px 0' }}/>
                    <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', color: 'var(--gold)', margin: 0 }}><span>Total Price:</span> <span>₱{calculateRoomTotal().toLocaleString()}</span></p>
                  </div>
                )}
                <button type="submit" className="btn">Book Now</button>
              </form>
            </div>
          </div>
        )}

        <div className="room-grid">
          {rooms.map(room => (
            <div className="room-card" key={room.room_id} onClick={() => setSelectedRoom(room)}>
              <img src={getRoomImage(room.name)} alt={room.name} className="room-img" />
              <div className="room-info">
                <h3>{room.name}</h3>
                <p className="room-price">₱{parseFloat(room.price).toLocaleString()} / night</p>
                <p><i className="fa-solid fa-users"></i> Max Capacity: {room.capacity} guests</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedRoom && (
        <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedRoom(null)}>×</button>
            <img src={getRoomImage(selectedRoom.name)} alt={selectedRoom.name} className="modal-img" />
            <div className="modal-body">
              <h2>{selectedRoom.name}</h2>
              <p className="modal-description">{selectedRoom.description}</p>
              <div className="modal-details" style={{ flexDirection: 'column', gap: '10px' }}>
                <p><strong>Max Capacity:</strong> {selectedRoom.capacity} guests</p>
                <p><strong>Room Rate:</strong> ₱{parseFloat(selectedRoom.price).toLocaleString()} / night</p>
                {selectedRoom.inclusions && (
                  <div style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                    <strong style={{ color: 'var(--gold)' }}>Inclusions:</strong>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedRoom.inclusions.split(',').map((item, i) => (
                        <li key={i} style={{ fontSize: '14px' }}><span style={{ color: '#2ecc71' }}>✓</span> {item.trim()}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-notification" style={{ borderColor: toastType === 'error' ? '#e74c3c' : 'var(--gold)', borderLeftColor: toastType === 'error' ? '#e74c3c' : 'var(--gold)', color: toastType === 'error' ? '#e74c3c' : 'var(--gold)' }}>{toast}</div>}
    </div>
  );
}

export default Rooms;