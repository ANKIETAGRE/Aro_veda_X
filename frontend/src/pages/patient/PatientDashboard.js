import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  Pending: 'badge-pending', Approved: 'badge-approved',
  Completed: 'badge-completed', Cancelled: 'badge-cancelled', Rescheduled: 'badge-rescheduled'
};

export default function PatientDashboard() {
  const { patientId, patientData, loginPatient } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ full_name: '', email: '', phone: '', age: '', gender: 'Male', blood_group: '' });

  useEffect(() => {
    if (patientId) loadData();
    else { setShowSetup(true); setLoading(false); }
  }, [patientId]);

  const loadData = async () => {
    try {
      const [apptRes, profileRes] = await Promise.all([
        patientAPI.getAppointments(patientId),
        patientAPI.get(patientId)
      ]);
      setAppointments(apptRes.data);
      loginPatient(patientId, profileRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      const res = await patientAPI.create(setupForm);
      loginPatient(res.data.id, res.data);
      setShowSetup(false);
      toast.success('Profile created! Welcome 🎉');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create profile');
    }
  };

  if (showSetup) return (
    <div style={{ maxWidth: 520, margin: '40px auto' }}>
      <div className="card">
        <div className="card-header"><h2>👋 Welcome! Set up your profile</h2></div>
        <div className="card-body">
          <form onSubmit={handleSetup}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" required value={setupForm.full_name} onChange={e => setSetupForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-control" type="email" required value={setupForm.email} onChange={e => setSetupForm(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={setupForm.phone} onChange={e => setSetupForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit number" />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-control" type="number" value={setupForm.age} onChange={e => setSetupForm(p => ({ ...p, age: e.target.value }))} placeholder="25" />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={setupForm.gender} onChange={e => setSetupForm(p => ({ ...p, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-control" value={setupForm.blood_group} onChange={e => setSetupForm(p => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit">Create Profile →</button>
          </form>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const pending = appointments.filter(a => a.status === 'Pending').length;
  const upcoming = appointments.filter(a => ['Pending','Approved'].includes(a.status)).length;
  const completed = appointments.filter(a => a.status === 'Completed').length;

  return (
    <div className="animate-fade">
      <div className="welcome-hero">
        <h2>Good day, {patientData?.full_name?.split(' ')[0]} 👋</h2>
        <p>How are you feeling today? Use the symptom checker to get started.</p>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/patient/symptom-checker" className="btn btn-accent">🔍 Check Symptoms</Link>
          <Link to="/patient/doctors" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>👨‍⚕️ Find a Doctor</Link>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total Appointments', value: appointments.length, icon: '📅', color: '#e0f0ff', iconBg: '#4895ef' },
          { label: 'Upcoming', value: upcoming, icon: '⏰', color: '#d8f3dc', iconBg: '#2d6a4f' },
          { label: 'Pending Approval', value: pending, icon: '⌛', color: '#fff3e0', iconBg: '#f4a261' },
          { label: 'Completed', value: completed, icon: '✅', color: '#d8f3dc', iconBg: '#40916c' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.color }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <p>{s.label}</p>
              <h3>{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Appointments</h2>
          <Link to="/patient/appointments" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {appointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No appointments yet</h3>
            <p>Book your first appointment with a doctor</p>
            <Link to="/patient/doctors" className="btn btn-primary" style={{ marginTop: 16 }}>Find a Doctor</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Doctor</th><th>Specialization</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {appointments.slice(0, 5).map(a => (
                  <tr key={a.id}>
                    <td><strong>Dr. {a.doctor_name}</strong></td>
                    <td>{a.doctor_specialization}</td>
                    <td>{new Date(a.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{a.appointment_time?.slice(0, 5)}</td>
                    <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
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
