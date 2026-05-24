import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const TYPE_COLORS = {
  'Government':      '#2d6a4f',
  'Super Specialty': '#1d3557',
  'Multi Specialty': '#4895ef',
  'Private':         '#f4a261',
  'Nursing Home':    '#e63946',
  'Clinic':          '#7b2d8b',
};
const TYPE_EMOJI = {
  'Government':'🏛️','Super Specialty':'🏥','Multi Specialty':'🏨',
  'Private':'🏪','Nursing Home':'🏠','Clinic':'🩺',
};
const TRAVEL_MODES = [
  { key:'driving',   label:'🚗 Drive',  gmaps:'driving'  },
  { key:'walking',   label:'🚶 Walk',   gmaps:'walking'  },
  { key:'bicycling', label:'🚴 Cycle',  gmaps:'bicycling'},
  { key:'transit',   label:'🚌 Bus',    gmaps:'transit'  },
];

export default function NearbyHospitals() {
  const [hospitals, setHospitals]       = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locStatus, setLocStatus]       = useState('detecting');
  const [mapLoaded, setMapLoaded]       = useState(false);
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [emergencyOnly, setEmergency]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [travelMode, setTravelMode]     = useState('driving');
  const [manualAddr, setManualAddr]     = useState('');
  const [showManual, setShowManual]     = useState(false);
  const [geocoding, setGeocoding]       = useState(false);

  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);
  const userMarker  = useRef(null);

  useEffect(() => { loadHospitals(); loadLeaflet(); detectLocation(); }, []);
  useEffect(() => { applyFilters(); }, [hospitals, search, typeFilter, emergencyOnly]);
  useEffect(() => { if (mapLoaded && mapRef.current && !mapInstance.current) initMap(); }, [mapLoaded]);
  useEffect(() => { if (mapInstance.current && filtered.length > 0) updateMarkers(); }, [filtered, mapLoaded, selected]);
  useEffect(() => { placeUserMarker(); }, [userLocation, mapLoaded]);

  const loadHospitals = async () => {
    try { const r = await API.get('/hospitals/'); setHospitals(r.data); setFiltered(r.data); }
    catch {} finally { setLoading(false); }
  };

  const loadLeaflet = () => {
    if (window.L) { setMapLoaded(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => setMapLoaded(true);
    document.head.appendChild(s);
  };

  // ── LOCATION DETECTION ─────────────────────────────────────────
  const detectLocation = () => {
    setLocStatus('detecting');
    if (!navigator.geolocation) { setLocStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocStatus('found');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── GEOCODE manual address via Nominatim ───────────────────────
  const geocodeAddress = async () => {
    if (!manualAddr.trim()) return;
    setGeocoding(true);
    try {
      const q = encodeURIComponent(manualAddr + ', Jaipur, Rajasthan, India');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setUserLocation(loc);
        setLocStatus('manual');
        setShowManual(false);
        setManualAddr('');
        if (mapInstance.current) mapInstance.current.setView([loc.lat, loc.lng], 14);
      } else {
        alert('Address not found. Try adding more detail like area name.');
      }
    } catch { alert('Search failed. Check internet connection.'); }
    finally { setGeocoding(false); }
  };

  // ── PLACE USER MARKER ──────────────────────────────────────────
  const placeUserMarker = () => {
    if (!window.L || !mapInstance.current || !userLocation) return;
    const L = window.L;
    if (userMarker.current) { userMarker.current.remove(); userMarker.current = null; }

    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:22px;height:22px">
        <div style="width:22px;height:22px;background:#4895ef;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(72,149,239,0.6);position:relative;z-index:2;display:flex;align-items:center;justify-content:center;font-size:11px">📍</div>
        <div style="position:absolute;top:-4px;left:-4px;width:30px;height:30px;background:#4895ef33;border-radius:50%;animation:ripple 2s infinite"></div>
      </div>`,
      iconSize: [22, 22], iconAnchor: [11, 11]
    });
    userMarker.current = L.marker([userLocation.lat, userLocation.lng], { icon, zIndexOffset: 9999 })
      .addTo(mapInstance.current)
      .bindPopup('<b>📍 Your Location</b>');
    mapInstance.current.setView([userLocation.lat, userLocation.lng], 13);
  };

  const initMap = () => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([26.9124, 75.7873], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    // Click map to set location manually
    map.on('click', (e) => {
      setUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      setLocStatus('manual');
    });

    mapInstance.current = map;
  };

  const updateMarkers = () => {
    if (!window.L || !mapInstance.current) return;
    const L = window.L;
    markersRef.current.forEach(m => m.marker.remove());
    markersRef.current = [];

    filtered.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const color = TYPE_COLORS[h.hospital_type] || '#666';
      const emoji = TYPE_EMOJI[h.hospital_type] || '🏥';
      const isSel = selected?.id === h.id;
      const size  = isSel ? 44 : 34;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:${isSel?3:2}px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSel?19:15}px;box-shadow:0 3px ${isSel?18:10}px rgba(0,0,0,${isSel?.55:.28});cursor:pointer;transition:all .2s">${emoji}</div>`,
        iconSize: [size,size], iconAnchor: [size/2,size/2]
      });

      const marker = L.marker([parseFloat(h.latitude), parseFloat(h.longitude)], { icon })
        .addTo(mapInstance.current)
        .bindPopup(`<div style="font-family:DM Sans,sans-serif;min-width:200px">
          <b style="font-size:14px">${h.name}</b><br/>
          <span style="font-size:11px;color:${color};font-weight:600">${h.hospital_type}</span><br/>
          <hr style="margin:5px 0;border:none;border-top:1px solid #eee"/>
          <span style="font-size:12px">📍 ${h.address}</span><br/>
          <span style="font-size:12px">📞 ${h.phone}</span><br/>
          <span style="font-size:12px">⏰ ${h.timings}</span><br/>
          ${h.has_emergency ? '<span style="font-size:12px;color:#e63946">🚨 Emergency Available</span>' : ''}
        </div>`);

      marker.on('click', () => focusHospital(h));
      markersRef.current.push({ marker, hospital: h });
    });
  };

  // ── OPEN GOOGLE MAPS with exact directions ─────────────────────
  const openGoogleMaps = () => {
    if (!userLocation) {
      alert('Please set your location first!\n\n• Click "Detect My Location"\n• Or enter your address\n• Or click anywhere on the map');
      return;
    }
    if (!selected?.latitude) { alert('Hospital location not available.'); return; }

    const origin      = `${userLocation.lat},${userLocation.lng}`;
    const destination = `${selected.latitude},${selected.longitude}`;
    const mode        = TRAVEL_MODES.find(m => m.key === travelMode)?.gmaps || 'driving';

    // This URL opens Google Maps with exact turn-by-turn directions
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}&dir_action=navigate`;
    window.open(url, '_blank');
  };

  const applyFilters = () => {
    let r = [...hospitals];
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(h => h.name.toLowerCase().includes(s) || (h.area||'').toLowerCase().includes(s) || (h.specializations||'').toLowerCase().includes(s));
    }
    if (typeFilter !== 'All') r = r.filter(h => h.hospital_type === typeFilter);
    if (emergencyOnly)        r = r.filter(h => h.has_emergency);
    setFiltered(r);
  };

  const focusHospital = (h) => {
    setSelected(h);
    if (!mapInstance.current || !h.latitude) return;
    mapInstance.current.setView([parseFloat(h.latitude), parseFloat(h.longitude)], 15);
    markersRef.current.find(m => m.hospital.id === h.id)?.marker.openPopup();
  };

  const hospitalTypes = ['All','Government','Super Specialty','Multi Specialty','Private','Nursing Home','Clinic'];

  const locInfo = {
    detecting: { bg:'#fff3e0', color:'#b45309', icon:'⏳', text:'Detecting your location...' },
    found:     { bg:'#d8f3dc', color:'#1b4332', icon:'✅', text:'Using your live GPS location' },
    manual:    { bg:'#e0f0ff', color:'#1d4ed8', icon:'📌', text:'Using manually set location' },
    denied:    { bg:'#fff0f0', color:'#e63946', icon:'❌', text:'Location access denied — enter address or click on map' },
  }[locStatus];

  return (
    <div className="animate-fade">
      <style>{`
        @keyframes ripple{0%{transform:scale(1);opacity:.35}100%{transform:scale(3.5);opacity:0}}
        @keyframes emergencyPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.4)}50%{box-shadow:0 0 0 10px rgba(220,38,38,0)}}
        .amb-btn:hover{transform:scale(1.05)!important;filter:brightness(1.08)}
        .amb-btn:active{transform:scale(0.97)!important}
      `}</style>

      {/* EMERGENCY BANNER */}
      <div style={{ marginBottom:16, padding:'14px 20px', background:'linear-gradient(135deg,#7f1d1d,#dc2626)', borderRadius:14, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', animation:'emergencyPulse 2.5s infinite' }}>
        <div style={{ fontSize:34 }}>🚑</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'white', marginBottom:2 }}>Emergency? Call Ambulance Now</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)' }}>Tap a number — your phone dialer opens instantly, just like Google Maps directions</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <a href="tel:102" className="amb-btn"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', background:'white', color:'#dc2626', borderRadius:10, textDecoration:'none', fontWeight:800, fontSize:15, transition:'all 0.18s', boxShadow:'0 4px 14px rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>
            📞 102 <span style={{ fontSize:11, fontWeight:500, color:'#7f1d1d' }}>Ambulance</span>
          </a>
          <a href="tel:112" className="amb-btn"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', background:'rgba(255,255,255,0.15)', color:'white', border:'2px solid rgba(255,255,255,0.45)', borderRadius:10, textDecoration:'none', fontWeight:800, fontSize:15, transition:'all 0.18s', whiteSpace:'nowrap' }}>
            🆘 112 <span style={{ fontSize:11, fontWeight:500, opacity:0.85 }}>Emergency</span>
          </a>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:4 }}>🗺️ Nearby Hospitals</h1>
        <p style={{ color:'var(--text-muted)' }}>{filtered.length} hospitals · Select a hospital to call its ambulance or get directions</p>
      </div>

      {/* Location bar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 16px', background:locInfo.bg, borderRadius:10, marginBottom:12, flexWrap:'wrap', border:`1px solid ${locInfo.color}33` }}>
        <span style={{ fontSize:13, fontWeight:600, color:locInfo.color, flex:1 }}>{locInfo.icon} {locInfo.text}</span>
        <button className="btn btn-sm btn-outline" onClick={detectLocation}>🔄 Detect My Location</button>
        <button className="btn btn-sm btn-outline" onClick={() => setShowManual(!showManual)}>📝 Enter Address</button>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>or click on map to set start point</span>
      </div>

      {/* Manual address box */}
      {showManual && (
        <div className="card animate-slide" style={{ marginBottom:12 }}>
          <div className="card-body" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>📝 Enter your home / current address:</div>
            <div style={{ display:'flex', gap:10 }}>
              <input className="form-control"
                placeholder="e.g. Vaishali Nagar, Jaipur  or  12, Sector 5, Mansarovar"
                value={manualAddr}
                onChange={e => setManualAddr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && geocodeAddress()} />
              <button className="btn btn-primary" onClick={geocodeAddress} disabled={geocoding}>
                {geocoding ? '⏳' : '🔍 Search'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowManual(false)}>Cancel</button>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>
              💡 Include area name or landmark for best results. Press Enter to search.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom:12 }}>
        <div className="card-body" style={{ padding:'12px 18px' }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <input className="form-control" style={{ maxWidth:220 }} placeholder="🔎 Search hospital or area..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {hospitalTypes.map(t => (
                <button key={t} className={`btn btn-sm ${typeFilter===t?'btn-primary':'btn-outline'}`} onClick={() => setTypeFilter(t)}>
                  {TYPE_EMOJI[t]||'🏥'} {t}
                </button>
              ))}
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
              <input type="checkbox" checked={emergencyOnly} onChange={e => setEmergency(e.target.checked)} />
              🚨 Emergency Only
            </label>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
        {Object.entries(TYPE_COLORS).map(([type,color]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
            <div style={{ width:11,height:11,borderRadius:'50%',background:color }}/>{type}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, alignItems:'start' }}>

        {/* Hospital list */}
        <div className="card" style={{ maxHeight:560, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div className="card-header" style={{ flexShrink:0 }}><h2>Hospitals ({filtered.length})</h2></div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading
              ? <div className="loading-center"><div className="spinner"/></div>
              : filtered.length === 0
              ? <div className="empty-state"><div className="empty-icon">🏥</div><h3>No hospitals</h3></div>
              : filtered.map(h => (
                <div key={h.id} onClick={() => focusHospital(h)} style={{
                  padding:'11px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  background: selected?.id===h.id ? 'var(--success-light)' : 'white',
                  borderLeft: selected?.id===h.id ? '3px solid var(--primary)' : '3px solid transparent',
                  transition:'all 0.15s'
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:13, marginBottom:3, lineHeight:1.3 }}>{h.name}</div>
                      <span style={{ padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:600, background:(TYPE_COLORS[h.hospital_type]||'#666')+'22', color:TYPE_COLORS[h.hospital_type]||'#666' }}>{h.hospital_type}</span>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>📍 {h.area}</div>
                      <div style={{ display:'flex', gap:8, marginTop:3, fontSize:11 }}>
                        {h.has_emergency && <span style={{ color:'#e63946' }}>🚨 ER</span>}
                        {h.has_icu       && <span style={{ color:'#4895ef' }}>🏥 ICU</span>}
                        {h.has_ambulance && <span style={{ color:'#2d6a4f' }}>🚑 Amb</span>}
                      </div>
                      {/* Ambulance call button in list */}
                      {h.has_ambulance && (h.emergency_phone || h.phone) && (
                        <a href={`tel:${(h.emergency_phone||h.phone).replace(/\s/g,'')}`}
                          onClick={e => e.stopPropagation()}
                          className="amb-btn"
                          style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:6, padding:'5px 10px', background:'#dc2626', color:'white', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:11, transition:'all 0.18s' }}>
                          📞 Call Ambulance
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'#f4a261', fontWeight:600 }}>⭐{h.rating}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Map + Directions panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div ref={mapRef} style={{ height:460, borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--border)' }} />

          {/* Directions panel — shows on hospital select */}
          {selected && (
            <div className="card animate-slide">
              <div className="card-body">

                {/* Hospital name row */}
                <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
                  <span style={{ fontSize:30 }}>{TYPE_EMOJI[selected.hospital_type]||'🏥'}</span>
                  <div style={{ flex:1 }}>
                    <h3 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{selected.name}</h3>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>📍 {selected.address}</div>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>📞 {selected.phone} &nbsp;·&nbsp; ⏰ {selected.timings}</div>
                    <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}>
                      {selected.has_emergency && <span className="badge badge-cancelled">🚨 Emergency</span>}
                      {selected.has_icu       && <span className="badge badge-completed">🏥 ICU</span>}
                      {selected.has_ambulance && <span className="badge badge-approved">🚑 Ambulance</span>}
                      {selected.total_beds    && <span className="badge badge-pending">🛏️ {selected.total_beds} Beds</span>}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>✕</button>
                </div>

                {/* From → To visual */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg)', borderRadius:10, marginBottom:14, fontSize:13 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:12,height:12,borderRadius:'50%',background:'#4895ef',border:'2px solid white',boxShadow:'0 1px 6px rgba(72,149,239,.5)' }}/>
                    <span style={{ fontWeight:600, color:'#4895ef' }}>
                      {locStatus==='found' ? 'Your GPS Location' : locStatus==='manual' ? 'Your Set Location' : '⚠️ Not Set'}
                    </span>
                  </div>
                  <div style={{ flex:1, height:3, background:'linear-gradient(90deg,#4895ef,#e63946)', borderRadius:2 }}/>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:12,height:12,borderRadius:'50%',background:'#e63946',border:'2px solid white',boxShadow:'0 1px 6px rgba(230,57,70,.5)' }}/>
                    <span style={{ fontWeight:600, color:'#e63946', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.name}</span>
                  </div>
                </div>

                {/* Travel mode selector */}
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)' }}>Travel by:</span>
                  {TRAVEL_MODES.map(m => (
                    <button key={m.key}
                      className={`btn btn-sm ${travelMode===m.key?'btn-primary':'btn-outline'}`}
                      onClick={() => setTravelMode(m.key)}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* AMBULANCE CALL — shown only if hospital has ambulance */}
                {selected.has_ambulance && (
                  <div style={{ marginBottom:12, padding:'14px 16px', background:'linear-gradient(135deg,#fff0f0,#ffe4e4)', borderRadius:12, border:'2px solid #fca5a5' }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'#dc2626', marginBottom:4 }}>🚑 Ambulance Available</div>
                    <div style={{ fontSize:12, color:'#7f1d1d', marginBottom:10 }}>
                      Call this hospital's ambulance directly — your phone dialer will open instantly.
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {/* Primary emergency phone */}
                      {selected.emergency_phone && (
                        <a href={`tel:${selected.emergency_phone.replace(/\s/g,'')}`}
                          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 16px', background:'#dc2626', color:'white', borderRadius:10, textDecoration:'none', fontWeight:700, fontSize:14, boxShadow:'0 4px 14px rgba(220,38,38,0.35)', transition:'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#b91c1c'}
                          onMouseLeave={e => e.currentTarget.style.background='#dc2626'}>
                          📞 {selected.emergency_phone} <span style={{ fontSize:11, opacity:0.85, fontWeight:400 }}>Emergency</span>
                        </a>
                      )}
                      {/* Regular phone fallback */}
                      {selected.phone && selected.phone !== selected.emergency_phone && (
                        <a href={`tel:${selected.phone.replace(/\s/g,'')}`}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 16px', background:'white', color:'#dc2626', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:13, border:'2px solid #fca5a5', transition:'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#fff0f0'}
                          onMouseLeave={e => e.currentTarget.style.background='white'}>
                          📞 {selected.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* National ambulance shortcut */}
                <div style={{ marginBottom:12, display:'flex', gap:8 }}>
                  <a href="tel:102"
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background:'#7f1d1d', color:'white', borderRadius:10, textDecoration:'none', fontWeight:700, fontSize:13, textAlign:'center' }}>
                    🚑 Call 102 <span style={{ fontSize:11, fontWeight:400, opacity:0.85 }}>Ambulance</span>
                  </a>
                  <a href="tel:112"
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background:'#1d3557', color:'white', borderRadius:10, textDecoration:'none', fontWeight:700, fontSize:13, textAlign:'center' }}>
                    🆘 Call 112 <span style={{ fontSize:11, fontWeight:400, opacity:0.85 }}>Emergency</span>
                  </a>
                </div>

                {/* GET DIRECTIONS button → opens Google Maps */}
                <button
                  className="btn btn-primary btn-lg btn-block"
                  onClick={openGoogleMaps}
                  style={{ background:'#1a73e8', fontSize:15 }}>
                  🗺️ Open Directions in Google Maps
                </button>

                {!userLocation && (
                  <div style={{ marginTop:10, padding:'8px 14px', background:'#fff3e0', borderRadius:8, fontSize:13, color:'#b45309' }}>
                    ⚠️ Set your location first using the bar above the map, then click the button.
                  </div>
                )}

                <p style={{ marginTop:8, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
                  Opens Google Maps in your browser with full turn-by-turn navigation 🧭
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
