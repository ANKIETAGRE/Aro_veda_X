import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { patientAPI, commonAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

export default function FindDoctors() {
  const { patientId }    = useApp();
  const [searchParams]   = useSearchParams();
  const [doctors, setDoctors]                 = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpec, setSelectedSpec]       = useState('');
  const [loading, setLoading]                 = useState(true);

  // Booking
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showModal, setShowModal]           = useState(false);
  const [step, setStep]                     = useState(0);
  const [selectedDate, setSelectedDate]     = useState('');
  const [slots, setSlots]                   = useState([]);
  const [selectedSlot, setSelectedSlot]     = useState('');
  const [reason, setReason]                 = useState('');
  const [patientNote, setPatientNote]       = useState('');
  const [booking, setBooking]               = useState(false);
  const [slotsLoading, setSlotsLoading]     = useState(false);
  const [bookedId, setBookedId]             = useState(null);

  // Doc upload
  const [docFile, setDocFile]             = useState(null);
  const [docFileData, setDocFileData]     = useState('');
  const [docFileName, setDocFileName]     = useState('');
  const [docFileType, setDocFileType]     = useState('');
  const [docTitle, setDocTitle]           = useState('');
  const [dragOver, setDragOver]           = useState(false);
  const [uploadingDoc, setUploadingDoc]   = useState(false);
  const fileRef = useRef(null);

  const STEPS = [
    { label: 'Date & Time',        icon: '📅' },
    { label: 'Reason & Note',      icon: '📝' },
    { label: 'Upload Document',    icon: '📎' },
    { label: 'Confirmed',          icon: '✅' },
  ];

  useEffect(() => {
    commonAPI.getSpecializations().then(r => setSpecializations(r.data)).catch(() => {});
    const sp = searchParams.get('specialization');
    if (sp) setSelectedSpec(sp);
  }, []);

  useEffect(() => { loadDoctors(); }, [selectedSpec]);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const spec = specializations.find(s => s.name === selectedSpec);
      const res  = await patientAPI.getDoctors(spec?.id);
      setDoctors(res.data);
    } catch { toast.error('Failed to load doctors'); }
    finally   { setLoading(false); }
  };

  const openBooking = (doctor) => {
    if (!patientId) { toast.error('Please log in first'); return; }
    setSelectedDoctor(doctor);
    setStep(0); setSelectedDate(''); setSlots([]); setSelectedSlot('');
    setReason(''); setPatientNote('');
    setDocFile(null); setDocFileData(''); setDocFileName(''); setDocFileType(''); setDocTitle('');
    setBookedId(null);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleDateChange = async (date) => {
    setSelectedDate(date); setSelectedSlot('');
    if (!date) return;
    setSlotsLoading(true);
    try { const r = await patientAPI.getSlots(selectedDoctor.id, date); setSlots(r.data); }
    catch { toast.error('Could not load slots'); }
    finally { setSlotsLoading(false); }
  };

  const handleDocFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Max file size is 10MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      setDocFileData(e.target.result);
      setDocFileName(file.name);
      setDocFileType(file.type);
      setDocFile(file);
      setDocTitle(t => t || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    };
    reader.readAsDataURL(file);
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot) { toast.error('Select date and time'); return; }
    setBooking(true);
    try {
      const res = await patientAPI.bookAppointment({
        patient_id:       patientId,
        doctor_id:        selectedDoctor.id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        reason,
        patient_note:  patientNote,
        doc_file_data: docFileData || '',
        doc_file_name: docFileName || '',
        doc_file_type: docFileType || '',
        doc_title:     docTitle    || '',
      });
      setBookedId(res.data.id);
      toast.success('Appointment booked! 🎉');
      setStep(3);
    } catch (err) { toast.error(err.response?.data?.error || 'Booking failed'); }
    finally { setBooking(false); }
  };

  const attachDocAfterBooking = async () => {
    if (!docFileData || !bookedId) return;
    setUploadingDoc(true);
    try {
      const axios = (await import('axios')).default;
      const api   = axios.create({ baseURL: 'http://localhost:5000/api' });
      await api.put(`/patient/appointments/${bookedId}/upload-doc`, {
        doc_file_data: docFileData, doc_file_name: docFileName,
        doc_file_type: docFileType, doc_title: docTitle, patient_note: patientNote,
      });
      toast.success('Document attached! ✅');
    } catch { toast.error('Doc upload failed — appointment is still booked'); }
    finally { setUploadingDoc(false); }
  };

  const formatSize = b => b > 1024*1024 ? (b/1024/1024).toFixed(1)+' MB' : (b/1024).toFixed(0)+' KB';
  const today = new Date().toISOString().split('T')[0];
  const canNext = step === 0 ? !!(selectedDate && selectedSlot) : true;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 6 }}>👨‍⚕️ Find Doctors</h1>
        <p style={{ color: 'var(--text-muted)' }}>Browse doctors, book an appointment & share your reports</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ maxWidth: 280 }} value={selectedSpec} onChange={e => setSelectedSpec(e.target.value)}>
              <option value="">All Specializations</option>
              {specializations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            {selectedSpec && <button className="btn btn-outline btn-sm" onClick={() => setSelectedSpec('')}>Clear ×</button>}
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{doctors.length} doctor{doctors.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : doctors.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">👨‍⚕️</div><h3>No doctors found</h3></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
          {doctors.map(doc => (
            <div key={doc.id} className="doctor-card">
              <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <div className="doctor-avatar">{doc.full_name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Dr. {doc.full_name}</div>
                  <div style={{ color: 'var(--primary)', fontSize: 13 }}>{doc.specialization}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{doc.qualification}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                <span>🏥 {doc.hospital_name}</span>
                <span>⏱️ {doc.experience_years} yrs</span>
                <span>💰 ₹{doc.consultation_fee}</span>
                <span>📅 {doc.available_days}</span>
              </div>
              {doc.bio && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{doc.bio}</p>}
              <button className="btn btn-primary btn-block" onClick={() => openBooking(doc)}>📅 Book Appointment</button>
            </div>
          ))}
        </div>
      )}

      {/* ══ BOOKING MODAL ══ */}
      {showModal && selectedDoctor && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
          onClick={e => e.target===e.currentTarget && closeModal()}>
          <div style={{ background:'white',borderRadius:20,width:'100%',maxWidth:560,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.35)',display:'flex',flexDirection:'column' }}>

            {/* Modal header */}
            <div style={{ padding:'18px 24px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center',position:'sticky',top:0,background:'white',zIndex:2 }}>
              <div className="doctor-avatar" style={{ width:40,height:40,fontSize:17,flexShrink:0 }}>{selectedDoctor.full_name[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700 }}>Dr. {selectedDoctor.full_name}</div>
                <div style={{ fontSize:12,color:'var(--primary)' }}>{selectedDoctor.specialization} · ₹{selectedDoctor.consultation_fee}</div>
              </div>
              <button onClick={closeModal} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-muted)' }}>✕</button>
            </div>

            {/* Step bar */}
            {step < 3 && (
              <div style={{ display:'flex',padding:'12px 24px',borderBottom:'1px solid var(--border)',gap:0 }}>
                {STEPS.slice(0,3).map((s,i) => (
                  <div key={i} style={{ display:'flex',alignItems:'center',flex:1 }}>
                    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                      <div style={{ width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,
                        background:i<step?'var(--primary)':i===step?'var(--primary)':'var(--border)',
                        color:i<=step?'white':'var(--text-muted)',transition:'all 0.2s' }}>
                        {i < step ? '✓' : s.icon}
                      </div>
                      <span style={{ fontSize:10,fontWeight:i===step?600:400,color:i===step?'var(--primary)':'var(--text-muted)',textAlign:'center',lineHeight:1.2 }}>{s.label}</span>
                    </div>
                    {i < 2 && <div style={{ flex:1,height:2,margin:'0 4px',marginBottom:14,background:i<step?'var(--primary)':'var(--border)',borderRadius:2,transition:'all 0.2s' }}/>}
                  </div>
                ))}
              </div>
            )}

            {/* ─── STEP 0: Date & Time ─── */}
            {step === 0 && (
              <div style={{ padding:'20px 24px' }}>
                <div className="form-group">
                  <label className="form-label">Select Date *</label>
                  <input className="form-control" type="date" min={today} value={selectedDate} onChange={e => handleDateChange(e.target.value)} />
                </div>
                {slotsLoading && <div style={{ textAlign:'center',padding:24 }}><div className="spinner"/></div>}
                {!slotsLoading && slots.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Select Time *</label>
                    <div className="slots-grid">
                      {slots.map(s => (
                        <button key={s.time} className={`slot-btn ${selectedSlot===s.time?'selected':''}`}
                          disabled={!s.available} onClick={() => setSelectedSlot(s.time)}>{s.time}</button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDate && !slotsLoading && slots.length === 0 && (
                  <div style={{ padding:14,background:'var(--bg)',borderRadius:8,fontSize:13,color:'var(--text-muted)',textAlign:'center' }}>No slots on this date</div>
                )}
              </div>
            )}

            {/* ─── STEP 1: Reason & Note ─── */}
            {step === 1 && (
              <div style={{ padding:'20px 24px' }}>
                <div className="form-group">
                  <label className="form-label">Reason for Visit</label>
                  <textarea className="form-control" rows={3} placeholder="Describe symptoms or reason for appointment..."
                    value={reason} onChange={e => setReason(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Note to Doctor <span style={{ color:'var(--text-muted)',fontSize:12 }}>(optional)</span></label>
                  <textarea className="form-control" rows={3}
                    placeholder="Any extra info — current medications, allergies, recent history..."
                    value={patientNote} onChange={e => setPatientNote(e.target.value)} />
                </div>
              </div>
            )}

            {/* ─── STEP 2: Upload Document ─── */}
            {step === 2 && (
              <div style={{ padding:'20px 24px' }}>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontWeight:600,fontSize:15,marginBottom:4 }}>📎 Attach a Medical Document</div>
                  <div style={{ fontSize:13,color:'var(--text-muted)' }}>
                    Optionally share an X-Ray, blood report, MRI, or any document for the doctor to review.
                  </div>
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleDocFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border:`2px dashed ${dragOver?'var(--primary)':docFileData?'#40916c':'var(--border)'}`,
                    borderRadius:14,padding:'28px 20px',textAlign:'center',cursor:'pointer',
                    background:dragOver?'var(--success-light)':docFileData?'#f0fff4':'var(--bg)',marginBottom:14,transition:'all 0.2s' }}>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }}
                    onChange={e => handleDocFile(e.target.files[0])} />
                  {docFileData ? (
                    <div>
                      <div style={{ fontSize:44,marginBottom:10 }}>{docFileType?.includes('pdf')?'📄':'🖼️'}</div>
                      <div style={{ fontWeight:700,color:'#2d6a4f',fontSize:14 }}>✅ {docFileName}</div>
                      <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>{docFile && formatSize(docFile.size)} · Click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:44,marginBottom:10 }}>📁</div>
                      <div style={{ fontWeight:600,fontSize:14,marginBottom:4 }}>Drop file here or click to browse</div>
                      <div style={{ fontSize:12,color:'var(--text-muted)' }}>X-Ray · Blood Report · MRI · ECG · Prescription</div>
                      <div style={{ fontSize:11,color:'var(--text-light)',marginTop:4 }}>JPG, PNG, PDF — max 10MB</div>
                    </div>
                  )}
                </div>

                {docFileData && (
                  <div className="form-group">
                    <label className="form-label">Document Label</label>
                    <input className="form-control" placeholder="e.g. Chest X-Ray — November 2024"
                      value={docTitle} onChange={e => setDocTitle(e.target.value)} />
                  </div>
                )}

                <div style={{ padding:'10px 14px',background:'#fffbeb',borderRadius:10,fontSize:13,border:'1px solid #fde68a',color:'#92400e' }}>
                  💡 This step is optional — you can skip and confirm the appointment without a document
                </div>
              </div>
            )}

            {/* ─── STEP 3: Confirmed ─── */}
            {step === 3 && (
              <div style={{ padding:'32px 24px',textAlign:'center' }}>
                <div style={{ fontSize:70,marginBottom:16 }}>🎉</div>
                <h2 style={{ fontFamily:'var(--font-display)',fontSize:24,color:'var(--primary)',marginBottom:8 }}>Appointment Confirmed!</h2>
                <p style={{ fontSize:14,color:'var(--text-muted)',marginBottom:24 }}>
                  Your appointment with <b>Dr. {selectedDoctor.full_name}</b> on <b>{selectedDate}</b> at <b>{selectedSlot}</b> is booked.
                </p>

                <div style={{ background:'var(--bg)',borderRadius:14,padding:'16px 20px',marginBottom:20,textAlign:'left' }}>
                  <div style={{ display:'flex',flexDirection:'column',gap:8,fontSize:13 }}>
                    <div>👨‍⚕️ <b>Dr. {selectedDoctor.full_name}</b> · {selectedDoctor.specialization}</div>
                    <div>🏥 {selectedDoctor.hospital_name}</div>
                    <div>📅 {selectedDate} at {selectedSlot}</div>
                    {reason && <div>📝 {reason}</div>}
                    {docFileData
                      ? <div style={{ color:'#2d6a4f',fontWeight:600 }}>📎 Document attached: {docFileName}</div>
                      : <div style={{ color:'var(--text-muted)' }}>📎 No document attached</div>}
                  </div>
                </div>

                {/* Post-booking doc attach if skipped */}
                {!docFileData && bookedId && (
                  <div style={{ padding:'14px',background:'var(--bg)',borderRadius:12,border:'1px dashed var(--border)',marginBottom:20,textAlign:'left' }}>
                    <div style={{ fontWeight:600,fontSize:13,marginBottom:6 }}>📎 Want to attach a document now?</div>
                    <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:10 }}>You can still attach a report for the doctor to review.</div>
                    <div onClick={() => fileRef.current?.click()} style={{ border:'2px dashed var(--border)',borderRadius:10,padding:12,textAlign:'center',cursor:'pointer',background:'white',marginBottom:docFileData?10:0 }}>
                      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={e => handleDocFile(e.target.files[0])} />
                      {docFileData ? <span style={{ color:'var(--primary)',fontWeight:600 }}>✅ {docFileName}</span>
                        : <span style={{ fontSize:13,color:'var(--text-muted)' }}>📁 Click to choose file</span>}
                    </div>
                    {docFileData && (
                      <button className="btn btn-primary btn-block" style={{ marginTop:8 }} onClick={attachDocAfterBooking} disabled={uploadingDoc}>
                        {uploadingDoc ? '⏳ Uploading...' : '📎 Attach to Appointment'}
                      </button>
                    )}
                  </div>
                )}

                <button className="btn btn-primary btn-block btn-lg" onClick={closeModal}>✅ Done</button>
              </div>
            )}

            {/* Footer */}
            {step < 3 && (
              <div style={{ padding:'14px 24px',borderTop:'1px solid var(--border)',display:'flex',gap:10,position:'sticky',bottom:0,background:'white' }}>
                {step > 0
                  ? <button className="btn btn-outline" onClick={() => setStep(s=>s-1)}>← Back</button>
                  : <button className="btn btn-outline" onClick={closeModal}>Cancel</button>}
                <div style={{ flex:1 }}/>
                {step < 2 && (
                  <button className="btn btn-primary" onClick={() => setStep(s=>s+1)} disabled={!canNext}>
                    Next →
                  </button>
                )}
                {step === 2 && (
                  <button className="btn btn-primary btn-lg" onClick={handleBook} disabled={booking}>
                    {booking ? '⏳ Booking...' : '✅ Confirm Appointment'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
