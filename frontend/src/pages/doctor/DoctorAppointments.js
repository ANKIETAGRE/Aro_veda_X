import { useState, useEffect } from 'react';
import { doctorAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const STATUS_BADGE = {
  Pending:'badge-pending', Approved:'badge-approved',
  Completed:'badge-completed', Cancelled:'badge-cancelled', Rescheduled:'badge-rescheduled'
};
const STATUS_COLOR = { Pending:'#f4a261', Approved:'var(--primary)', Completed:'#6b7280', Cancelled:'#e63946', Rescheduled:'#7b2d8b' };

const RX_TEMPLATE = `Rx

1. Medicine Name — Dose — Frequency — Duration
   e.g. Paracetamol 500mg — 1 tablet — Twice daily — 5 days

2. 

3. 

─────────────────────────
Advice:
• Rest adequately
• Drink plenty of fluids
• Follow-up as directed`;

export default function DoctorAppointments() {
  const { doctorId } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [detailAppt, setDetailAppt]     = useState(null);  // full detail with doc
  const [detailLoading, setDetailLoading] = useState(false);

  // Prescription form state
  const [rxMode, setRxMode]             = useState(false); // prescription writing mode
  const [diagnosis, setDiagnosis]       = useState('');
  const [rxText, setRxText]             = useState('');
  const [followUp, setFollowUp]         = useState('');
  const [notes, setNotes]               = useState('');
  const [markComplete, setMarkComplete] = useState(false);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { if (doctorId) load(); }, [doctorId]);

  const load = async () => {
    setLoading(true);
    try { const r = await doctorAPI.getAppointments(doctorId); setAppointments(r.data); }
    catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  };

  const handleStatus = async (id, status) => {
    try { await doctorAPI.updateStatus(id, { status }); toast.success(`Marked as ${status}`); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openDetail = async (appt) => {
    setDetailLoading(true);
    setDetailAppt({ ...appt, _loading: true });
    setRxMode(false);
    try {
      const r = await API.get(`/doctor/appointments/${appt.id}/detail`);
      setDetailAppt(r.data);
      // Pre-fill prescription if exists
      setDiagnosis(r.data.diagnosis || '');
      setRxText(r.data.prescription_text || RX_TEMPLATE);
      setFollowUp(r.data.follow_up_date || '');
      setNotes(r.data.notes || '');
      setMarkComplete(r.data.status !== 'Completed');
    } catch { setDetailAppt(appt); }
    finally { setDetailLoading(false); }
  };

  const savePrescription = async () => {
    if (!rxText.trim()) { toast.error('Please write the prescription'); return; }
    setSaving(true);
    try {
      const r = await API.post(`/doctor/appointments/${detailAppt.id}/prescription`, {
        diagnosis, prescription_text: rxText, follow_up_date: followUp || null,
        notes, mark_completed: markComplete,
      });
      toast.success('Prescription saved! Patient will be notified 💊');
      setDetailAppt(r.data.appointment);
      setRxMode(false);
      load();
    } catch { toast.error('Failed to save prescription'); }
    finally { setSaving(false); }
  };

  const filters = [
    { key:'all', label:'All' }, { key:'Pending', label:'Pending' },
    { key:'Approved', label:'Approved' }, { key:'Completed', label:'Completed' },
    { key:'Cancelled', label:'Cancelled' },
  ];
  const shown = filter==='all' ? appointments : appointments.filter(a=>a.status===filter);

  if (loading) return <div className="loading-center"><div className="spinner"/></div>;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:6 }}>📅 Appointments</h1>
        <p style={{ color:'var(--text-muted)' }}>View patient documents & write prescriptions</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {filters.map(f => (
          <button key={f.key} className={`btn btn-sm ${filter===f.key?'btn-primary':'btn-outline'}`} onClick={() => setFilter(f.key)}>
            {f.label}
            <span style={{ marginLeft:6, background:'rgba(255,255,255,0.25)', borderRadius:99, padding:'0 6px', fontSize:11 }}>
              {f.key==='all' ? appointments.length : appointments.filter(a=>a.status===f.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {shown.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><h3>No appointments</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th><th>Date & Time</th><th>Reason</th>
                  <th>Document</th><th>Prescription</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{a.patient_name}</div>
                      {a.patient_age && <div style={{ fontSize:11,color:'var(--text-muted)' }}>{a.patient_age}y · {a.patient_gender}</div>}
                    </td>
                    <td>
                      <div>{new Date(a.appointment_date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                      <div style={{ fontSize:12,color:'var(--text-muted)' }}>{a.appointment_time?.slice(0,5)}</div>
                    </td>
                    <td style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>
                      {a.reason || '—'}
                    </td>
                    <td>
                      {a.has_document
                        ? <span style={{ padding:'3px 8px', borderRadius:99, fontSize:11, background:'var(--info-light)', color:'var(--info)', fontWeight:600, cursor:'pointer' }} onClick={() => openDetail(a)}>📎 View</span>
                        : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {a.prescription_text
                        ? <span style={{ padding:'3px 8px', borderRadius:99, fontSize:11, background:'var(--success-light)', color:'var(--primary)', fontWeight:600 }}>✅ Done</span>
                        : <span style={{ padding:'3px 8px', borderRadius:99, fontSize:11, background:'#fff3e0', color:'#b45309', fontWeight:600 }}>⏳ Pending</span>}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openDetail(a)}>👁️ Open</button>
                        {a.status==='Pending' && <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleStatus(a.id,'Approved')}>✅</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatus(a.id,'Cancelled')}>✕</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ APPOINTMENT DETAIL + PRESCRIPTION MODAL ══ */}
      {detailAppt && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
          onClick={e=>e.target===e.currentTarget&&setDetailAppt(null)}>
          <div style={{ background:'white',borderRadius:20,width:'100%',maxWidth:820,maxHeight:'93vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.4)',display:'flex',flexDirection:'column' }}>

            {/* Header */}
            <div style={{ padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center',position:'sticky',top:0,background:'white',zIndex:2 }}>
              <div className="doctor-avatar" style={{ width:42,height:42,fontSize:17,flexShrink:0 }}>{detailAppt.patient_name?.[0]||'P'}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:16 }}>{detailAppt.patient_name}</div>
                <div style={{ fontSize:12,color:'var(--text-muted)' }}>
                  {detailAppt.appointment_date} at {detailAppt.appointment_time?.slice(0,5)}
                  {detailAppt.patient_age && ` · ${detailAppt.patient_age}y`}
                  {detailAppt.patient_gender && ` · ${detailAppt.patient_gender}`}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[detailAppt.status]}`}>{detailAppt.status}</span>
              <div style={{ display:'flex',gap:8 }}>
                {detailAppt.status==='Pending' && (
                  <button className="btn btn-primary btn-sm" onClick={() => { handleStatus(detailAppt.id,'Approved'); setDetailAppt(p=>({...p,status:'Approved'})); }}>✅ Approve</button>
                )}
                {!rxMode && (detailAppt.status==='Approved'||detailAppt.status==='Completed') && (
                  <button className="btn btn-primary btn-sm" onClick={() => setRxMode(true)} style={{ background:detailAppt.prescription_text?'var(--accent)':'var(--primary)' }}>
                    💊 {detailAppt.prescription_text ? 'Edit Rx' : 'Write Rx'}
                  </button>
                )}
                {rxMode && <button className="btn btn-outline btn-sm" onClick={() => setRxMode(false)}>← Back</button>}
              </div>
              <button onClick={() => setDetailAppt(null)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:rxMode?'1fr':'1fr 1fr',gap:0,flex:1 }}>

              {/* LEFT: Patient info + document */}
              {!rxMode && (
                <div style={{ padding:'20px 24px',borderRight:'1px solid var(--border)',overflowY:'auto' }}>
                  <div style={{ fontWeight:700,fontSize:15,marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                    <span>🧑‍🤝‍🧑</span> Patient Info
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:8,fontSize:13,marginBottom:20 }}>
                    <div style={{ padding:'8px 12px',background:'var(--bg)',borderRadius:8 }}>👤 <b>Name:</b> {detailAppt.patient_name}</div>
                    {detailAppt.patient_age    && <div style={{ padding:'8px 12px',background:'var(--bg)',borderRadius:8 }}>🎂 <b>Age:</b> {detailAppt.patient_age}</div>}
                    {detailAppt.patient_gender && <div style={{ padding:'8px 12px',background:'var(--bg)',borderRadius:8 }}>⚧ <b>Gender:</b> {detailAppt.patient_gender}</div>}
                    {detailAppt.patient_phone  && <div style={{ padding:'8px 12px',background:'var(--bg)',borderRadius:8 }}>📞 <b>Phone:</b> {detailAppt.patient_phone}</div>}
                    {detailAppt.reason && <div style={{ padding:'8px 12px',background:'var(--bg)',borderRadius:8 }}>📋 <b>Reason:</b> {detailAppt.reason}</div>}
                  </div>

                  {/* Patient's note */}
                  {detailAppt.patient_note && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontWeight:700,fontSize:14,marginBottom:8 }}>🗒️ Note from Patient</div>
                      <div style={{ padding:'12px 14px',background:'#fffbeb',borderRadius:10,border:'1px solid #fde68a',fontSize:13,lineHeight:1.6 }}>
                        {detailAppt.patient_note}
                      </div>
                    </div>
                  )}

                  {/* Patient document */}
                  {detailAppt._loading ? (
                    <div style={{ textAlign:'center',padding:24 }}><div className="spinner" style={{ width:24,height:24,borderWidth:2 }}/></div>
                  ) : detailAppt.has_document ? (
                    <div>
                      <div style={{ fontWeight:700,fontSize:14,marginBottom:8 }}>📎 Attached Document</div>
                      {detailAppt.doc_title && (
                        <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:8 }}>📄 {detailAppt.doc_title||detailAppt.doc_file_name}</div>
                      )}
                      {detailAppt.doc_file_data ? (
                        <div style={{ border:'1px solid var(--border)',borderRadius:12,overflow:'hidden' }}>
                          {detailAppt.doc_file_type?.startsWith('image/') ? (
                            <div style={{ background:'#111',textAlign:'center',padding:12 }}>
                              <img src={detailAppt.doc_file_data} alt="Patient document"
                                style={{ maxWidth:'100%',maxHeight:280,objectFit:'contain',borderRadius:6 }} />
                            </div>
                          ) : detailAppt.doc_file_type?.includes('pdf') ? (
                            <iframe src={detailAppt.doc_file_data} title="Patient doc"
                              style={{ width:'100%',height:280,border:'none',display:'block' }} />
                          ) : null}
                          <div style={{ padding:'8px 12px',background:'var(--bg)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                            <span style={{ fontSize:12,color:'var(--text-muted)' }}>{detailAppt.doc_file_name}</span>
                            <a href={detailAppt.doc_file_data} download={detailAppt.doc_file_name} className="btn btn-sm btn-outline">⬇️</a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding:'10px 12px',background:'var(--bg)',borderRadius:8,fontSize:13,color:'var(--text-muted)' }}>
                          📎 {detailAppt.doc_title||detailAppt.doc_file_name} (loading...)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding:20,background:'var(--bg)',borderRadius:10,textAlign:'center',color:'var(--text-muted)',fontSize:13 }}>
                      📁 No document attached by patient
                    </div>
                  )}
                </div>
              )}

              {/* RIGHT (or full): Prescription */}
              <div style={{ padding:'20px 24px',overflowY:'auto' }}>
                {!rxMode ? (
                  // View existing prescription
                  <div>
                    <div style={{ fontWeight:700,fontSize:15,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                      <span>💊 Prescription</span>
                      {(detailAppt.status==='Approved'||detailAppt.status==='Completed') && (
                        <button className="btn btn-sm btn-primary" onClick={() => setRxMode(true)}>
                          {detailAppt.prescription_text ? '✏️ Edit' : '+ Write Prescription'}
                        </button>
                      )}
                    </div>

                    {detailAppt.prescription_text ? (
                      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                        {detailAppt.diagnosis && (
                          <div style={{ padding:'10px 14px',background:'var(--info-light)',borderRadius:10,border:'1px solid #bfdbfe' }}>
                            <div style={{ fontSize:11,color:'var(--info)',fontWeight:700,marginBottom:4 }}>DIAGNOSIS</div>
                            <div style={{ fontSize:14,fontWeight:600 }}>{detailAppt.diagnosis}</div>
                          </div>
                        )}
                        <div style={{ padding:'12px 14px',background:'#f0fff4',borderRadius:10,border:'1px solid #86efac' }}>
                          <div style={{ fontSize:11,color:'#16a34a',fontWeight:700,marginBottom:6 }}>PRESCRIPTION</div>
                          <pre style={{ fontFamily:'var(--font-body)',fontSize:13,whiteSpace:'pre-wrap',lineHeight:1.8,margin:0 }}>{detailAppt.prescription_text}</pre>
                        </div>
                        {detailAppt.notes && (
                          <div style={{ padding:'10px 14px',background:'var(--bg)',borderRadius:10 }}>
                            <div style={{ fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:4 }}>NOTES</div>
                            <div style={{ fontSize:13 }}>{detailAppt.notes}</div>
                          </div>
                        )}
                        {detailAppt.follow_up_date && (
                          <div style={{ padding:'10px 14px',background:'#fff0f0',borderRadius:10,border:'1px solid #fca5a5' }}>
                            <div style={{ fontSize:13,color:'#e63946',fontWeight:600 }}>
                              🔄 Follow-up: {new Date(detailAppt.follow_up_date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                            </div>
                          </div>
                        )}
                        {detailAppt.prescription_date && (
                          <div style={{ fontSize:12,color:'var(--text-muted)',textAlign:'right' }}>
                            Issued: {new Date(detailAppt.prescription_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding:24,background:'var(--bg)',borderRadius:12,textAlign:'center',border:'1px dashed var(--border)' }}>
                        <div style={{ fontSize:36,marginBottom:10 }}>💊</div>
                        <div style={{ fontWeight:600,fontSize:14,marginBottom:6 }}>No prescription yet</div>
                        <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:16 }}>
                          {detailAppt.status==='Approved'||detailAppt.status==='Completed'
                            ? 'Click "Write Prescription" to add one for this patient'
                            : 'Approve the appointment first, then write prescription'}
                        </div>
                        {(detailAppt.status==='Approved'||detailAppt.status==='Completed') && (
                          <button className="btn btn-primary" onClick={() => setRxMode(true)}>💊 Write Prescription</button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Write prescription mode
                  <div>
                    <div style={{ fontWeight:700,fontSize:16,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>
                      <span>✍️</span>
                      {detailAppt.prescription_text ? 'Edit Prescription' : 'Write Prescription'}
                      <span style={{ fontSize:13,fontWeight:400,color:'var(--text-muted)' }}>for {detailAppt.patient_name}</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Diagnosis *</label>
                      <input className="form-control" placeholder="e.g. Viral Upper Respiratory Infection"
                        value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display:'flex',justifyContent:'space-between' }}>
                        <span>Prescription *</span>
                        <button style={{ background:'none',border:'none',fontSize:12,color:'var(--primary)',cursor:'pointer',padding:0 }}
                          onClick={() => setRxText(RX_TEMPLATE)}>Use template</button>
                      </label>
                      <textarea className="form-control" rows={10}
                        style={{ fontFamily:'monospace',fontSize:13,lineHeight:1.8 }}
                        placeholder={RX_TEMPLATE}
                        value={rxText} onChange={e => setRxText(e.target.value)} />
                    </div>

                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                      <div className="form-group">
                        <label className="form-label">Follow-up Date</label>
                        <input className="form-control" type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ display:'flex',flexDirection:'column',justifyContent:'flex-end' }}>
                        <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',padding:'9px 12px',background:markComplete?'var(--success-light)':'var(--bg)',borderRadius:8,border:'1px solid var(--border)' }}>
                          <input type="checkbox" checked={markComplete} onChange={e=>setMarkComplete(e.target.checked)} />
                          ✅ Mark appointment as Completed
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Internal Notes <span style={{ color:'var(--text-muted)',fontSize:12 }}>(not shown to patient)</span></label>
                      <textarea className="form-control" rows={2} placeholder="Any internal notes..."
                        value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div style={{ display:'flex',gap:10,marginTop:4 }}>
                      <button className="btn btn-primary btn-lg" style={{ flex:1 }} onClick={savePrescription} disabled={saving||!rxText.trim()}>
                        {saving ? '⏳ Saving...' : '💊 Save & Send Prescription'}
                      </button>
                      <button className="btn btn-outline btn-lg" onClick={() => setRxMode(false)}>Cancel</button>
                    </div>

                    <div style={{ marginTop:10,padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:12,color:'var(--text-muted)' }}>
                      💡 Patient will receive a notification and can view the prescription in their appointments
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
