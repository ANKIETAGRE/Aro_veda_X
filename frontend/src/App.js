import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import './index.css';

import PatientAuth from './pages/patient/PatientAuth';
import DoctorAuth  from './pages/doctor/DoctorAuth';

import PatientDashboard    from './pages/patient/PatientDashboard';
import SymptomChecker      from './pages/patient/SymptomChecker';
import FindDoctors         from './pages/patient/FindDoctors';
import PatientAppointments from './pages/patient/PatientAppointments';
import NearbyHospitals     from './pages/patient/NearbyHospitals';
import NearbyChemists      from './pages/patient/NearbyChemists';
import HelpSupport      from './pages/HelpSupport';
import MedicalDocuments   from './pages/patient/MedicalDocuments';
import { PatientNotifications, PatientProfile } from './pages/patient/PatientMisc';

import DoctorDashboard    from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import { DoctorPatients, DoctorNotifications, DoctorProfile } from './pages/doctor/DoctorMisc';

import PortalSelect from './pages/PortalSelect';
import { PatientSidebar, DoctorSidebar } from './components/shared/Sidebar';

function RequirePatient({ children }) {
  const { patientId } = useApp();
  return patientId ? children : <Navigate to="/patient/login" replace />;
}
function RequireDoctor({ children }) {
  const { doctorId } = useApp();
  return doctorId ? children : <Navigate to="/doctor/login" replace />;
}

// ── Animated page wrapper ──────────────────────────────────────────
function AnimatedPage({ children }) {
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = '';
    el.classList.remove('page-enter');
    void el.offsetHeight;
    el.classList.add('page-enter');
  }, [location.pathname]);

  return <div ref={ref} className="page-enter" style={{ width: '100%' }}>{children}</div>;
}

function PatientLayout({ children }) {
  return (
    <div className="app-layout">
      <PatientSidebar />
      <div className="main-content">
        <div className="page-content">
          <AnimatedPage>{children}</AnimatedPage>
        </div>
      </div>
    </div>
  );
}

function DoctorLayout({ children }) {
  return (
    <div className="app-layout">
      <DoctorSidebar />
      <div className="main-content">
        <div className="page-content">
          <AnimatedPage>{children}</AnimatedPage>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            fontFamily: 'DM Sans, sans-serif', fontSize: 14,
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            padding: '12px 18px',
          },
          success: { iconTheme: { primary: '#2d6a4f', secondary: 'white' }, style: { borderLeft: '4px solid #2d6a4f' } },
          error:   { iconTheme: { primary: '#e63946', secondary: 'white' }, style: { borderLeft: '4px solid #e63946' } },
          duration: 4000,
        }} />
        <Routes>
          <Route path="/" element={<PortalSelect />} />

          <Route path="/patient/login" element={<PatientAuth />} />
          <Route path="/doctor/login"  element={<DoctorAuth />} />

          <Route path="/patient/dashboard"       element={<RequirePatient><PatientLayout><PatientDashboard /></PatientLayout></RequirePatient>} />
          <Route path="/patient/symptom-checker" element={<RequirePatient><PatientLayout><SymptomChecker /></PatientLayout></RequirePatient>} />
          <Route path="/patient/doctors"         element={<RequirePatient><PatientLayout><FindDoctors /></PatientLayout></RequirePatient>} />
          <Route path="/patient/appointments"    element={<RequirePatient><PatientLayout><PatientAppointments /></PatientLayout></RequirePatient>} />
          <Route path="/patient/nearby"          element={<RequirePatient><PatientLayout><NearbyHospitals /></PatientLayout></RequirePatient>} />
          <Route path="/patient/chemists"         element={<RequirePatient><PatientLayout><NearbyChemists /></PatientLayout></RequirePatient>} />
          <Route path="/patient/documents"        element={<RequirePatient><PatientLayout><MedicalDocuments /></PatientLayout></RequirePatient>} />
          <Route path="/patient/notifications"   element={<RequirePatient><PatientLayout><PatientNotifications /></PatientLayout></RequirePatient>} />
          <Route path="/patient/profile"         element={<RequirePatient><PatientLayout><PatientProfile /></PatientLayout></RequirePatient>} />
          <Route path="/patient/help"            element={<RequirePatient><PatientLayout><HelpSupport /></PatientLayout></RequirePatient>} />

          <Route path="/doctor/dashboard"     element={<RequireDoctor><DoctorLayout><DoctorDashboard /></DoctorLayout></RequireDoctor>} />
          <Route path="/doctor/appointments"  element={<RequireDoctor><DoctorLayout><DoctorAppointments /></DoctorLayout></RequireDoctor>} />
          <Route path="/doctor/patients"      element={<RequireDoctor><DoctorLayout><DoctorPatients /></DoctorLayout></RequireDoctor>} />
          <Route path="/doctor/notifications" element={<RequireDoctor><DoctorLayout><DoctorNotifications /></DoctorLayout></RequireDoctor>} />
          <Route path="/doctor/profile"       element={<RequireDoctor><DoctorLayout><DoctorProfile /></DoctorLayout></RequireDoctor>} />
          <Route path="/doctor/help"          element={<RequireDoctor><DoctorLayout><HelpSupport /></DoctorLayout></RequireDoctor>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

      </BrowserRouter>
    </AppProvider>
  );
}
