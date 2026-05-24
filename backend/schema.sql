-- ============================================
-- Medical Appointment Booking System
-- PostgreSQL Database Schema
-- ============================================


-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    age INTEGER,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIZATIONS TABLE
-- ============================================
CREATE TABLE specializations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- ============================================
-- DOCTORS TABLE
-- ============================================
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialization_id INTEGER REFERENCES specializations(id),
    qualification VARCHAR(200),
    experience_years INTEGER DEFAULT 0,
    hospital_name VARCHAR(200),
    hospital_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    available_days VARCHAR(100),  -- e.g. "Mon,Tue,Wed,Thu,Fri"
    available_from TIME,
    available_to TIME,
    consultation_fee DECIMAL(10, 2),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Completed', 'Cancelled', 'Rescheduled')),
    reason TEXT,
    notes TEXT,
    treatment_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DISEASES TABLE
-- ============================================
CREATE TABLE diseases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    specialization_id INTEGER REFERENCES specializations(id),
    severity VARCHAR(20) CHECK (severity IN ('Mild', 'Moderate', 'Severe')) DEFAULT 'Mild'
);

-- ============================================
-- SYMPTOMS TABLE
-- ============================================
CREATE TABLE symptoms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT
);

-- ============================================
-- DISEASE_SYMPTOMS (Many-to-Many)
-- ============================================
CREATE TABLE disease_symptoms (
    disease_id INTEGER REFERENCES diseases(id) ON DELETE CASCADE,
    symptom_id INTEGER REFERENCES symptoms(id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0,  -- symptom importance weight
    PRIMARY KEY (disease_id, symptom_id)
);

-- ============================================
-- MEDICINES TABLE
-- ============================================
CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100),  -- e.g. Antibiotic, Painkiller
    description TEXT
);

-- ============================================
-- DISEASE_MEDICINES (Many-to-Many)
-- ============================================
CREATE TABLE disease_medicines (
    disease_id INTEGER REFERENCES diseases(id) ON DELETE CASCADE,
    medicine_id INTEGER REFERENCES medicines(id) ON DELETE CASCADE,
    dosage_instructions TEXT,
    PRIMARY KEY (disease_id, medicine_id)
);

-- ============================================
-- PRECAUTIONS TABLE
-- ============================================
CREATE TABLE precautions (
    id SERIAL PRIMARY KEY,
    disease_id INTEGER REFERENCES diseases(id) ON DELETE CASCADE,
    precaution TEXT NOT NULL
);

-- ============================================
-- SYMPTOM CHECKER LOGS
-- ============================================
CREATE TABLE symptom_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    symptoms_entered TEXT,  -- JSON string of symptoms
    predicted_disease VARCHAR(200),
    confidence_score DECIMAL(5,2),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(10) CHECK (recipient_type IN ('patient', 'doctor')),
    recipient_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEED DATA: SPECIALIZATIONS
-- ============================================
INSERT INTO specializations (name, description) VALUES
('General Physician', 'General medicine and primary care'),
('Cardiologist', 'Heart and cardiovascular diseases'),
('Dermatologist', 'Skin, hair and nail conditions'),
('Neurologist', 'Brain and nervous system disorders'),
('Orthopedist', 'Bone and joint disorders'),
('Pulmonologist', 'Lung and respiratory diseases'),
('Gastroenterologist', 'Digestive system disorders'),
('ENT Specialist', 'Ear, nose and throat conditions'),
('Psychiatrist', 'Mental health disorders'),
('Diabetologist', 'Diabetes and endocrine disorders');

-- ============================================
-- SEED DATA: SYMPTOMS
-- ============================================
INSERT INTO symptoms (name) VALUES
('fever'), ('headache'), ('cough'), ('cold'), ('sore throat'),
('fatigue'), ('body ache'), ('nausea'), ('vomiting'), ('diarrhea'),
('chest pain'), ('shortness of breath'), ('skin rash'), ('itching'),
('joint pain'), ('back pain'), ('dizziness'), ('loss of appetite'),
('abdominal pain'), ('runny nose'), ('sneezing'), ('chills'),
('sweating'), ('weight loss'), ('frequent urination'), ('blurred vision'),
('palpitations'), ('swollen lymph nodes'), ('muscle weakness'), ('anxiety');

