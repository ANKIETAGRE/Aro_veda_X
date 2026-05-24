import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const DOC_TYPES = [
  { type: 'X-Ray',            icon: '🩻', category: 'Radiology',   color: '#1d3557' },
  { type: 'MRI Scan',         icon: '🧲', category: 'Radiology',   color: '#2563eb' },
  { type: 'CT Scan',          icon: '💿', category: 'Radiology',   color: '#4895ef' },
  { type: 'Ultrasound',       icon: '📡', category: 'Radiology',   color: '#0ea5e9' },
  { type: 'Blood Test',       icon: '🩸', category: 'Pathology',   color: '#e63946' },
  { type: 'Urine Test',       icon: '🧪', category: 'Pathology',   color: '#f4a261' },
  { type: 'Biopsy Report',    icon: '🔬', category: 'Pathology',   color: '#d62828' },
  { type: 'ECG',              icon: '💓', category: 'Cardiology',  color: '#e63946' },
  { type: 'Echocardiogram',   icon: '🫀', category: 'Cardiology',  color: '#c1121f' },
  { type: 'Prescription',     icon: '📋', category: 'General',     color: '#2d6a4f' },
  { type: 'Discharge Summary',icon: '📄', category: 'General',     color: '#40916c' },
  { type: 'Vaccination',      icon: '💉', category: 'General',     color: '#52b788' },
  { type: 'Eye Report',       icon: '👁️', category: 'Ophthalmology',color: '#7b2d8b' },
  { type: 'Dental Report',    icon: '🦷', category: 'Dental',      color: '#6b7280' },
  { type: 'Allergy Report',   icon: '🤧', category: 'General',     color: '#f97316' },
  { type: 'Other',            icon: '📁', category: 'General',     color: '#9ca3af' },
];

