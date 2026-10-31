import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null); 
  const [deleteTarget, setDeleteTarget] = useState(null); 
  
  const token = localStorage.getItem('token');

  const fetchReservations = async () => {
    try {
      const [venueRes, roomRes] = await Promise.all([
        axios.get('http://localhost:3000/api/reservations', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/api/admin/room-reservations', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const combinedData = [...venueRes.data, ...roomRes.data];
      combinedData.sort((a, b) => a.user_id - b.user_id);
      setReservations(combinedData);
    } catch (err) {
      setToast("Failed to load data. Please login again.");
      setTimeout(() => { localStorage.clear(); window.location.href = '/login'; }, 2000);
    }
  };

  useEffect(() => { fetchReservations(); }, []);

  const handleUpdate = (id, type) => {
    const url = type === 'room' ? `http://localhost:3000/api/admin/room-reservations/${id}` : `http://localhost:3000/api/reservations/${id}`;
    axios.put(url, { status: 'Confirmed' }, { headers: { Authorization: `Bearer ${token}` } }).then(() => {
      fetchReservations();
      setToast("Reservation Confirmed.");
      setTimeout(() => setToast(null), 3000);
    }).catch(() => setToast("Error confirming."));
  };

  const confirmDelete = (id, type) => { setDeleteTarget({ id, type }); };

  const executeDelete = () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    const url = type === 'room' ? `http://localhost:3000/api/admin/room-reservations/${id}` : `http://localhost:3000/api/reservations/${id}`;
    axios.delete(url, { headers: { Authorization: `Bearer ${token}` } }).then(() => {
      fetchReservations();
      setToast("Cancelled successfully.");
      setDeleteTarget(null); 
      setTimeout(() => setToast(null), 3000);
    }).catch(() => setToast("Error cancelling."));
  };

  const filteredData = reservations.filter(res => 
    res.client_name.toLowerCase().includes(search.toLowerCase()) || 
    res.venue_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <nav className="navbar">
        <a href="/" className="nav-logo"> GALA</a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/venues">Venues</a>
          <a href="/rooms">Rooms</a>
          <a href="/dashboard" style={{ color: 'var(--gold)' }}>Admin Dashboard</a>
          <a href="/login" onClick={() => localStorage.clear()}>Log out</a>
        </div>
      </nav>

      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>Admin Dashboard</h1>
        <div style={{ marginBottom: '30px' }}>
          <input type="text" className="form-control" placeholder="Search by Client or Venue/Room..." 
            value={search} onChange={(e) => setSearch(e.target.value)} 
            style={{ width: '100%', padding: '15px', fontSize: '16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--gold)', borderRadius: '8px', color: 'white' }} />
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Client Name</th><th>Booked Item</th><th>Date</th><th>Time/Nights</th><th>Guests</th>
                <th>Ext. Hours</th><th>Ext. Cost</th><th>Total Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(res => {
                const isRoom = res.event_time && res.event_time.includes('In:');
                const extraHours = res.extra_hours || 0;
                const hourlyRate = isRoom ? 1000 : 2000;
                const extensionCost = extraHours * hourlyRate;
                return (
                  <tr key={`${isRoom ? 'room' : 'venue'}-${res.reservation_id}`}>
                    <td style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{res.client_name}</td>
                    <td>{res.venue_name}</td>
                    <td>{new Date(res.event_date).toLocaleDateString()}</td>
                    <td>{res.event_time}</td>
                    <td>{res.guest_count}</td>
                    <td style={{ color: '#e6c86a' }}>{extraHours > 0 ? `+${extraHours} hrs` : '-'}</td>
                    <td style={{ color: '#e6c86a' }}>{extraHours > 0 ? `₱${extensionCost.toLocaleString()}` : '-'}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 'bold' }}>₱{res.total_price ? parseFloat(res.total_price).toLocaleString() : '0'}</td>
                    <td className={`status-${res.status}`}>{res.status}</td>
                    <td>
                      <button className="btn btn-small" style={{ background: '#2ecc71', marginRight: '5px' }} onClick={() => handleUpdate(res.reservation_id, isRoom ? 'room' : 'venue')}>Confirm</button>
                      <button className="btn btn-small" style={{ background: '#e74c3c' }} onClick={() => confirmDelete(res.reservation_id, isRoom ? 'room' : 'venue')}>Cancel</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
            <h2 style={{ color: '#e74c3c', marginBottom: '15px' }}>Cancel Reservation?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => setDeleteTarget(null)}>Go Back</button>
              <button className="btn" style={{ background: '#e74c3c' }} onClick={executeDelete}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
}

export default Dashboard;