-- ============================================
-- SEED DATA: DISEASES
-- ============================================
INSERT INTO diseases (name, description, specialization_id, severity) VALUES
('Common Cold', 'Viral infection of upper respiratory tract', 1, 'Mild'),
('Influenza', 'Contagious respiratory illness caused by flu viruses', 1, 'Moderate'),
('COVID-19', 'Infectious disease caused by SARS-CoV-2 virus', 6, 'Severe'),
('Migraine', 'Recurring headaches with moderate to severe pain', 4, 'Moderate'),
('Hypertension', 'High blood pressure condition', 2, 'Moderate'),
('Diabetes Type 2', 'Chronic condition affecting blood sugar levels', 10, 'Moderate'),
('Pneumonia', 'Infection inflaming air sacs in lungs', 6, 'Severe'),
('Gastroenteritis', 'Inflammation of stomach and intestines', 7, 'Mild'),
('Dengue Fever', 'Mosquito-borne viral disease', 1, 'Severe'),
('Eczema', 'Inflammatory skin condition causing itchy rash', 3, 'Mild'),
('Arthritis', 'Inflammation of one or more joints', 5, 'Moderate'),
('Anxiety Disorder', 'Mental health condition causing excessive worry', 9, 'Moderate'),
('Sinusitis', 'Inflammation of sinuses causing congestion', 8, 'Mild'),
('Typhoid', 'Bacterial infection spread through contaminated food/water', 1, 'Severe'),
('Asthma', 'Chronic condition affecting airways in lungs', 6, 'Moderate');

-- ============================================
-- SEED DATA: DISEASE-SYMPTOM MAPPING
-- ============================================
-- Common Cold (id=1)
INSERT INTO disease_symptoms VALUES (1,3,1.0),(1,4,1.0),(1,20,0.8),(1,21,0.8),(1,5,0.7),(1,6,0.6);
-- Influenza (id=2)
INSERT INTO disease_symptoms VALUES (2,1,1.0),(2,3,0.9),(2,7,1.0),(2,6,0.9),(2,2,0.8),(2,22,0.8);
-- COVID-19 (id=3)
INSERT INTO disease_symptoms VALUES (3,1,1.0),(3,3,1.0),(3,6,1.0),(3,12,0.9),(3,7,0.8),(3,18,0.7);
-- Migraine (id=4)
INSERT INTO disease_symptoms VALUES (4,2,1.0),(4,17,0.8),(4,8,0.7),(4,6,0.6);
-- Hypertension (id=5)
INSERT INTO disease_symptoms VALUES (5,2,0.9),(5,11,0.8),(5,17,0.7),(5,27,0.9);
-- Diabetes Type 2 (id=6)
INSERT INTO disease_symptoms VALUES (6,25,1.0),(6,26,0.9),(6,24,0.8),(6,6,0.7),(6,18,0.7);
-- Pneumonia (id=7)
INSERT INTO disease_symptoms VALUES (7,1,1.0),(7,3,1.0),(7,12,1.0),(7,11,0.9),(7,6,0.8),(7,22,0.7);
-- Gastroenteritis (id=8)
INSERT INTO disease_symptoms VALUES (8,9,1.0),(8,10,1.0),(8,8,0.9),(8,19,0.9),(8,1,0.6),(8,18,0.7);
-- Dengue (id=9)
INSERT INTO disease_symptoms VALUES (9,1,1.0),(9,2,0.9),(9,7,1.0),(9,13,0.8),(9,22,0.9),(9,28,0.8);
-- Eczema (id=10)
INSERT INTO disease_symptoms VALUES (10,13,1.0),(10,14,1.0),(10,3,0.3);
-- Arthritis (id=11)
INSERT INTO disease_symptoms VALUES (11,15,1.0),(11,16,0.9),(11,29,0.8),(11,7,0.7);
-- Anxiety Disorder (id=12)
INSERT INTO disease_symptoms VALUES (12,30,1.0),(12,27,0.9),(12,6,0.7),(12,2,0.6);
-- Sinusitis (id=13)
INSERT INTO disease_symptoms VALUES (13,2,0.9),(13,20,1.0),(13,5,0.8),(13,21,0.7),(13,4,0.8);
-- Typhoid (id=14)
INSERT INTO disease_symptoms VALUES (14,1,1.0),(14,18,0.9),(14,19,0.8),(14,2,0.8),(14,6,1.0),(14,23,0.8);
-- Asthma (id=15)
INSERT INTO disease_symptoms VALUES (15,12,1.0),(15,3,0.9),(15,11,0.9),(15,6,0.7);

