import { useState, useEffect } from 'react';
import { patientAPI } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function SymptomChecker() {
  const { patientId } = useApp();
  const navigate = useNavigate();
  const [allSymptoms, setAllSymptoms] = useState([]);
  const [selected, setSelected]       = useState([]);
  const [search, setSearch]           = useState('');
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [expanded, setExpanded]       = useState(0);
  const [chemistShops, setChemistShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);

  useEffect(() => { patientAPI.getSymptoms().then(r => setAllSymptoms(r.data)).catch(()=>{}); }, []);

  const filtered = allSymptoms.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(s.name)
  );

  const toggleSymptom = (name) => setSelected(prev => prev.includes(name) ? prev.filter(s=>s!==name) : [...prev,name]);

  const handlePredict = async () => {
    if (selected.length === 0) { toast.error('Please select at least one symptom'); return; }
    setLoading(true); setResults(null); setChemistShops([]);
    try {
      const res = await patientAPI.predict({ symptoms: selected, patient_id: patientId });
      setResults(res.data.results);
      if (res.data.results.length > 0) fetchNearbyChemists();
    } catch { toast.error('Prediction failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const fetchNearbyChemists = async () => {
    setLoadingShops(true);
    try {
      const res = await API.get('/chemists/');
      setChemistShops(res.data.slice(0, 6)); // top 6 nearby
    } catch {} finally { setLoadingShops(false); }
  };

  const openGoogleMapsForShop = (shop) => {
    if (!navigator.geolocation) {
      // Open shop location without directions
      window.open(`https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`, '_blank');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${shop.latitude},${shop.longitude}&travelmode=walking&dir_action=navigate`;
        window.open(url, '_blank');
      },
      () => window.open(`https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`, '_blank')
    );
  };

  const SEVERITY_COLOR = { Mild:'badge-mild', Moderate:'badge-moderate', Severe:'badge-severe' };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--text)', marginBottom:6 }}>🔍 Symptom Checker</h1>
        <p style={{ color:'var(--text-muted)' }}>Select your symptoms and we'll predict possible conditions using AI + rule-based analysis</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:20, alignItems:'start' }}>

        {/* LEFT: Symptom selector */}
        <div>
          <div className="card">
            <div className="card-header"><h2>Select Symptoms</h2></div>
            <div className="card-body">
              <input className="form-control" placeholder="🔍 Search symptoms..."
                value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:14 }} />
              <div style={{ maxHeight:280, overflowY:'auto', marginBottom:14 }}>
                {filtered.map(s => (
                  <div key={s.id} onClick={() => toggleSymptom(s.name)}
                    className="symptom-tag"
                    style={{ padding:'8px 12px', marginBottom:6, borderRadius:8, cursor:'pointer', border:'1px solid var(--border)', background:'var(--bg)', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all 0.15s' }}>
                    <span>{s.name}</span>
                    <span style={{ color:'var(--text-light)', fontSize:11 }}>+ Add</span>
                  </div>
                ))}
                {filtered.length === 0 && search && <p style={{ color:'var(--text-muted)', fontSize:13, padding:'8px 0' }}>No symptoms found</p>}
              </div>

              {selected.length > 0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:'var(--text-muted)' }}>Selected ({selected.length}):</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                    {selected.map(s => (
                      <span key={s} onClick={() => toggleSymptom(s)}
                        className="symptom-tag"
                        style={{ padding:'5px 12px', borderRadius:99, background:'var(--primary)', color:'white', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                        {s} ✕
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-block btn-lg" onClick={handlePredict} disabled={loading || selected.length===0}>
                {loading ? '⏳ Analyzing...' : `🧠 Analyze ${selected.length} Symptom${selected.length!==1?'s':''}`}
              </button>
              {selected.length > 0 && (
                <button className="btn btn-outline btn-block" style={{ marginTop:8 }} onClick={() => { setSelected([]); setResults(null); setChemistShops([]); }}>
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div>
          {loading && (
            <div className="card"><div className="card-body" style={{ textAlign:'center', padding:48 }}>
              <div className="spinner" style={{ margin:'0 auto 16px' }}/>
              <p style={{ color:'var(--text-muted)' }}>Running AI + rule-based analysis...</p>
            </div></div>
          )}

          {results && results.length === 0 && (
            <div className="card"><div className="empty-state">
              <div className="empty-icon">🤔</div>
              <h3>No matches found</h3>
              <p>Try adding more symptoms for better results</p>
            </div></div>
          )}

          {results && results.length > 0 && (
            <div className="animate-slide">
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>
                ⚠️ For informational purposes only. Please consult a doctor for diagnosis.
              </p>

              {results.map((r, i) => (
                <div key={i} className="prediction-card disease-card">
                  <div className="prediction-header" onClick={() => setExpanded(expanded===i?-1:i)}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:i===0?'var(--primary)':i===1?'var(--accent)':'var(--border)', color:i<2?'white':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>#{i+1}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:15 }}>{r.disease.name}</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{r.disease.specialization} · {r.method}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700, fontSize:18, color:'var(--primary)' }}>{r.confidence}%</div>
                      <span className={`badge ${SEVERITY_COLOR[r.disease.severity]}`}>{r.disease.severity}</span>
                    </div>
                  </div>

                  <div className="confidence-bar" style={{ margin:'0 20px' }}>
                    <div className="confidence-fill progress-bar-animated" style={{ width:`${r.confidence}%` }}/>
                  </div>

                  {expanded === i && (
                    <div className="prediction-body animate-fade">
                      <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:16 }}>{r.disease.description}</p>

                      {/* MEDICINES with availability */}
                      {r.medicines.length > 0 && (
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontWeight:600, fontSize:14, marginBottom:10 }}>💊 Suggested Medicines</div>
                          {r.medicines.map((m, j) => (
                            <div key={j} style={{ background:'var(--bg)', borderRadius:10, padding:'12px 14px', marginBottom:8, border:'1px solid var(--border)' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                <div>
                                  <div style={{ fontWeight:600, fontSize:13 }}>{m.name} <span style={{ fontWeight:400, color:'var(--text-muted)', fontSize:12 }}>({m.type})</span></div>
                                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>📋 {m.dosage}</div>
                                </div>
                                <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, background:'var(--success-light)', color:'var(--primary)', fontWeight:600, flexShrink:0, marginLeft:8 }}>
                                  ✅ Available nearby
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* NEARBY CHEMISTS for these medicines */}
                      {r.medicines.length > 0 && (
                        <div style={{ marginBottom:16, padding:'14px', background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', borderRadius:12, border:'1px solid #74c69d' }}>
                          <div style={{ fontWeight:700, fontSize:14, marginBottom:10, color:'#1b4332', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span>🏪 Get Medicines From Nearby Chemists</span>
                            <button className="btn btn-sm btn-primary" onClick={() => navigate('/patient/chemists')}>
                              View All Chemists →
                            </button>
                          </div>

                          {loadingShops && <div style={{ textAlign:'center', padding:12 }}><div className="spinner" style={{ width:20, height:20, borderWidth:2 }}/></div>}

                          {!loadingShops && chemistShops.length > 0 && (
                            <div style={{ display:'grid', gap:8 }}>
                              {chemistShops.slice(0,4).map(shop => (
                                <div key={shop.id} style={{ background:'white', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>💊 {shop.name}</div>
                                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>📍 {shop.area} · ⭐{shop.rating}</div>
                                    <div style={{ display:'flex', gap:5, marginTop:3 }}>
                                      {shop.is_24hrs      && <span style={{ fontSize:10, padding:'1px 5px', borderRadius:99, background:'#fff0f0', color:'#e63946', fontWeight:600 }}>🔴 24h</span>}
                                      {shop.home_delivery && <span style={{ fontSize:10, padding:'1px 5px', borderRadius:99, background:'var(--success-light)', color:'var(--primary)', fontWeight:600 }}>🛵 Delivery</span>}
                                    </div>
                                  </div>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => openGoogleMapsForShop(shop)}
                                    style={{ background:'#1a73e8', flexShrink:0, fontSize:11, padding:'6px 10px' }}>
                                    🗺️ Directions
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {r.precautions.length > 0 && (
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontWeight:600, fontSize:14, marginBottom:10 }}>🛡️ Precautions</div>
                          {r.precautions.map((p,j) => (
                            <div key={j} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13 }}>
                              <span>•</span><span>{p}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <Link to={`/patient/doctors?specialization=${encodeURIComponent(r.disease.specialization||'')}`} className="btn btn-primary btn-sm">
                          Find {r.disease.specialization} →
                        </Link>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate('/patient/chemists')}>
                          💊 All Chemists →
                        </button>
                      </div>
                    </div>
                  )}

                  {expanded !== i && (
                    <div style={{ padding:'8px 20px 12px', fontSize:12, color:'var(--primary)', cursor:'pointer' }} onClick={() => setExpanded(i)}>
                      Show details ↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!results && !loading && (
            <div className="card"><div className="empty-state">
              <div className="empty-icon">🧬</div>
              <h3>Select your symptoms</h3>
              <p>Choose symptoms from the left panel and click Analyze</p>
            </div></div>
          )}
        </div>
      </div>
    </div>
  );
}
