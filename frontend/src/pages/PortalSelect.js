import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function PortalSelect() {
  const { patientId, doctorId } = useApp();

  return (
    <div className="portal-select-page">
      <div className="portal-select-card animate-slide">
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
        <h1 className="portal-title">AroVedax</h1>
        <p className="portal-subtitle">Smart Medical Appointment & Disease Recommendation System</p>

        <div className="portal-options">
          <Link to={patientId ? '/patient/dashboard' : '/patient/login'} className="portal-option patient">
            <div className="portal-option-icon">🧑‍⚕️</div>
            <h3>Patient Portal</h3>
            <p>Book appointments, check symptoms & find doctors</p>
            <span style={{ marginTop: 8, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
              {patientId ? '→ Go to Dashboard' : '→ Login / Register'}
            </span>
          </Link>
          <Link to={doctorId ? '/doctor/dashboard' : '/doctor/login'} className="portal-option doctor">
            <div className="portal-option-icon">👨‍⚕️</div>
            <h3>Doctor Portal</h3>
            <p>Manage appointments & patient records</p>
            <span style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              {doctorId ? '→ Go to Dashboard' : '→ Login / Register'}
            </span>
          </Link>
        </div>

        <p style={{ marginTop: 32, fontSize: 13, color: '#9ca3af' }}>
          Powered by AI disease prediction · OpenStreetMap · Google Maps
        </p>
      </div>
    </div>
  );
}