-- ============================================
-- SEED DATA: MEDICINES
-- ============================================
INSERT INTO medicines (name, type, description) VALUES
('Paracetamol', 'Painkiller/Antipyretic', 'Reduces fever and relieves mild pain'),
('Ibuprofen', 'NSAID', 'Anti-inflammatory and pain relief'),
('Cetirizine', 'Antihistamine', 'Relieves allergy symptoms'),
('Amoxicillin', 'Antibiotic', 'Treats bacterial infections'),
('Metformin', 'Antidiabetic', 'Controls blood sugar levels'),
('Atorvastatin', 'Statin', 'Lowers cholesterol'),
('Salbutamol Inhaler', 'Bronchodilator', 'Relieves asthma symptoms'),
('ORS Solution', 'Rehydration', 'Oral rehydration salts for dehydration'),
('Azithromycin', 'Antibiotic', 'Treats respiratory and other infections'),
('Loratadine', 'Antihistamine', 'Long-acting allergy relief'),
('Omeprazole', 'Proton Pump Inhibitor', 'Reduces stomach acid'),
('Sertraline', 'Antidepressant/Anxiolytic', 'Treats anxiety and depression'),
('Sumatriptan', 'Triptan', 'Treats migraines'),
('Amlodipine', 'Calcium Channel Blocker', 'Treats high blood pressure'),
('Doxycycline', 'Antibiotic', 'Treats dengue and other infections');

-- ============================================
-- SEED DATA: DISEASE-MEDICINE MAPPING
-- ============================================
INSERT INTO disease_medicines VALUES (1,1,'500mg every 6 hours'),(1,3,'10mg once daily');
INSERT INTO disease_medicines VALUES (2,1,'500mg every 6 hours'),(2,2,'400mg every 8 hours');
INSERT INTO disease_medicines VALUES (3,1,'500mg every 6 hours'),(3,9,'500mg once daily for 5 days');
INSERT INTO disease_medicines VALUES (4,13,'50mg at onset of headache'),(4,2,'400mg as needed');
INSERT INTO disease_medicines VALUES (5,14,'5mg once daily'),(5,6,'10mg once daily');
INSERT INTO disease_medicines VALUES (6,5,'500mg twice daily with meals');
INSERT INTO disease_medicines VALUES (7,9,'500mg once daily'),(7,4,'500mg thrice daily');
INSERT INTO disease_medicines VALUES (8,8,'As directed on packet'),(8,11,'20mg once daily');
INSERT INTO disease_medicines VALUES (9,1,'500mg every 6 hours'),(9,15,'100mg twice daily');
INSERT INTO disease_medicines VALUES (10,10,'10mg once daily'),(10,3,'10mg once daily');
INSERT INTO disease_medicines VALUES (11,2,'400mg twice daily'),(11,1,'500mg as needed');
INSERT INTO disease_medicines VALUES (12,12,'50mg once daily');
INSERT INTO disease_medicines VALUES (13,3,'10mg once daily'),(13,1,'500mg as needed');
INSERT INTO disease_medicines VALUES (14,4,'500mg thrice daily'),(14,1,'500mg every 6 hours');
INSERT INTO disease_medicines VALUES (15,7,'2 puffs when needed');

