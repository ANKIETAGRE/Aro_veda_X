import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function PatientSidebar() {
  const { patientData, logoutPatient } = useApp();
  const navigate = useNavigate();
  const handleLogout = () => { logoutPatient(); navigate('/patient/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🌿 AroVedax</h1>
        <p>Patient Portal</p>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <NavLink to="/patient/dashboard">        <span className="nav-icon">🏠</span> Dashboard</NavLink>
        <NavLink to="/patient/symptom-checker">  <span className="nav-icon">🔍</span> Symptom Checker</NavLink>
        <NavLink to="/patient/doctors">          <span className="nav-icon">👨‍⚕️</span> Find Doctors</NavLink>
        <NavLink to="/patient/appointments">     <span className="nav-icon">📅</span> My Appointments</NavLink>
        <NavLink to="/patient/nearby">           <span className="nav-icon">🗺️</span> Nearby Hospitals</NavLink>
        <NavLink to="/patient/chemists">         <span className="nav-icon">💊</span> Nearby Chemists</NavLink>

        <div className="sidebar-section-label">Account</div>
        <NavLink to="/patient/documents">        <span className="nav-icon">📂</span> My Documents</NavLink>
        <NavLink to="/patient/notifications">    <span className="nav-icon">🔔</span> Notifications</NavLink>
        <NavLink to="/patient/profile">          <span className="nav-icon">👤</span> My Profile</NavLink>

        <div className="sidebar-section-label">Support</div>
        <NavLink to="/patient/help">
          <span className="nav-icon">🤖</span> Help &amp; Support
          <span style={{ marginLeft:'auto', fontSize:10, padding:'2px 6px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)', fontWeight:600 }}>AI</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        {patientData && (
          <div style={{ marginBottom:12, padding:'10px 12px', background:'rgba(255,255,255,0.08)', borderRadius:8 }}>
            <div style={{ fontSize:11, opacity:0.55, marginBottom:2 }}>Logged in as</div>
            <div style={{ fontSize:14, fontWeight:600, color:'white' }}>{patientData.full_name}</div>
            <div style={{ fontSize:11, opacity:0.5 }}>{patientData.email}</div>
          </div>
        )}
        <button onClick={handleLogout} style={{ background:'rgba(230,57,70,0.18)', color:'#ff8080', borderRadius:8, padding:'10px 14px', border:'1px solid rgba(230,57,70,0.25)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:10, width:'100%', fontFamily:'var(--font-body)', fontWeight:500 }}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}

export function DoctorSidebar() {
  const { doctorData, logoutDoctor } = useApp();
  const navigate = useNavigate();
  const handleLogout = () => { logoutDoctor(); navigate('/doctor/login'); };

  return (
    <aside className="sidebar" style={{ background:'#1e3a5f' }}>
      <div className="sidebar-logo">
        <h1>🩺 AroVedax</h1>
        <p>Doctor Portal</p>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <NavLink to="/doctor/dashboard">      <span className="nav-icon">🏠</span> Dashboard</NavLink>
        <NavLink to="/doctor/appointments">   <span className="nav-icon">📅</span> Appointments</NavLink>
        <NavLink to="/doctor/patients">       <span className="nav-icon">👥</span> My Patients</NavLink>
        <NavLink to="/doctor/notifications">  <span className="nav-icon">🔔</span> Notifications</NavLink>

        <div className="sidebar-section-label">Account</div>
        <NavLink to="/doctor/profile">        <span className="nav-icon">👤</span> My Profile</NavLink>

        <div className="sidebar-section-label">Support</div>
        <NavLink to="/doctor/help">
          <span className="nav-icon">🤖</span> Help &amp; Support
          <span style={{ marginLeft:'auto', fontSize:10, padding:'2px 6px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)', fontWeight:600 }}>AI</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        {doctorData && (
          <div style={{ marginBottom:12, padding:'10px 12px', background:'rgba(255,255,255,0.08)', borderRadius:8 }}>
            <div style={{ fontSize:11, opacity:0.55, marginBottom:2 }}>Logged in as</div>
            <div style={{ fontSize:14, fontWeight:600, color:'white' }}>Dr. {doctorData.full_name}</div>
            <div style={{ fontSize:11, opacity:0.5 }}>{doctorData.email}</div>
          </div>
        )}
        <button onClick={handleLogout} style={{ background:'rgba(230,57,70,0.18)', color:'#ff8080', borderRadius:8, padding:'10px 14px', border:'1px solid rgba(230,57,70,0.25)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:10, width:'100%', fontFamily:'var(--font-body)', fontWeight:500 }}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
