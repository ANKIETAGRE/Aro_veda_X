from flask import Blueprint, request, jsonify
from models.models import db, Patient, Doctor, Appointment, Symptom, Disease, Notification, SymptomLog
from datetime import datetime
import json

patient_bp = Blueprint('patient', __name__, url_prefix='/api/patient')


# ─── PATIENT PROFILE ────────────────────────────────────────────────
@patient_bp.route('/profile', methods=['GET'])
def get_patient():
    patient_id = request.args.get('id')
    if not patient_id:
        return jsonify({'error': 'Patient ID required'}), 400
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    return jsonify(patient.to_dict())

@patient_bp.route('/profile', methods=['POST'])
def create_patient():
    data = request.json
    if Patient.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already registered'}), 400
    patient = Patient(
        full_name=data.get('full_name'),
        email=data.get('email'),
        phone=data.get('phone'),
        age=data.get('age'),
        gender=data.get('gender'),
        blood_group=data.get('blood_group'),
        address=data.get('address')
    )
    db.session.add(patient)
    db.session.commit()
    return jsonify(patient.to_dict()), 201

@patient_bp.route('/profile/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    data = request.json
    for field in ['full_name', 'phone', 'age', 'gender', 'blood_group', 'address']:
        if field in data:
            setattr(patient, field, data[field])
    db.session.commit()
    return jsonify(patient.to_dict())

@patient_bp.route('/all', methods=['GET'])
def get_all_patients():
    patients = Patient.query.all()
    return jsonify([p.to_dict() for p in patients])


# ─── APPOINTMENTS ────────────────────────────────────────────────────
@patient_bp.route('/appointments', methods=['GET'])
def get_appointments():
    patient_id = request.args.get('patient_id')
    if not patient_id:
        return jsonify({'error': 'Patient ID required'}), 400
    appointments = Appointment.query.filter_by(patient_id=patient_id).order_by(
        Appointment.appointment_date.desc()
    ).all()
    return jsonify([a.to_dict() for a in appointments])

@patient_bp.route('/appointments', methods=['POST'])
def book_appointment():
    data = request.json
    required = ['patient_id', 'doctor_id', 'appointment_date', 'appointment_time']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Check for existing appointment at same slot
    existing = Appointment.query.filter_by(
        doctor_id=data['doctor_id'],
        appointment_date=data['appointment_date'],
        appointment_time=data['appointment_time']
    ).filter(Appointment.status.notin_(['Cancelled'])).first()

    if existing:
        return jsonify({'error': 'This time slot is already booked'}), 409

    appointment = Appointment(
        patient_id=data['patient_id'],
        doctor_id=data['doctor_id'],
        appointment_date=data['appointment_date'],
        appointment_time=data['appointment_time'],
        reason=data.get('reason'),
        status='Pending',
        patient_note  = data.get('patient_note', ''),
        doc_file_data = data.get('doc_file_data', ''),
        doc_file_name = data.get('doc_file_name', ''),
        doc_file_type = data.get('doc_file_type', ''),
        doc_title     = data.get('doc_title', ''),
    )
    db.session.add(appointment)

    # Notify doctor
    doctor = Doctor.query.get(data['doctor_id'])
    patient = Patient.query.get(data['patient_id'])
    if doctor and patient:
        notif = Notification(
            recipient_type='doctor',
            recipient_id=data['doctor_id'],
            message=f"New appointment request from {patient.full_name} on {data['appointment_date']} at {data['appointment_time']}"
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify(appointment.to_dict()), 201

@patient_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
def reschedule_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.json

    if appointment.status == 'Completed':
        return jsonify({'error': 'Cannot modify completed appointments'}), 400

    if data.get('appointment_date'):
        appointment.appointment_date = data['appointment_date']
    if data.get('appointment_time'):
        appointment.appointment_time = data['appointment_time']
    if data.get('reason'):
        appointment.reason = data['reason']

    appointment.status = 'Rescheduled'
    appointment.updated_at = datetime.utcnow()

    # Notify doctor
    patient = Patient.query.get(appointment.patient_id)
    if patient:
        notif = Notification(
            recipient_type='doctor',
            recipient_id=appointment.doctor_id,
            message=f"Appointment rescheduled by {patient.full_name} to {appointment.appointment_date} at {appointment.appointment_time}"
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify(appointment.to_dict())

@patient_bp.route('/appointments/<int:appointment_id>/cancel', methods=['PUT'])
def cancel_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    if appointment.status in ['Completed', 'Cancelled']:
        return jsonify({'error': f'Cannot cancel a {appointment.status} appointment'}), 400
    appointment.status = 'Cancelled'
    appointment.updated_at = datetime.utcnow()

    patient = Patient.query.get(appointment.patient_id)
    if patient:
        notif = Notification(
            recipient_type='doctor',
            recipient_id=appointment.doctor_id,
            message=f"Appointment cancelled by {patient.full_name} (was on {appointment.appointment_date})"
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify({'message': 'Appointment cancelled', 'appointment': appointment.to_dict()})


# ─── DOCTORS ────────────────────────────────────────────────────────
@patient_bp.route('/doctors', methods=['GET'])
def get_doctors():
    specialization_id = request.args.get('specialization_id')
    query = Doctor.query.filter_by(is_active=True)
    if specialization_id:
        query = query.filter_by(specialization_id=specialization_id)
    doctors = query.all()
    return jsonify([d.to_dict() for d in doctors])

@patient_bp.route('/doctors/<int:doctor_id>/slots', methods=['GET'])
def get_available_slots(doctor_id):
    date = request.args.get('date')
    if not date:
        return jsonify({'error': 'Date required'}), 400

    doctor = Doctor.query.get_or_404(doctor_id)
    booked = Appointment.query.filter_by(
        doctor_id=doctor_id,
        appointment_date=date
    ).filter(Appointment.status.notin_(['Cancelled'])).all()

    booked_times = [str(a.appointment_time)[:5] for a in booked]

    # Generate slots
    from_hour = doctor.available_from.hour if doctor.available_from else 9
    to_hour = doctor.available_to.hour if doctor.available_to else 17
    slots = []
    for h in range(from_hour, to_hour):
        slot = f"{h:02d}:00"
        slots.append({'time': slot, 'available': slot not in booked_times})
        slot_half = f"{h:02d}:30"
        slots.append({'time': slot_half, 'available': slot_half not in booked_times})

    return jsonify(slots)


# ─── SYMPTOM CHECK & PREDICTION ────────────────────────────────────
@patient_bp.route('/symptoms', methods=['GET'])
def get_symptoms():
    symptoms = Symptom.query.order_by(Symptom.name).all()
    return jsonify([{'id': s.id, 'name': s.name} for s in symptoms])

@patient_bp.route('/predict', methods=['POST'])
def predict_disease():
    from flask import current_app
    data = request.json
    symptoms = data.get('symptoms', [])
    patient_id = data.get('patient_id')

    if not symptoms:
        return jsonify({'error': 'Please provide at least one symptom'}), 400

    clf = current_app.config.get('ML_MODEL')
    le = current_app.config.get('ML_ENCODER')

    from ml.predictor import predict_combined
    results = predict_combined(symptoms, clf, le, db)

    # Log it
    if patient_id:
        log = SymptomLog(
            patient_id=patient_id,
            symptoms_entered=json.dumps(symptoms),
            predicted_disease=results[0]['disease']['name'] if results else None,
            confidence_score=results[0]['confidence'] if results else 0
        )
        db.session.add(log)
        db.session.commit()

    return jsonify({'results': results, 'symptoms_checked': symptoms})


# ─── NOTIFICATIONS ───────────────────────────────────────────────────
@patient_bp.route('/notifications', methods=['GET'])
def get_notifications():
    patient_id = request.args.get('patient_id')
    if not patient_id:
        return jsonify({'error': 'Patient ID required'}), 400
    notifs = Notification.query.filter_by(
        recipient_type='patient', recipient_id=patient_id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify([n.to_dict() for n in notifs])

@patient_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
def mark_read(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    notif.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})


# ── UPLOAD / UPDATE DOCUMENT ON APPOINTMENT ──────────────────────────
@patient_bp.route('/appointments/<int:appointment_id>/upload-doc', methods=['PUT'])
def upload_appointment_doc(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.json
    if data.get('doc_file_data'):  appointment.doc_file_data = data['doc_file_data']
    if data.get('doc_file_name'):  appointment.doc_file_name = data['doc_file_name']
    if data.get('doc_file_type'):  appointment.doc_file_type = data['doc_file_type']
    if data.get('doc_title'):      appointment.doc_title     = data['doc_title']
    if 'patient_note' in data:     appointment.patient_note  = data['patient_note']
    appointment.updated_at = datetime.utcnow()
    db.session.commit()
    # Notify doctor
    patient = Patient.query.get(appointment.patient_id)
    notif = Notification(
        recipient_type='doctor',
        recipient_id=appointment.doctor_id,
        message=f"{patient.full_name if patient else 'A patient'} attached a document to their appointment on {appointment.appointment_date}."
    )
    db.session.add(notif)
    db.session.commit()
    return jsonify({'message': 'Document attached!', 'appointment': appointment.to_dict()})

# ── GET APPOINTMENT WITH DOCUMENT DATA ───────────────────────────────
@patient_bp.route('/appointments/<int:appointment_id>/detail', methods=['GET'])
def get_appointment_detail(appointment_id):
    appt = Appointment.query.get_or_404(appointment_id)
    return jsonify(appt.to_dict(include_doc=True))