-- ============================================
-- SEED DATA: PRECAUTIONS
-- ============================================
INSERT INTO precautions (disease_id, precaution) VALUES
(1,'Rest and stay hydrated'),(1,'Avoid cold drinks and exposure to cold air'),(1,'Wash hands frequently'),
(2,'Isolate yourself to avoid spreading'),(2,'Stay hydrated and rest'),(2,'Seek medical help if symptoms worsen'),
(3,'Wear a mask in public places'),(3,'Maintain social distancing'),(3,'Get vaccinated'),
(4,'Rest in a dark and quiet room'),(4,'Avoid screens and bright lights'),(4,'Stay hydrated'),
(5,'Monitor blood pressure regularly'),(5,'Reduce salt intake'),(5,'Exercise regularly and avoid stress'),
(6,'Monitor blood sugar regularly'),(6,'Follow a low-sugar diet'),(6,'Exercise daily'),
(7,'Complete the full course of antibiotics'),(7,'Rest and stay warm'),(7,'Seek immediate medical care'),
(8,'Stay hydrated with ORS'),(8,'Avoid solid foods until vomiting stops'),(8,'Wash hands before eating'),
(9,'Use mosquito repellent'),(9,'Wear full-sleeve clothing'),(9,'Avoid stagnant water near home'),
(10,'Avoid scratching affected areas'),(10,'Use moisturizer regularly'),(10,'Identify and avoid triggers'),
(11,'Do gentle exercises to keep joints mobile'),(11,'Apply hot/cold packs'),(11,'Maintain healthy weight'),
(12,'Practice deep breathing and meditation'),(12,'Seek therapy or counseling'),(12,'Maintain a regular sleep schedule'),
(13,'Inhale steam regularly'),(13,'Use saline nasal spray'),(13,'Stay hydrated'),
(14,'Drink only boiled or purified water'),(14,'Eat freshly cooked food'),(14,'Wash hands before meals'),
(15,'Identify and avoid asthma triggers'),(15,'Always carry your inhaler'),(15,'Avoid smoke and pollution');

-- ============================================
-- SEED DATA: SAMPLE DOCTORS
-- ============================================
INSERT INTO doctors (full_name, email, phone, specialization_id, qualification, experience_years, hospital_name, hospital_address, latitude, longitude, available_days, available_from, available_to, consultation_fee, bio) VALUES
('Dr. Anil Sharma', 'anil.sharma@hospital.com', '9876543210', 1, 'MBBS, MD', 15, 'City General Hospital', 'MG Road, Jaipur, Rajasthan', 26.9124, 75.7873, 'Mon,Tue,Wed,Thu,Fri', '09:00', '17:00', 500.00, 'Experienced general physician with 15 years of practice.'),
('Dr. Priya Mehta', 'priya.mehta@hospital.com', '9876543211', 2, 'MBBS, DM Cardiology', 12, 'Heart Care Center', 'Tonk Road, Jaipur, Rajasthan', 26.8947, 75.8071, 'Mon,Wed,Fri', '10:00', '16:00', 1000.00, 'Specialist in interventional cardiology.'),
('Dr. Ravi Kumar', 'ravi.kumar@hospital.com', '9876543212', 6, 'MBBS, MD Pulmonology', 10, 'Lung Health Clinic', 'Vaishali Nagar, Jaipur, Rajasthan', 26.9260, 75.7387, 'Tue,Thu,Sat', '09:00', '14:00', 800.00, 'Expert in respiratory diseases and asthma management.'),
('Dr. Sneha Gupta', 'sneha.gupta@hospital.com', '9876543213', 3, 'MBBS, MD Dermatology', 8, 'Skin & Hair Clinic', 'C-Scheme, Jaipur, Rajasthan', 26.9011, 75.7994, 'Mon,Tue,Thu,Fri', '11:00', '18:00', 700.00, 'Dermatologist specializing in skin disorders and cosmetic treatments.'),
('Dr. Vikram Singh', 'vikram.singh@hospital.com', '9876543214', 7, 'MBBS, DM Gastroenterology', 18, 'Digestive Health Hospital', 'Sindhi Camp, Jaipur, Rajasthan', 26.9195, 75.8057, 'Mon,Wed,Thu,Fri', '10:00', '17:00', 900.00, 'Senior gastroenterologist with expertise in liver disorders.');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_doctors_specialization ON doctors(specialization_id);
CREATE INDEX idx_disease_symptoms_disease ON disease_symptoms(disease_id);
CREATE INDEX idx_disease_symptoms_symptom ON disease_symptoms(symptom_id);
