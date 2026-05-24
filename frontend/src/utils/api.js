import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// ── PATIENT ──────────────────────────────────────
export const patientAPI = {
  create: (data) => API.post('/patient/profile', data),
  get: (id) => API.get(`/patient/profile?id=${id}`),
  update: (id, data) => API.put(`/patient/profile/${id}`, data),
  getAll: () => API.get('/patient/all'),

  getAppointments: (patient_id) => API.get(`/patient/appointments?patient_id=${patient_id}`),
  bookAppointment: (data) => API.post('/patient/appointments', data),
  rescheduleAppointment: (id, data) => API.put(`/patient/appointments/${id}`, data),
  cancelAppointment: (id) => API.put(`/patient/appointments/${id}/cancel`),

  getDoctors: (specialization_id) =>
    API.get(`/patient/doctors${specialization_id ? `?specialization_id=${specialization_id}` : ''}`),
  getSlots: (doctor_id, date) => API.get(`/patient/doctors/${doctor_id}/slots?date=${date}`),

  getSymptoms: () => API.get('/patient/symptoms'),
  predict: (data) => API.post('/patient/predict', data),

  getNotifications: (patient_id) => API.get(`/patient/notifications?patient_id=${patient_id}`),
  markRead: (id) => API.put(`/patient/notifications/${id}/read`),
};

// ── DOCTOR ───────────────────────────────────────
export const doctorAPI = {
  create: (data) => API.post('/doctor/profile', data),
  get: (id) => API.get(`/doctor/profile/${id}`),
  update: (id, data) => API.put(`/doctor/profile/${id}`, data),

  getAppointments: (doctor_id, filters = {}) => {
    const params = new URLSearchParams({ doctor_id, ...filters });
    return API.get(`/doctor/appointments?${params}`);
  },
  updateStatus: (id, data) => API.put(`/doctor/appointments/${id}/status`, data),
  updateTreatment: (id, data) => API.put(`/doctor/appointments/${id}/treatment`, data),

  getDashboard: (doctor_id) => API.get(`/doctor/dashboard?doctor_id=${doctor_id}`),

  getPatients: (doctor_id) => API.get(`/doctor/patients?doctor_id=${doctor_id}`),
  getPatientHistory: (patient_id, doctor_id) =>
    API.get(`/doctor/patients/${patient_id}/history?doctor_id=${doctor_id}`),

  getNotifications: (doctor_id) => API.get(`/doctor/notifications?doctor_id=${doctor_id}`),
  markRead: (id) => API.put(`/doctor/notifications/${id}/read`),

  getSpecializations: () => API.get('/doctor/specializations'),
};

export const commonAPI = {
  getSpecializations: () => API.get('/specializations'),
};