const ACCEPTED_TYPES = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';
const MAX_SIZE_MB = 10;

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function MedicalDocuments() {
  const { patientId } = useApp();
  const [docs, setDocs]           = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [importantOnly, setImportant] = useState(false);
  const [showUpload, setShowUpload]   = useState(false);
  const [viewDoc, setViewDoc]         = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: '', doc_type: 'X-Ray', description: '',
    doctor_name: '', hospital_name: '', report_date: '',
    tags: '', is_important: false,
    file: null, file_data: '', file_name: '', file_type: '', file_size: 0,
  });

  useEffect(() => { loadDocs(); }, [patientId]);
  useEffect(() => { applyFilters(); }, [docs, search, typeFilter, importantOnly]);

  const loadDocs = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const r = await API.get(`/documents/patient/${patientId}`);
      setDocs(r.data);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let r = [...docs];
    if (search) { const s = search.toLowerCase(); r = r.filter(d => d.title.toLowerCase().includes(s) || (d.doc_type||'').toLowerCase().includes(s) || (d.doctor_name||'').toLowerCase().includes(s) || (d.tags||'').toLowerCase().includes(s)); }
    if (typeFilter !== 'All') r = r.filter(d => d.doc_type === typeFilter);
    if (importantOnly) r = r.filter(d => d.is_important);
    setFiltered(r);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`File too large. Max ${MAX_SIZE_MB}MB allowed.`); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const autoTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setForm(p => ({ ...p, file, file_data: e.target.result, file_name: file.name, file_type: file.type, file_size: file.size, title: p.title || autoTitle }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file_data) { toast.error('Please select a file'); return; }
    if (!form.title)     { toast.error('Please enter a title'); return; }
    setUploading(true);
    try {
      const docInfo = DOC_TYPES.find(d => d.type === form.doc_type) || DOC_TYPES[0];
      await API.post('/documents/upload', {
        patient_id:    patientId,
        title:         form.title,
        doc_type:      form.doc_type,
        category:      docInfo.category,
        description:   form.description,
        file_data:     form.file_data,
        file_name:     form.file_name,
        file_type:     form.file_type,
        file_size:     form.file_size,
        doctor_name:   form.doctor_name,
        hospital_name: form.hospital_name,
        report_date:   form.report_date,
        tags:          form.tags,
        is_important:  form.is_important,
      });
      toast.success('Document uploaded successfully! 📄');
      setShowUpload(false);
      setForm({ title:'', doc_type:'X-Ray', description:'', doctor_name:'', hospital_name:'', report_date:'', tags:'', is_important:false, file:null, file_data:'', file_name:'', file_type:'', file_size:0 });
      loadDocs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const openDoc = async (doc) => {
    setViewLoading(true);
    setViewDoc({ ...doc, loading: true });
    try {
      const r = await API.get(`/documents/${doc.id}`);
      setViewDoc(r.data);
    } catch { toast.error('Failed to open document'); setViewDoc(null); }
    finally { setViewLoading(false); }
  };

  const toggleImportant = async (doc, e) => {
    e.stopPropagation();
    try {
      const r = await API.patch(`/documents/${doc.id}/important`);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_important: r.data.is_important } : d));
      toast.success(r.data.is_important ? '⭐ Marked as important' : 'Removed from important');
    } catch { toast.error('Failed to update'); }
  };

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/documents/${doc.id}`);
      toast.success('Document deleted');
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      if (viewDoc?.id === doc.id) setViewDoc(null);
    } catch { toast.error('Delete failed'); }
  };

  const downloadDoc = (doc) => {
    if (!doc.file_data) return;
    const a = document.createElement('a');
    a.href = doc.file_data;
    a.download = doc.file_name;
    a.click();
  };

  const getDocInfo = (type) => DOC_TYPES.find(d => d.type === type) || DOC_TYPES[DOC_TYPES.length - 1];

  const stats = {
    total:     docs.length,
    important: docs.filter(d => d.is_important).length,
    images:    docs.filter(d => d.file_type?.startsWith('image/')).length,
    pdfs:      docs.filter(d => d.file_type === 'application/pdf').length,
  };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:4 }}>📂 Medical Documents</h1>
          <p style={{ color:'var(--text-muted)' }}>Store and access all your medical reports, scans & prescriptions</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowUpload(true)} style={{ display:'flex', alignItems:'center', gap:8 }}>
          ➕ Upload Document
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger" style={{ marginBottom:20 }}>
        {[
          { label:'Total Documents', value:stats.total,     icon:'📁', color:'var(--primary)' },
          { label:'Important',       value:stats.important, icon:'⭐', color:'#f4a261' },
          { label:'Images & Scans',  value:stats.images,    icon:'🖼️', color:'#4895ef' },
          { label:'PDF Reports',     value:stats.pdfs,      icon:'📄', color:'#e63946' },
        ].map((s,i) => (
          <div key={i} className="stat-card card">
            <div className="card-body" style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ fontSize:32 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ padding:'12px 18px' }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <input className="form-control" style={{ maxWidth:240 }} placeholder="🔎 Search documents..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-control" style={{ maxWidth:180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              {DOC_TYPES.map(d => <option key={d.type} value={d.type}>{d.icon} {d.type}</option>)}
            </select>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', padding:'7px 14px', background:importantOnly?'#fff8e1':'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
              <input type="checkbox" checked={importantOnly} onChange={e => setImportant(e.target.checked)} />
              ⭐ Important Only
            </label>
            <span style={{ marginLeft:'auto', fontSize:13, color:'var(--text-muted)' }}>{filtered.length} document{filtered.length!==1?'s':''}</span>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="loading-center"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>{docs.length === 0 ? 'No documents yet' : 'No documents match'}</h3>
          <p>{docs.length === 0 ? 'Upload your first medical document' : 'Try a different search or filter'}</p>
          {docs.length === 0 && <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowUpload(true)}>➕ Upload Document</button>}
        </div></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {filtered.map(doc => {
            const info = getDocInfo(doc.doc_type);
            return (
              <div key={doc.id} onClick={() => openDoc(doc)}
                className="card doctor-card"
                style={{ cursor:'pointer', border: doc.is_important ? '2px solid #f4a261' : '1px solid var(--border)' }}>
                {/* Preview area */}
                <div style={{ height:140, background:`${info.color}11`, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'var(--radius) var(--radius) 0 0', position:'relative', overflow:'hidden' }}>
                  <span style={{ fontSize:56 }}>{info.icon}</span>
                  {doc.is_important && <div style={{ position:'absolute', top:10, right:10, fontSize:18 }}>⭐</div>}
                  <div style={{ position:'absolute', bottom:8, left:10, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:info.color, color:'white' }}>{doc.doc_type}</div>
                  <div style={{ position:'absolute', bottom:8, right:10, padding:'3px 8px', borderRadius:6, fontSize:10, background:'rgba(0,0,0,0.35)', color:'white' }}>
                    {doc.file_type?.includes('pdf') ? '📄 PDF' : '🖼️ Image'}
                  </div>
                </div>
                {/* Info */}
                <div className="card-body" style={{ padding:'12px 14px' }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:4, lineHeight:1.3 }}>{doc.title}</div>
                  {doc.doctor_name   && <div style={{ fontSize:12, color:'var(--text-muted)' }}>👨‍⚕️ {doc.doctor_name}</div>}
                  {doc.hospital_name && <div style={{ fontSize:12, color:'var(--text-muted)' }}>🏥 {doc.hospital_name}</div>}
                  {doc.report_date   && <div style={{ fontSize:12, color:'var(--text-muted)' }}>📅 {doc.report_date}</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                    <span style={{ fontSize:11, color:'var(--text-light)' }}>{formatSize(doc.file_size)}</span>
                    <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                      <button title={doc.is_important ? 'Unmark important' : 'Mark important'}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'2px 4px' }}
                        onClick={(e) => toggleImportant(doc, e)}>
                        {doc.is_important ? '⭐' : '☆'}
                      </button>
                      <button title="Delete"
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, padding:'2px 4px', color:'#e63946' }}
                        onClick={(e) => { e.stopPropagation(); deleteDoc(doc); }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowUpload(false)}>
          <div className="modal-content" style={{ background:'white', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 32px 64px rgba(0,0,0,0.25)' }}>
            <div style={{ padding:'24px 28px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'white', zIndex:1 }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:22 }}>📤 Upload Medical Document</h2>
              <button style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text-muted)' }} onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <form onSubmit={handleUpload} style={{ padding:'24px 28px' }}>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--primary)' : form.file_data ? '#40916c' : 'var(--border)'}`,
                  borderRadius:14, padding:'28px 20px', textAlign:'center', cursor:'pointer',
                  background: dragOver ? 'var(--success-light)' : form.file_data ? '#f0fff4' : 'var(--bg)',
                  marginBottom:20, transition:'all 0.2s'
                }}>
                <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} style={{ display:'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
                {form.file_data ? (
                  <div>
                    <div style={{ fontSize:36, marginBottom:8 }}>{form.file_type?.includes('pdf') ? '📄' : '🖼️'}</div>
                    <div style={{ fontWeight:600, fontSize:14, color:'var(--primary)', marginBottom:4 }}>✅ {form.file_name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{formatSize(form.file_size)} · Click to change</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:40, marginBottom:10 }}>📁</div>
                    <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>Drop file here or click to browse</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>JPG, PNG, PDF up to {MAX_SIZE_MB}MB</div>
                    <div style={{ fontSize:11, color:'var(--text-light)', marginTop:4 }}>X-Ray, MRI, Blood Reports, Prescriptions, etc.</div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Document Title *</label>
                <input className="form-control" required placeholder="e.g. Chest X-Ray – January 2025"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Document Type *</label>
                  <select className="form-control" value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                    {DOC_TYPES.map(d => <option key={d.type} value={d.type}>{d.icon} {d.type}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Report Date</label>
                  <input className="form-control" type="date"
                    value={form.report_date} onChange={e => setForm(p => ({ ...p, report_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor Name</label>
                  <input className="form-control" placeholder="Dr. Name"
                    value={form.doctor_name} onChange={e => setForm(p => ({ ...p, doctor_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hospital / Clinic</label>
                  <input className="form-control" placeholder="Hospital name"
                    value={form.hospital_name} onChange={e => setForm(p => ({ ...p, hospital_name: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-control" rows={2} placeholder="Any notes about this document..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input className="form-control" placeholder="e.g. lungs, chest, 2025"
                  value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>

              <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, cursor:'pointer', marginBottom:20, padding:'10px 14px', background:'#fff8e1', borderRadius:8 }}>
                <input type="checkbox" checked={form.is_important} onChange={e => setForm(p => ({ ...p, is_important: e.target.checked }))} />
                ⭐ Mark as Important
              </label>

              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary btn-lg" type="submit" disabled={uploading} style={{ flex:1 }}>
                  {uploading ? '⏳ Uploading...' : '📤 Upload Document'}
                </button>
                <button className="btn btn-outline btn-lg" type="button" onClick={() => setShowUpload(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW DOCUMENT MODAL ── */}
      {viewDoc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          className="modal-overlay" onClick={e => e.target===e.currentTarget && setViewDoc(null)}>
          <div className="modal-content" style={{ background:'white', borderRadius:20, width:'100%', maxWidth:780, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 32px 64px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center', position:'sticky', top:0, background:'white', zIndex:1 }}>
              <span style={{ fontSize:28 }}>{getDocInfo(viewDoc.doc_type)?.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>{viewDoc.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{viewDoc.doc_type} {viewDoc.report_date && `· ${viewDoc.report_date}`}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => downloadDoc(viewDoc)}>⬇️ Download</button>
                <button className="btn btn-outline btn-sm" onClick={() => { deleteDoc(viewDoc); setViewDoc(null); }} style={{ color:'#e63946', borderColor:'#e63946' }}>🗑️</button>
                <button style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text-muted)' }} onClick={() => setViewDoc(null)}>✕</button>
              </div>
            </div>

            {/* File preview */}
            <div style={{ padding:'0' }}>
              {viewDoc.loading ? (
                <div className="loading-center" style={{ padding:60 }}><div className="spinner"/></div>
              ) : viewDoc.file_data ? (
                viewDoc.file_type?.includes('pdf') ? (
                  <iframe src={viewDoc.file_data} title={viewDoc.title}
                    style={{ width:'100%', height:520, border:'none', display:'block' }} />
                ) : viewDoc.file_type?.startsWith('image/') ? (
                  <div style={{ textAlign:'center', padding:'16px', background:'#111' }}>
                    <img src={viewDoc.file_data} alt={viewDoc.title}
                      style={{ maxWidth:'100%', maxHeight:500, objectFit:'contain', borderRadius:8 }} />
                  </div>
                ) : (
                  <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
                    <p>Preview not available. Click Download to view this file.</p>
                    <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => downloadDoc(viewDoc)}>⬇️ Download File</button>
                  </div>
                )
              ) : null}
            </div>

            {/* Meta info */}
            <div style={{ padding:'16px 24px 24px', borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, fontSize:13 }}>
                {viewDoc.doctor_name   && <div style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:8 }}>👨‍⚕️ <b>Doctor:</b> {viewDoc.doctor_name}</div>}
                {viewDoc.hospital_name && <div style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:8 }}>🏥 <b>Hospital:</b> {viewDoc.hospital_name}</div>}
                {viewDoc.report_date   && <div style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:8 }}>📅 <b>Date:</b> {viewDoc.report_date}</div>}
                {viewDoc.file_size     && <div style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:8 }}>📦 <b>Size:</b> {formatSize(viewDoc.file_size)}</div>}
                {viewDoc.description   && <div style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:8, gridColumn:'1/-1' }}>📝 {viewDoc.description}</div>}
                {viewDoc.tags          && <div style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:8, gridColumn:'1/-1' }}>🏷️ {viewDoc.tags.split(',').map((t,i) => <span key={i} style={{ margin:'0 4px', padding:'2px 8px', background:'var(--border)', borderRadius:99, fontSize:12 }}>{t.trim()}</span>)}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
