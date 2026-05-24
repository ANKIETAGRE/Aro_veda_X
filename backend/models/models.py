from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Specialization(db.Model):
    __tablename__ = 'specializations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    doctors = db.relationship('Doctor', backref='specialization', lazy=True)
    diseases = db.relationship('Disease', backref='specialization', lazy=True)

class Patient(db.Model):
    __tablename__ = 'patients'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    blood_group = db.Column(db.String(5))
    address = db.Column(db.Text)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    appointments = db.relationship('Appointment', backref='patient', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'full_name': self.full_name, 'email': self.email,
            'phone': self.phone, 'age': self.age, 'gender': self.gender,
            'blood_group': self.blood_group, 'address': self.address,
            'created_at': str(self.created_at)
        }

class Doctor(db.Model):
    __tablename__ = 'doctors'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    specialization_id = db.Column(db.Integer, db.ForeignKey('specializations.id'))
    qualification = db.Column(db.String(200))
    experience_years = db.Column(db.Integer, default=0)
    hospital_name = db.Column(db.String(200))
    hospital_address = db.Column(db.Text)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    available_days = db.Column(db.String(100))
    available_from = db.Column(db.Time)
    available_to = db.Column(db.Time)
    consultation_fee = db.Column(db.Numeric(10, 2))
    bio = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    appointments = db.relationship('Appointment', backref='doctor', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'full_name': self.full_name, 'email': self.email,
            'phone': self.phone, 'qualification': self.qualification,
            'experience_years': self.experience_years,
            'hospital_name': self.hospital_name, 'hospital_address': self.hospital_address,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'available_days': self.available_days,
            'available_from': str(self.available_from) if self.available_from else None,
            'available_to': str(self.available_to) if self.available_to else None,
            'consultation_fee': float(self.consultation_fee) if self.consultation_fee else None,
            'bio': self.bio, 'is_active': self.is_active,
            'specialization': self.specialization.name if self.specialization else None,
            'specialization_id': self.specialization_id
        }

class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), default='Pending')
    reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    treatment_details = db.Column(db.Text)
    # Patient uploads
    patient_note    = db.Column(db.Text)
    doc_file_data   = db.Column(db.Text)
    doc_file_name   = db.Column(db.String(255))
    doc_file_type   = db.Column(db.String(50))
    doc_title       = db.Column(db.String(255))
    # Doctor prescription
    prescription_text = db.Column(db.Text)
    prescription_date = db.Column(db.DateTime)
    follow_up_date    = db.Column(db.Date)
    diagnosis         = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_doc=False):
        d = {
            'id': self.id,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'patient_phone': self.patient.phone if self.patient else None,
            'patient_age':   self.patient.age   if self.patient else None,
            'patient_gender':self.patient.gender if self.patient else None,
            'doctor_id': self.doctor_id,
            'doctor_name': self.doctor.full_name if self.doctor else None,
            'doctor_specialization': self.doctor.specialization.name if self.doctor and self.doctor.specialization else None,
            'appointment_date': str(self.appointment_date),
            'appointment_time': str(self.appointment_time),
            'status': self.status, 'reason': self.reason,
            'notes': self.notes, 'treatment_details': self.treatment_details,
            'patient_note': self.patient_note,
            'doc_file_name': self.doc_file_name,
            'doc_file_type': self.doc_file_type,
            'doc_title':     self.doc_title,
            'has_document':  bool(self.doc_file_data),
            'prescription_text': self.prescription_text,
            'prescription_date': str(self.prescription_date) if self.prescription_date else None,
            'follow_up_date':    str(self.follow_up_date)    if self.follow_up_date    else None,
            'diagnosis':         self.diagnosis,
            'created_at': str(self.created_at)
        }
        if include_doc:
            d['doc_file_data'] = self.doc_file_data
        return d

class Disease(db.Model):
    __tablename__ = 'diseases'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    description = db.Column(db.Text)
    specialization_id = db.Column(db.Integer, db.ForeignKey('specializations.id'))
    severity = db.Column(db.String(20), default='Mild')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'description': self.description,
            'severity': self.severity,
            'specialization': self.specialization.name if self.specialization else None
        }

class Symptom(db.Model):
    __tablename__ = 'symptoms'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    description = db.Column(db.Text)

class DiseaseSymptom(db.Model):
    __tablename__ = 'disease_symptoms'
    disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'), primary_key=True)
    symptom_id = db.Column(db.Integer, db.ForeignKey('symptoms.id'), primary_key=True)
    weight = db.Column(db.Numeric(3, 2), default=1.0)

class Medicine(db.Model):
    __tablename__ = 'medicines'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(100))
    description = db.Column(db.Text)

class DiseaseMedicine(db.Model):
    __tablename__ = 'disease_medicines'
    disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'), primary_key=True)
    medicine_id = db.Column(db.Integer, db.ForeignKey('medicines.id'), primary_key=True)
    dosage_instructions = db.Column(db.Text)

class Precaution(db.Model):
    __tablename__ = 'precautions'
    id = db.Column(db.Integer, primary_key=True)
    disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'))
    precaution = db.Column(db.Text, nullable=False)

class SymptomLog(db.Model):
    __tablename__ = 'symptom_logs'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'))
    symptoms_entered = db.Column(db.Text)
    predicted_disease = db.Column(db.String(200))
    confidence_score = db.Column(db.Numeric(5, 2))
    checked_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    recipient_type = db.Column(db.String(10))
    recipient_id = db.Column(db.Integer, nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'message': self.message,
            'is_read': self.is_read, 'created_at': str(self.created_at)
        }
