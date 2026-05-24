import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function DoctorAuth() {
  const { loginDoctor } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [specializations, setSpecializations] = useState([]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', specialization_id: '', qualification: '',
    experience_years: '', hospital_name: '', hospital_address: '',
    available_days: 'Mon,Tue,Wed,Thu,Fri',
    available_from: '09:00', available_to: '17:00',
    consultation_fee: '', bio: ''
  });

  useEffect(() => {
    API.get('/specializations').then(r => setSpecializations(r.data)).catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/doctor/login', loginForm);
      loginDoctor(res.data.user.id, res.data.user);
      toast.success(`Welcome, Dr. ${res.data.user.full_name.split(' ').slice(-1)[0]}! 👨‍⚕️`);
      navigate('/doctor/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm_password) { setError('Passwords do not match'); return; }
    if (regForm.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!regForm.specialization_id) { setError('Please select your specialization'); return; }
    setLoading(true);
    try {
      const res = await API.post('/auth/doctor/register', regForm);
      loginDoctor(res.data.user.id, res.data.user);
      toast.success('Doctor account created! Welcome 🎉');
      navigate('/doctor/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 24, width: '100%',
        maxWidth: mode === 'register' ? 580 : 460,
        boxShadow: '0 32px 64px rgba(0,0,0,0.25)', overflow: 'hidden',
        transition: 'max-width 0.3s'
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '32px 36px 24px', color: 'white' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👨‍⚕️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
            Doctor Portal
          </h1>
          <p style={{ opacity: 0.75, fontSize: 14 }}>AroVedax Medical System</p>

          <div style={{ display: 'flex', gap: 4, marginTop: 20, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 4 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? '#1e3a5f' : 'rgba(255,255,255,0.8)',
                }}>
                {m === 'login' ? '🔑 Login' : '📝 Register'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '28px 36px 32px' }}>
          {error && (
            <div style={{
              padding: '12px 16px', background: '#fff0f0', border: '1px solid #fecaca',
              borderRadius: 10, marginBottom: 18, color: '#e63946', fontSize: 14,
              display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span> {error}
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" required placeholder="doctor@hospital.com"
                  value={loginForm.email}
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" required placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <button className="btn btn-block btn-lg" type="submit" disabled={loading}
                style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {loading ? '⏳ Logging in...' : '🔑 Login to Portal'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                Not registered?{' '}
                <span style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setMode('register'); setError(''); }}>
                  Create doctor account →
                </span>
              </p>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" required placeholder="Dr. Your Name"
                    value={regForm.full_name}
                    onChange={e => setRegForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" placeholder="10-digit number"
                    value={regForm.phone}
                    onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-control" type="email" required placeholder="doctor@hospital.com"
                  value={regForm.email}
                  onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-control" type="password" required placeholder="Min 6 characters"
                    value={regForm.password}
                    onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input className="form-control" type="password" required placeholder="Repeat password"
                    value={regForm.confirm_password}
                    onChange={e => setRegForm(p => ({ ...p, confirm_password: e.target.value }))} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Specialization *</label>
                  <select className="form-control" required value={regForm.specialization_id}
                    onChange={e => setRegForm(p => ({ ...p, specialization_id: e.target.value }))}>
                    <option value="">Select specialization</option>
                    {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Qualification</label>
                  <input className="form-control" placeholder="MBBS, MD"
                    value={regForm.qualification}
                    onChange={e => setRegForm(p => ({ ...p, qualification: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (years)</label>
                  <input className="form-control" type="number"
                    value={regForm.experience_years}
                    onChange={e => setRegForm(p => ({ ...p, experience_years: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultation Fee (₹)</label>
                  <input className="form-control" type="number"
                    value={regForm.consultation_fee}
                    onChange={e => setRegForm(p => ({ ...p, consultation_fee: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hospital Name</label>
                <input className="form-control" placeholder="Your hospital or clinic name"
                  value={regForm.hospital_name}
                  onChange={e => setRegForm(p => ({ ...p, hospital_name: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Hospital Address</label>
                <input className="form-control" placeholder="Full address"
                  value={regForm.hospital_address}
                  onChange={e => setRegForm(p => ({ ...p, hospital_address: e.target.value }))} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Available From</label>
                  <input className="form-control" type="time"
                    value={regForm.available_from}
                    onChange={e => setRegForm(p => ({ ...p, available_from: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Available To</label>
                  <input className="form-control" type="time"
                    value={regForm.available_to}
                    onChange={e => setRegForm(p => ({ ...p, available_to: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-control" rows={2} placeholder="Short introduction about yourself"
                  value={regForm.bio}
                  onChange={e => setRegForm(p => ({ ...p, bio: e.target.value }))} />
              </div>

              <button className="btn btn-block btn-lg" type="submit" disabled={loading}
                style={{ marginTop: 8, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {loading ? '⏳ Creating account...' : '📝 Create Doctor Account'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                Already registered?{' '}
                <span style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setMode('login'); setError(''); }}>
                  Login here →
                </span>
              </p>
            </form>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Back to Portal Selection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
