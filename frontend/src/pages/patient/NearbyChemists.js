import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const TRAVEL_MODES = [
  { key: 'driving',   label: '🚗 Drive',  gmaps: 'driving'   },
  { key: 'walking',   label: '🚶 Walk',   gmaps: 'walking'   },
  { key: 'bicycling', label: '🚴 Cycle',  gmaps: 'bicycling' },
];

export default function NearbyChemists() {
  const [shops, setShops]           = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [userLocation, setUserLoc]  = useState(null);
  const [locStatus, setLocStatus]   = useState('detecting');
  const [mapLoaded, setMapLoaded]   = useState(false);
  const [search, setSearch]         = useState('');
  const [only24hr, setOnly24hr]     = useState(false);
  const [onlyDelivery, setDelivery] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [travelMode, setTravelMode] = useState('walking');
  const [manualAddr, setManualAddr] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [geocoding, setGeocoding]   = useState(false);

  const mapRef      = useRef(null);
  const mapInst     = useRef(null);
  const markersRef  = useRef([]);
  const userMarker  = useRef(null);

  useEffect(() => { loadShops(); loadLeaflet(); detectLocation(); }, []);
  useEffect(() => { applyFilters(); }, [shops, search, only24hr, onlyDelivery]);
  useEffect(() => { if (mapLoaded && mapRef.current && !mapInst.current) initMap(); }, [mapLoaded]);
  useEffect(() => { if (mapInst.current && filtered.length > 0) updateMarkers(); }, [filtered, mapLoaded, selected]);
  useEffect(() => { placeUserMarker(); }, [userLocation, mapLoaded]);

  const loadShops = async () => {
    try { const r = await API.get('/chemists/'); setShops(r.data); setFiltered(r.data); }
    catch {} finally { setLoading(false); }
  };

  const loadLeaflet = () => {
    if (window.L) { setMapLoaded(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => setMapLoaded(true);
    document.head.appendChild(s);
  };

  const detectLocation = () => {
    setLocStatus('detecting');
    if (!navigator.geolocation) { setLocStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('found'); },
      ()  => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const geocodeAddress = async () => {
    if (!manualAddr.trim()) return;
    setGeocoding(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddr + ', Jaipur, India')}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setUserLoc(loc); setLocStatus('manual'); setShowManual(false); setManualAddr('');
        if (mapInst.current) mapInst.current.setView([loc.lat, loc.lng], 14);
      } else { alert('Address not found. Be more specific.'); }
    } catch { alert('Search failed.'); } finally { setGeocoding(false); }
  };

  const placeUserMarker = () => {
    if (!window.L || !mapInst.current || !userLocation) return;
    const L = window.L;
    if (userMarker.current) { userMarker.current.remove(); userMarker.current = null; }
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:22px;height:22px">
        <div style="width:22px;height:22px;background:#4895ef;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(72,149,239,.6);position:relative;z-index:2;display:flex;align-items:center;justify-content:center;font-size:11px">📍</div>
        <div style="position:absolute;top:-4px;left:-4px;width:30px;height:30px;background:#4895ef33;border-radius:50%;animation:ripple 2s infinite"></div>
      </div>`,
      iconSize:[22,22], iconAnchor:[11,11]
    });
    userMarker.current = L.marker([userLocation.lat, userLocation.lng], { icon, zIndexOffset:9999 })
      .addTo(mapInst.current).bindPopup('<b>📍 Your Location</b>');
    mapInst.current.setView([userLocation.lat, userLocation.lng], 14);
  };

  const initMap = () => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([26.9124, 75.7873], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);
    map.on('click', e => { setUserLoc({ lat: e.latlng.lat, lng: e.latlng.lng }); setLocStatus('manual'); });
    mapInst.current = map;
  };

  const updateMarkers = () => {
    if (!window.L || !mapInst.current) return;
    const L = window.L;
    markersRef.current.forEach(m => m.marker.remove());
    markersRef.current = [];

    filtered.forEach(shop => {
      if (!shop.latitude || !shop.longitude) return;
      const isSel  = selected?.id === shop.id;
      const is24   = shop.is_24hrs;
      const bg     = is24 ? '#e63946' : isSel ? '#2d6a4f' : '#f4a261';
      const size   = isSel ? 40 : 32;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid white;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:${isSel?16:13}px;box-shadow:0 3px ${isSel?16:8}px rgba(0,0,0,.3);cursor:pointer">💊</div>`,
        iconSize:[size,size], iconAnchor:[size/2,size/2]
      });

      const marker = L.marker([parseFloat(shop.latitude), parseFloat(shop.longitude)], { icon })
        .addTo(mapInst.current)
        .bindPopup(`<div style="font-family:DM Sans,sans-serif;min-width:200px">
          <b style="font-size:14px">${shop.name}</b><br/>
          <span style="font-size:11px;color:#666">📍 ${shop.address}</span><br/>
          <span style="font-size:11px">📞 ${shop.phone}</span><br/>
          <span style="font-size:11px">⏰ ${shop.is_24hrs ? '🔴 Open 24 Hours' : shop.open_time + ' – ' + shop.close_time}</span><br/>
          ${shop.home_delivery ? '<span style="font-size:11px;color:#2d6a4f">🛵 Home Delivery</span>' : ''}
        </div>`);

      marker.on('click', () => setSelected(shop));
      markersRef.current.push({ marker, shop });
    });
  };

  const focusShop = (shop) => {
    setSelected(shop);
    if (!mapInst.current || !shop.latitude) return;
    mapInst.current.setView([parseFloat(shop.latitude), parseFloat(shop.longitude)], 16);
    markersRef.current.find(m => m.shop.id === shop.id)?.marker.openPopup();
  };

  const openGoogleMaps = () => {
    if (!userLocation) { alert('Please set your location first!'); return; }
    const mode = TRAVEL_MODES.find(m => m.key === travelMode)?.gmaps || 'walking';
    const url  = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selected.latitude},${selected.longitude}&travelmode=${mode}&dir_action=navigate`;
    window.open(url, '_blank');
  };

  const applyFilters = () => {
    let r = [...shops];
    if (search) { const s = search.toLowerCase(); r = r.filter(sh => sh.name.toLowerCase().includes(s) || (sh.area||'').toLowerCase().includes(s)); }
    if (only24hr)     r = r.filter(sh => sh.is_24hrs);
    if (onlyDelivery) r = r.filter(sh => sh.home_delivery);
    setFiltered(r);
  };

  const locInfo = {
    detecting: { bg:'#fff3e0', color:'#b45309', icon:'⏳', text:'Detecting your location...' },
    found:     { bg:'#d8f3dc', color:'#1b4332', icon:'✅', text:'Using your live GPS location' },
    manual:    { bg:'#e0f0ff', color:'#1d4ed8', icon:'📌', text:'Using manually set location' },
    denied:    { bg:'#fff0f0', color:'#e63946', icon:'❌', text:'Location denied — enter address or click map' },
  }[locStatus];

  return (
    <div className="animate-fade">
      <style>{`@keyframes ripple{0%{transform:scale(1);opacity:.35}100%{transform:scale(3.5);opacity:0}}`}</style>

      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, marginBottom:4 }}>💊 Nearby Chemists</h1>
        <p style={{ color:'var(--text-muted)' }}>{filtered.length} medical shops · Select a shop and get directions</p>
      </div>

      {/* Location bar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 16px', background:locInfo.bg, borderRadius:10, marginBottom:12, flexWrap:'wrap', border:`1px solid ${locInfo.color}33` }}>
        <span style={{ fontSize:13, fontWeight:600, color:locInfo.color, flex:1 }}>{locInfo.icon} {locInfo.text}</span>
        <button className="btn btn-sm btn-outline" onClick={detectLocation}>🔄 Detect Location</button>
        <button className="btn btn-sm btn-outline" onClick={() => setShowManual(!showManual)}>📝 Enter Address</button>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>or click on map</span>
      </div>

      {showManual && (
        <div className="card animate-slide" style={{ marginBottom:12 }}>
          <div className="card-body" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>📝 Enter your address:</div>
            <div style={{ display:'flex', gap:10 }}>
              <input className="form-control" placeholder="e.g. Vaishali Nagar or Sector 5, Mansarovar"
                value={manualAddr} onChange={e => setManualAddr(e.target.value)}
                onKeyDown={e => e.key==='Enter' && geocodeAddress()} />
              <button className="btn btn-primary" onClick={geocodeAddress} disabled={geocoding}>{geocoding?'⏳':'🔍 Search'}</button>
              <button className="btn btn-outline" onClick={() => setShowManual(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom:12 }}>
        <div className="card-body" style={{ padding:'12px 18px' }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
            <input className="form-control" style={{ maxWidth:220 }} placeholder="🔎 Search shop or area..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', padding:'7px 14px', background: only24hr?'#fff0f0':'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
              <input type="checkbox" checked={only24hr} onChange={e => setOnly24hr(e.target.checked)} />
              🔴 Open 24 Hours
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', padding:'7px 14px', background: onlyDelivery?'var(--success-light)':'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
              <input type="checkbox" checked={onlyDelivery} onChange={e => setDelivery(e.target.checked)} />
              🛵 Home Delivery
            </label>
            <div style={{ display:'flex', gap:6, marginLeft:'auto', alignItems:'center', fontSize:12 }}>
              <div style={{ width:11,height:11,borderRadius:3,background:'#e63946'}}/> Open 24h &nbsp;
              <div style={{ width:11,height:11,borderRadius:3,background:'#f4a261'}}/> Regular &nbsp;
              <div style={{ width:11,height:11,borderRadius:3,background:'#2d6a4f'}}/> Selected
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, alignItems:'start' }}>

        {/* List */}
        <div className="card" style={{ maxHeight:560, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div className="card-header" style={{ flexShrink:0 }}><h2>Chemists ({filtered.length})</h2></div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading ? <div className="loading-center"><div className="spinner"/></div>
            : filtered.length===0 ? <div className="empty-state"><div className="empty-icon">💊</div><h3>No shops found</h3></div>
            : filtered.map(sh => (
              <div key={sh.id} onClick={() => focusShop(sh)} style={{
                padding:'11px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                background: selected?.id===sh.id ? 'var(--success-light)' : 'white',
                borderLeft: selected?.id===sh.id ? '3px solid var(--primary)' : '3px solid transparent',
                transition:'all 0.15s'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:3, lineHeight:1.3 }}>💊 {sh.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>📍 {sh.area}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {sh.is_24hrs      && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'#fff0f0', color:'#e63946', fontWeight:600 }}>🔴 24h</span>}
                      {sh.home_delivery && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'var(--success-light)', color:'var(--primary)', fontWeight:600 }}>🛵 Delivery</span>}
                      {sh.has_generic   && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'var(--info-light)', color:'var(--info)', fontWeight:600 }}>💰 Generic</span>}
                      {sh.has_ayurvedic && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'#f0fff4', color:'#16a34a', fontWeight:600 }}>🌿 Ayurvedic</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'#f4a261', fontWeight:600, flexShrink:0 }}>⭐{sh.rating}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map + detail */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div ref={mapRef} style={{ height:460, borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--border)' }} />

          {selected && (
            <div className="card animate-slide">
              <div className="card-body">
                <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
                  <span style={{ fontSize:32 }}>💊</span>
                  <div style={{ flex:1 }}>
                    <h3 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{selected.name}</h3>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>📍 {selected.address}</div>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>👤 {selected.owner_name} &nbsp;·&nbsp; 📞 {selected.phone}</div>
                    <div style={{ fontSize:13, marginTop:4 }}>
                      {selected.is_24hrs
                        ? <span style={{ color:'#e63946', fontWeight:600 }}>🔴 Open 24 Hours</span>
                        : <span>⏰ {selected.open_time} – {selected.close_time}</span>}
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                      {selected.home_delivery && <span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, background:'var(--success-light)', color:'var(--primary)', fontWeight:600 }}>🛵 Home Delivery</span>}
                      {selected.has_generic   && <span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, background:'var(--info-light)', color:'var(--info)', fontWeight:600 }}>💰 Generic Medicines</span>}
                      {selected.has_ayurvedic && <span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, background:'#f0fff4', color:'#16a34a', fontWeight:600 }}>🌿 Ayurvedic</span>}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>✕</button>
                </div>

                {/* Travel mode */}
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)' }}>Travel by:</span>
                  {TRAVEL_MODES.map(m => (
                    <button key={m.key} className={`btn btn-sm ${travelMode===m.key?'btn-primary':'btn-outline'}`} onClick={() => setTravelMode(m.key)}>{m.label}</button>
                  ))}
                </div>

                <button className="btn btn-primary btn-block btn-lg" onClick={openGoogleMaps} style={{ background:'#1a73e8', fontSize:15 }}>
                  🗺️ Open Directions in Google Maps
                </button>
                {!userLocation && (
                  <div style={{ marginTop:10, padding:'8px 14px', background:'#fff3e0', borderRadius:8, fontSize:13, color:'#b45309' }}>
                    ⚠️ Set your location first using the bar above
                  </div>
                )}
                <p style={{ marginTop:8, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
                  Opens Google Maps with full turn-by-turn navigation 🧭
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
