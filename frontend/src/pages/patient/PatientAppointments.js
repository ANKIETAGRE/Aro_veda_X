import { useState, useEffect, useRef } from 'react';
import { patientAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const STATUS_BADGE = {
  Pending:'badge-pending', Approved:'badge-approved',
  Completed:'badge-completed', Cancelled:'badge-cancelled', Rescheduled:'badge-rescheduled'
};
const STATUS_BG = {
  Pending:'#fff3e0', Approved:'#d8f3dc', Completed:'#f3f4f6', Cancelled:'#fff0f0', Rescheduled:'#f3e8ff'
};
const STATUS_BORDER = {
  Pending:'#f4a261', Approved:'var(--primary)', Completed:'#9ca3af', Cancelled:'#e63946', Rescheduled:'#7b2d8b'
};

export default function PatientAppointments() {
  const { patientId } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [rescheduleModal, setReschedule] = useState(null);
  const [newDate, setNewDate]           = useState('');
  const [newTime, setNewTime]           = useState('');
  const [slots, setSlots]               = useState([]);
  const [viewAppt, setViewAppt]         = useState(null);

  // Doc upload for existing appointment
  const [docModal, setDocModal]         = useState(null);
  const [docFileData, setDocFileData]   = useState('');
  const [docFileName, setDocFileName]   = useState('');
  const [docFileType, setDocFileType]   = useState('');
  const [docTitle, setDocTitle]         = useState('');
  const [patientNote, setPatientNote]   = useState('');
  const [uploading, setUploading]       = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { if (patientId) load(); }, [patientId]);

  const load = async () => {
    try { const r = await patientAPI.getAppointments(patientId); setAppointments(r.data); }
    catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try { await patientAPI.cancelAppointment(id); toast.success('Cancelled'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openReschedule = (appt) => { setReschedule(appt); setNewDate(''); setNewTime(''); setSlots([]); };

  const handleDateChange = async (date) => {
    setNewDate(date); setNewTime('');
    if (!date || !rescheduleModal) return;
    try { const r = await patientAPI.getSlots(rescheduleModal.doctor_id, date); setSlots(r.data); } catch {}
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) { toast.error('Pick a date and time'); return; }
    try {
      await patientAPI.rescheduleAppointment(rescheduleModal.id, { appointment_date:newDate, appointment_time:newTime });
      toast.success('Rescheduled!'); setReschedule(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openView = async (appt) => {
    setViewAppt({ ...appt, _loading: true });
    try {
      const r = await API.get(`/patient/appointments/${appt.id}/detail`);
      setViewAppt(r.data);
    } catch { setViewAppt(appt); }
  };

  const openDocModal = (appt) => {
    setDocModal(appt);
    setDocFileData(''); setDocFileName(''); setDocFileType('');
    setDocTitle(''); setPatientNote(appt.patient_note||'');
  };

  const handleDocFile = (file) => {
    if (!file) return;
    if (file.size > 10*1024*1024) { toast.error('Max 10MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      setDocFileData(e.target.result);
      setDocFileName(file.name);
      setDocFileType(file.type);
      setDocTitle(t => t || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' '));
    };
    reader.readAsDataURL(file);
  };

  const submitDoc = async () => {
    if (!docFileData) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      await API.put(`/patient/appointments/${docModal.id}/upload-doc`, {
        doc_file_data: docFileData, doc_file_name: docFileName,
        doc_file_type: docFileType, doc_title: docTitle, patient_note: patientNote,
      });
      toast.success('Document attached! 📎');
      setDocModal(null); load();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const filters = [
    { key:'all', label:'All' }, { key:'Pending', label:'⏳ Pending' },
    { key:'Approved', label:'✅ Approved' }, { key:'Completed', label:'🏁 Completed' },
    { key:'Cancelled', label:'✕ Cancelled' },
  ];
  const shown = filter==='all' ? appointments : appointments.filter(a=>a.status===filter);
  const today = new Date().toISOString().split('T')[0];

  if (loading) return <div className="loading-center"><div className="spinner"/></div>;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:6 }}>📅 My Appointments</h1>
        <p style={{ color:'var(--text-muted)' }}>View appointments, attach documents & receive prescriptions</p>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {filters.map(f => (
          <button key={f.key} className={`btn btn-sm ${filter===f.key?'btn-primary':'btn-outline'}`} onClick={() => setFilter(f.key)}>
            {f.label}
            <span style={{ marginLeft:5, background:'rgba(255,255,255,0.25)', borderRadius:99, padding:'0 6px', fontSize:11 }}>
              {f.key==='all' ? appointments.length : appointments.filter(a=>a.status===f.key).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📋</div><h3>No appointments</h3>
          <p>No {filter!=='all'?filter.toLowerCase():''} appointments found</p>
        </div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {shown.map(a => (
            <div key={a.id} className="card" style={{ borderLeft:`4px solid ${STATUS_BORDER[a.status]||'var(--border)'}` }}>
              <div className="card-body" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div style={{ flex:1,minWidth:240 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700, fontSize:16 }}>Dr. {a.doctor_name}</span>
                    <span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                    {a.has_document     && <span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, background:'var(--info-light)', color:'var(--info)', fontWeight:600 }}>📎 Doc</span>}
                    {a.prescription_text && <span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, background:'var(--success-light)', color:'var(--primary)', fontWeight:600 }}>💊 Rx Ready</span>}
                  </div>
                  <div style={{ color:'var(--primary)', fontSize:13, marginBottom:4 }}>{a.doctor_specialization}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                    📅 {new Date(a.appointment_date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}
                    &nbsp;·&nbsp; 🕐 {a.appointment_time?.slice(0,5)}
                  </div>
                  {a.reason && <div style={{ marginTop:4, fontSize:13, color:'var(--text-muted)' }}>📝 {a.reason}</div>}

                  {/* Prescription alert */}
                  {a.prescription_text && (
                    <div style={{ marginTop:10, padding:'8px 14px', background:'var(--success-light)', borderRadius:8, fontSize:13, display:'flex', gap:10, alignItems:'center', border:'1px solid #74c69d' }}>
                      <span>💊 <b>Prescription available</b> from Dr. {a.doctor_name}</span>
                      <button className="btn btn-sm btn-primary" style={{ fontSize:11,padding:'4px 10px' }} onClick={() => openView(a)}>View →</button>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignSelf:'flex-start' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openView(a)}>👁️ View</button>
                  {!['Completed','Cancelled'].includes(a.status) && <>
                    <button className="btn btn-outline btn-sm" onClick={() => openDocModal(a)}>
                      📎 {a.has_document ? 'Change Doc' : 'Attach Doc'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => openReschedule(a)}>📅 Reschedule</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(a.id)}>✕</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ ATTACH DOCUMENT MODAL ══ */}
      {docModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
          onClick={e=>e.target===e.currentTarget&&setDocModal(null)}>
          <div style={{ background:'white',borderRadius:20,width:'100%',maxWidth:500,boxShadow:'0 32px 64px rgba(0,0,0,0.3)',overflow:'hidden' }}>
            <div style={{ padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:20 }}>📎 Attach Document</h2>
              <button style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }} onClick={() => setDocModal(null)}>✕</button>
            </div>
            <div style={{ padding:'20px 24px' }}>
              <div style={{ padding:'10px 14px',background:'var(--bg)',borderRadius:10,fontSize:13,marginBottom:16 }}>
                📅 Appointment with <b>Dr. {docModal.doctor_name}</b> on <b>{docModal.appointment_date}</b>
              </div>
              <div onClick={() => fileRef.current?.click()}
                style={{ border:`2px dashed ${docFileData?'var(--primary)':'var(--border)'}`,borderRadius:12,padding:'24px',textAlign:'center',cursor:'pointer',background:docFileData?'#f0fff4':'var(--bg)',marginBottom:14,transition:'all 0.2s' }}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={e=>handleDocFile(e.target.files[0])} />
                {docFileData ? (
                  <div><div style={{ fontSize:36,marginBottom:6 }}>{docFileType?.includes('pdf')?'📄':'🖼️'}</div>
                    <div style={{ fontWeight:600,fontSize:13,color:'var(--primary)' }}>✅ {docFileName}</div>
                    <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:3 }}>Click to change</div>
                  </div>
                ) : (
                  <div><div style={{ fontSize:36,marginBottom:8 }}>📁</div>
                    <div style={{ fontWeight:600 }}>Click to upload X-Ray, Report, Prescription...</div>
                    <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>JPG, PNG, PDF — max 10MB</div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input className="form-control" placeholder="e.g. Blood Test Report" value={docTitle} onChange={e=>setDocTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Note to Doctor</label>
                <textarea className="form-control" rows={3} placeholder="Any message for the doctor..." value={patientNote} onChange={e=>setPatientNote(e.target.value)} />
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button className="btn btn-primary btn-lg" style={{ flex:1 }} onClick={submitDoc} disabled={uploading||!docFileData}>
                  {uploading?'⏳ Uploading...':'📎 Attach to Appointment'}
                </button>
                <button className="btn btn-outline btn-lg" onClick={() => setDocModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW APPOINTMENT + PRESCRIPTION MODAL ══ */}
      {viewAppt && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
          onClick={e=>e.target===e.currentTarget&&setViewAppt(null)}>
          <div style={{ background:'white',borderRadius:20,width:'100%',maxWidth:660,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center',position:'sticky',top:0,background:'white',zIndex:1 }}>
              <span style={{ fontSize:26 }}>📅</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:16 }}>Dr. {viewAppt.doctor_name}</div>
                <div style={{ fontSize:12,color:'var(--text-muted)' }}>{viewAppt.appointment_date} · {viewAppt.appointment_time?.slice(0,5)} · {viewAppt.doctor_specialization}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[viewAppt.status]}`}>{viewAppt.status}</span>
              <button onClick={() => setViewAppt(null)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
              {/* Appointment details */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13 }}>
                {viewAppt.reason && <div style={{ padding:'8px 12px',background:'var(--bg)',borderRadius:8,gridColumn:'1/-1' }}>📝 <b>Reason:</b> {viewAppt.reason}</div>}
                {viewAppt.patient_note && <div style={{ padding:'8px 12px',background:'#fffbeb',borderRadius:8,border:'1px solid #fde68a',gridColumn:'1/-1' }}>🗒️ <b>Your note:</b> {viewAppt.patient_note}</div>}
              </div>

              {/* Attached document */}
              {viewAppt._loading ? (
                <div style={{ textAlign:'center',padding:30 }}><div className="spinner" style={{ width:24,height:24,borderWidth:2 }}/></div>
              ) : viewAppt.has_document && (
                <div>
                  <div style={{ fontWeight:600,fontSize:14,marginBottom:8 }}>📎 Your Attached Document</div>
                  {viewAppt.doc_file_data ? (
                    <div style={{ border:'1px solid var(--border)',borderRadius:12,overflow:'hidden' }}>
                      <div style={{ padding:'8px 14px',background:'var(--bg)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                        <span style={{ fontSize:13,fontWeight:600 }}>{viewAppt.doc_title||viewAppt.doc_file_name}</span>
                        <a href={viewAppt.doc_file_data} download={viewAppt.doc_file_name} className="btn btn-sm btn-outline">⬇️ Download</a>
                      </div>
                      {viewAppt.doc_file_type?.startsWith('image/') ? (
                        <div style={{ background:'#111',textAlign:'center',padding:12 }}>
                          <img src={viewAppt.doc_file_data} alt="doc" style={{ maxWidth:'100%',maxHeight:280,objectFit:'contain',borderRadius:6 }} />
                        </div>
                      ) : viewAppt.doc_file_type?.includes('pdf') ? (
                        <iframe src={viewAppt.doc_file_data} title="doc" style={{ width:'100%',height:320,border:'none',display:'block' }} />
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ padding:'10px 14px',background:'var(--bg)',borderRadius:8,fontSize:13,color:'var(--text-muted)' }}>📎 {viewAppt.doc_title||viewAppt.doc_file_name}</div>
                  )}
                </div>
              )}

              {/* Prescription from doctor */}
              <div>
                <div style={{ fontWeight:600,fontSize:14,marginBottom:8 }}>💊 Doctor's Prescription</div>
                {viewAppt.prescription_text ? (
                  <div style={{ background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)',borderRadius:14,padding:'18px 20px',border:'1px solid #74c69d' }}>
                    <div style={{ fontWeight:700,fontSize:15,color:'#1b4332',marginBottom:12 }}>💊 From Dr. {viewAppt.doctor_name}</div>
                    {viewAppt.diagnosis && (
                      <div style={{ marginBottom:10,padding:'8px 14px',background:'white',borderRadius:8 }}>
                        <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:3 }}>DIAGNOSIS</div>
                        <div style={{ fontWeight:600,fontSize:14 }}>{viewAppt.diagnosis}</div>
                      </div>
                    )}
                    <div style={{ padding:'10px 14px',background:'white',borderRadius:8,marginBottom:10 }}>
                      <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>PRESCRIPTION</div>
                      <pre style={{ fontFamily:'var(--font-body)',fontSize:13,whiteSpace:'pre-wrap',lineHeight:1.9,margin:0 }}>{viewAppt.prescription_text}</pre>
                    </div>
                    <div style={{ display:'flex',gap:10,flexWrap:'wrap',fontSize:13 }}>
                      {viewAppt.prescription_date && (
                        <span style={{ padding:'4px 12px',background:'white',borderRadius:8 }}>
                          📅 Issued: {new Date(viewAppt.prescription_date).toLocaleDateString('en-IN')}
                        </span>
                      )}
                      {viewAppt.follow_up_date && (
                        <span style={{ padding:'4px 12px',background:'white',borderRadius:8,color:'#e63946',fontWeight:600 }}>
                          🔄 Follow-up: {new Date(viewAppt.follow_up_date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'long'})}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:20,background:'var(--bg)',borderRadius:12,textAlign:'center',border:'1px dashed var(--border)',color:'var(--text-muted)',fontSize:13 }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>⏳</div>
                    Prescription not yet provided. Doctor will add it after reviewing your appointment.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESCHEDULE MODAL ══ */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setReschedule(null)}>
          <div className="modal animate-slide" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reschedule Appointment</h3>
              <button className="modal-close" onClick={() => setReschedule(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color:'var(--text-muted)',marginBottom:16,fontSize:14 }}>
                Current: {rescheduleModal.appointment_date} at {rescheduleModal.appointment_time?.slice(0,5)}
              </p>
              <div className="form-group">
                <label className="form-label">New Date *</label>
                <input className="form-control" type="date" min={today} value={newDate} onChange={e=>handleDateChange(e.target.value)} />
              </div>
              {slots.length > 0 && (
                <div className="form-group">
                  <label className="form-label">New Time *</label>
                  <div className="slots-grid">
                    {slots.map(s => <button key={s.time} className={`slot-btn ${newTime===s.time?'selected':''}`} disabled={!s.available} onClick={() => setNewTime(s.time)}>{s.time}</button>)}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setReschedule(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReschedule} disabled={!newDate||!newTime}>✅ Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
