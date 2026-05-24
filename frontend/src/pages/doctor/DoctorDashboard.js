import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  Pending: 'badge-pending', Approved: 'badge-approved',
  Completed: 'badge-completed', Cancelled: 'badge-cancelled'
};

export default function DoctorDashboard() {
  const { doctorId, doctorData, loginDoctor } = useApp();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [specializations, setSpecializations] = useState([]);
  const [setupForm, setSetupForm] = useState({
    full_name: '', email: '', phone: '', specialization_id: '',
    qualification: '', experience_years: '', hospital_name: '',
    hospital_address: '', available_days: 'Mon,Tue,Wed,Thu,Fri',
    available_from: '09:00', available_to: '17:00', consultation_fee: '', bio: ''
  });

  useEffect(() => {
    doctorAPI.getSpecializations().then(r => setSpecializations(r.data)).catch(() => {});
    if (doctorId) loadData();
    else { setShowSetup(true); setLoading(false); }
  }, [doctorId]);

  const loadData = async () => {
    try {
      const [dashRes, profRes] = await Promise.all([
        doctorAPI.getDashboard(doctorId),
        doctorAPI.get(doctorId)
      ]);
      setDashboard(dashRes.data);
      loginDoctor(doctorId, profRes.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      const res = await doctorAPI.create(setupForm);
      loginDoctor(res.data.id, res.data);
      setShowSetup(false);
      toast.success('Doctor profile created! Welcome 🎉');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create profile');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await doctorAPI.updateStatus(id, { status });
      toast.success(`Appointment ${status.toLowerCase()}`);
      loadData();
    } catch { toast.error('Failed to update'); }
  };

  if (showSetup) return (
    <div style={{ maxWidth: 620, margin: '40px auto' }}>
      <div className="card">
        <div className="card-header"><h2>👨‍⚕️ Set up your Doctor Profile</h2></div>
        <div className="card-body">
          <form onSubmit={handleSetup}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" required value={setupForm.full_name} onChange={e => setSetupForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Dr. Your Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-control" type="email" required value={setupForm.email} onChange={e => setSetupForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={setupForm.phone} onChange={e => setSetupForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization *</label>
                <select className="form-control" required value={setupForm.specialization_id} onChange={e => setSetupForm(p => ({ ...p, specialization_id: e.target.value }))}>
                  <option value="">Select</option>
                  {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input className="form-control" value={setupForm.qualification} onChange={e => setSetupForm(p => ({ ...p, qualification: e.target.value }))} placeholder="MBBS, MD" />
              </div>
              <div className="form-group">
                <label className="form-label">Experience (years)</label>
                <input className="form-control" type="number" value={setupForm.experience_years} onChange={e => setSetupForm(p => ({ ...p, experience_years: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital Name</label>
                <input className="form-control" value={setupForm.hospital_name} onChange={e => setSetupForm(p => ({ ...p, hospital_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Consultation Fee (₹)</label>
                <input className="form-control" type="number" value={setupForm.consultation_fee} onChange={e => setSetupForm(p => ({ ...p, consultation_fee: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Available From</label>
                <input className="form-control" type="time" value={setupForm.available_from} onChange={e => setSetupForm(p => ({ ...p, available_from: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Available To</label>
                <input className="form-control" type="time" value={setupForm.available_to} onChange={e => setSetupForm(p => ({ ...p, available_to: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Hospital Address</label>
              <input className="form-control" value={setupForm.hospital_address} onChange={e => setSetupForm(p => ({ ...p, hospital_address: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-control" rows={2} value={setupForm.bio} onChange={e => setSetupForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short introduction about yourself" />
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit">Create Profile →</button>
          </form>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!dashboard) return null;

  const { stats, today_appointments } = dashboard;

  return (
    <div className="animate-fade">
      <div className="welcome-hero" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)' }}>
        <h2>Welcome, Dr. {doctorData?.full_name?.split(' ').slice(-1)[0]} 👨‍⚕️</h2>
        <p>{doctorData?.specialization} · {doctorData?.hospital_name}</p>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total Appointments', value: stats.total, icon: '📅', bg: '#e0f0ff' },
          { label: 'Pending', value: stats.pending, icon: '⏳', bg: '#fff3e0' },
          { label: 'Approved', value: stats.approved, icon: '✅', bg: '#d8f3dc' },
          { label: 'Completed', value: stats.completed, icon: '🏁', bg: '#e0f0ff' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg }}><span>{s.icon}</span></div>
            <div className="stat-info"><p>{s.label}</p><h3>{s.value}</h3></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>📅 Today's Appointments</h2>
          <Link to="/doctor/appointments" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {today_appointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗓️</div>
            <h3>No appointments today</h3>
            <p>Enjoy your free time!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {today_appointments.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.patient_name}</strong></td>
                    <td>{a.appointment_time?.slice(0,5)}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.status === 'Pending' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(a.id, 'Approved')}>Approve</button>
                        )}
                        {a.status === 'Approved' && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange(a.id, 'Completed')}>Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
