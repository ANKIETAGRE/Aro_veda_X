import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [patientId,   setPatientId]   = useState(() => localStorage.getItem('patientId')   || null);
  const [doctorId,    setDoctorId]    = useState(() => localStorage.getItem('doctorId')    || null);
  const [patientData, setPatientData] = useState(() => { try { return JSON.parse(localStorage.getItem('patientData')) || null; } catch { return null; } });
  const [doctorData,  setDoctorData]  = useState(() => { try { return JSON.parse(localStorage.getItem('doctorData'))  || null; } catch { return null; } });

  const loginPatient = (id, data) => {
    localStorage.setItem('patientId',   String(id));
    localStorage.setItem('patientData', JSON.stringify(data));
    setPatientId(String(id));
    setPatientData(data);
  };

  const loginDoctor = (id, data) => {
    localStorage.setItem('doctorId',   String(id));
    localStorage.setItem('doctorData', JSON.stringify(data));
    setDoctorId(String(id));
    setDoctorData(data);
  };

  const logoutPatient = () => {
    localStorage.removeItem('patientId');
    localStorage.removeItem('patientData');
    setPatientId(null);
    setPatientData(null);
  };

  const logoutDoctor = () => {
    localStorage.removeItem('doctorId');
    localStorage.removeItem('doctorData');
    setDoctorId(null);
    setDoctorData(null);
  };

  return (
    <AppContext.Provider value={{
      patientId, patientData, setPatientData, loginPatient, logoutPatient,
      doctorId,  doctorData,  setDoctorData,  loginDoctor,  logoutDoctor,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
