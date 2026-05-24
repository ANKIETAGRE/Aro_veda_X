import { useState, useEffect } from 'react';
import { patientAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

export function PatientNotifications() {
  const { patientId } = useApp();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (patientId) load(); }, [patientId]);

  const load = async () => {
    try {
      const res = await patientAPI.getNotifications(patientId);
      setNotifs(res.data);
    } catch {} finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await patientAPI.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 24 }}>🔔 Notifications</h1>
      <div className="card">
        {notifs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div className="card-body" style={{ padding: '8px 24px' }}>
            {notifs.map(n => (
              <div key={n.id} className="notif-item" onClick={() => !n.is_read && markRead(n.id)}
                style={{ cursor: n.is_read ? 'default' : 'pointer', opacity: n.is_read ? 0.65 : 1 }}>
                <div className={`notif-dot ${n.is_read ? 'read' : ''}`} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.5 }}>{n.message}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString('en-IN')}
                    {!n.is_read && <span style={{ color: 'var(--primary)', marginLeft: 8 }}>· Click to mark read</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PatientProfile() {
  const { patientId, patientData, setPatientData } = useApp();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patientData) setForm({ ...patientData });
  }, [patientData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await patientAPI.update(patientId, form);
      setPatientData(res.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  if (!form) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>👤 My Profile</h1>
        <button className={`btn ${editing ? 'btn-outline' : 'btn-primary'}`}
          onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : '✏️ Edit'}
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, color: 'white', fontWeight: 700, fontFamily: 'var(--font-display)'
            }}>
              {patientData?.full_name?.[0]}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{patientData?.full_name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{patientData?.email}</p>
          </div>

          <div className="form-grid">
            {[
              { label: 'Full Name', key: 'full_name', type: 'text' },
              { label: 'Phone', key: 'phone', type: 'tel' },
              { label: 'Age', key: 'age', type: 'number' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                {editing ? (
                  <input className="form-control" type={f.type} value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                ) : (
                  <div style={{ padding: '10px 0', fontSize: 15 }}>{form[f.key] || '—'}</div>
                )}
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Gender</label>
              {editing ? (
                <select className="form-control" value={form.gender || ''} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              ) : <div style={{ padding: '10px 0', fontSize: 15 }}>{form.gender || '—'}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Blood Group</label>
              {editing ? (
                <select className="form-control" value={form.blood_group || ''} onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                </select>
              ) : <div style={{ padding: '10px 0', fontSize: 15 }}>{form.blood_group || '—'}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            {editing ? (
              <textarea className="form-control" rows={2} value={form.address || ''}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            ) : <div style={{ padding: '10px 0', fontSize: 15 }}>{form.address || '—'}</div>}
          </div>

          {editing && (
            <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '✅ Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
