import { useState, useEffect } from 'react';
import { doctorAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

// ── PATIENTS PAGE ────────────────────────────────────────────────────
export function DoctorPatients() {
  const { doctorId } = useApp();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { if (doctorId) load(); }, [doctorId]);

  const load = async () => {
    try {
      const res = await doctorAPI.getPatients(doctorId);
      setPatients(res.data);
    } catch { toast.error('Failed to load patients'); } finally { setLoading(false); }
  };

  const openHistory = async (patient) => {
    setHistoryModal(patient);
    setHistory(null);
    try {
      const res = await doctorAPI.getPatientHistory(patient.id, doctorId);
      setHistory(res.data);
    } catch { toast.error('Failed to load history'); }
  };

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_BADGE = {
    Pending: 'badge-pending', Approved: 'badge-approved',
    Completed: 'badge-completed', Cancelled: 'badge-cancelled'
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>👥 My Patients</h1>
        <p style={{ color: 'var(--text-muted)' }}>All patients who have booked with you</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <input className="form-control" placeholder="🔎 Search patients by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No patients found</h3>
          <p>Patients will appear here after they book with you</p>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openHistory(p)}>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #4895ef, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 18, fontWeight: 700
                  }}>{p.full_name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.age && <span>🎂 Age: {p.age}</span>}
                  {p.gender && <span>👤 {p.gender}</span>}
                  {p.blood_group && <span>🩸 {p.blood_group}</span>}
                  {p.phone && <span>📞 {p.phone}</span>}
                </div>
                <button className="btn btn-outline btn-sm btn-block" style={{ marginTop: 12 }}>
                  📋 View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal animate-slide" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>History – {historyModal.full_name}</h3>
              <button className="modal-close" onClick={() => setHistoryModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {!history ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : history.appointments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No appointment history</p>
              ) : history.appointments.map(a => (
                <div key={a.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(a.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {a.appointment_time?.slice(0,5)}
                    </span>
                    <span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                  </div>
                  {a.reason && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>📝 {a.reason}</p>}
                  {a.treatment_details && (
                    <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--success-light)', borderRadius: 8, fontSize: 13 }}>
                      💊 {a.treatment_details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NOTIFICATIONS ────────────────────────────────────────────────────
export function DoctorNotifications() {
  const { doctorId } = useApp();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (doctorId) load(); }, [doctorId]);

  const load = async () => {
    try {
      const res = await doctorAPI.getNotifications(doctorId);
      setNotifs(res.data);
    } catch {} finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await doctorAPI.markRead(id);
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
              <div key={n.id} className="notif-item"
                onClick={() => !n.is_read && markRead(n.id)}
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

// ── DOCTOR PROFILE ────────────────────────────────────────────────────
export function DoctorProfile() {
  const { doctorId, doctorData, setDoctorData } = useApp();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (doctorData) setForm({ ...doctorData }); }, [doctorData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await doctorAPI.update(doctorId, form);
      setDoctorData(res.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  if (!form) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>👤 My Profile</h1>
        <button className={`btn ${editing ? 'btn-outline' : 'btn-primary'}`} onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : '✏️ Edit'}
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, color: 'white', fontWeight: 700
            }}>{doctorData?.full_name?.[0]}</div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Dr. {doctorData?.full_name}</h2>
            <p style={{ color: 'var(--primary)', fontWeight: 500 }}>{doctorData?.specialization}</p>
          </div>

          <div className="form-grid">
            {[
              { label: 'Full Name', key: 'full_name' }, { label: 'Phone', key: 'phone' },
              { label: 'Qualification', key: 'qualification' },
              { label: 'Experience (years)', key: 'experience_years', type: 'number' },
              { label: 'Hospital Name', key: 'hospital_name' },
              { label: 'Consultation Fee (₹)', key: 'consultation_fee', type: 'number' },
              { label: 'Available From', key: 'available_from', type: 'time' },
              { label: 'Available To', key: 'available_to', type: 'time' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                {editing
                  ? <input className="form-control" type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  : <div style={{ padding: '10px 0', fontSize: 15 }}>{form[f.key] || '—'}</div>
                }
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Hospital Address</label>
            {editing
              ? <input className="form-control" value={form.hospital_address || ''} onChange={e => setForm(p => ({ ...p, hospital_address: e.target.value }))} />
              : <div style={{ padding: '10px 0', fontSize: 15 }}>{form.hospital_address || '—'}</div>
            }
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            {editing
              ? <textarea className="form-control" rows={2} value={form.bio || ''} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              : <div style={{ padding: '10px 0', fontSize: 15 }}>{form.bio || '—'}</div>
            }
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
