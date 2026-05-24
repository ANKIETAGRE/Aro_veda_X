import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function PatientAuth() {
  const { loginPatient } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', age: '', gender: 'Male', blood_group: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/patient/login', loginForm);
      loginPatient(res.data.user.id, res.data.user);
      toast.success(`Welcome back, ${res.data.user.full_name.split(' ')[0]}! 👋`);
      navigate('/patient/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm_password) {
      setError('Passwords do not match'); return;
    }
    if (regForm.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/patient/register', regForm);
      loginPatient(res.data.user.id, res.data.user);
      toast.success('Account created successfully! Welcome 🎉');
      navigate('/patient/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 32px 64px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1b4332,#2d6a4f)', padding: '32px 36px 24px', color: 'white' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧑‍⚕️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
            Patient Portal
          </h1>
          <p style={{ opacity: 0.75, fontSize: 14 }}>AroVedax Medical System</p>

          {/* Toggle tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 20, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 4 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? '#1b4332' : 'rgba(255,255,255,0.8)',
                }}>
                {m === 'login' ? '🔑 Login' : '📝 Register'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '28px 36px 32px' }}>
          {/* Error message */}
          {error && (
            <div style={{
              padding: '12px 16px', background: '#fff0f0', border: '1px solid #fecaca',
              borderRadius: 10, marginBottom: 18, color: '#e63946', fontSize: 14,
              display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span> {error}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" required
                  placeholder="you@email.com"
                  value={loginForm.email}
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" required
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}
                style={{ marginTop: 8 }}>
                {loading ? '⏳ Logging in...' : '🔑 Login to Portal'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setMode('register'); setError(''); }}>
                  Register here →
                </span>
              </p>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" required placeholder="Your full name"
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
                <input className="form-control" type="email" required placeholder="you@email.com"
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
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-control" type="number" placeholder="25"
                    value={regForm.age}
                    onChange={e => setRegForm(p => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-control" value={regForm.gender}
                    onChange={e => setRegForm(p => ({ ...p, gender: e.target.value }))}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-control" value={regForm.blood_group}
                  onChange={e => setRegForm(p => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select blood group</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}
                style={{ marginTop: 8 }}>
                {loading ? '⏳ Creating account...' : '📝 Create Account'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                Already registered?{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
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
