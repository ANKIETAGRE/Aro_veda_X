from flask import Blueprint, request, jsonify
from models.models import db, Doctor, Appointment, Patient, Notification, Specialization
from datetime import datetime

doctor_bp = Blueprint('doctor', __name__, url_prefix='/api/doctor')


# ─── DOCTOR PROFILE ─────────────────────────────────────────────────
@doctor_bp.route('/profile/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    return jsonify(doctor.to_dict())

@doctor_bp.route('/profile', methods=['POST'])
def create_doctor():
    data = request.json
    if Doctor.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already registered'}), 400
    doctor = Doctor(
        full_name=data.get('full_name'),
        email=data.get('email'),
        phone=data.get('phone'),
        specialization_id=data.get('specialization_id'),
        qualification=data.get('qualification'),
        experience_years=data.get('experience_years', 0),
        hospital_name=data.get('hospital_name'),
        hospital_address=data.get('hospital_address'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        available_days=data.get('available_days'),
        available_from=data.get('available_from'),
        available_to=data.get('available_to'),
        consultation_fee=data.get('consultation_fee'),
        bio=data.get('bio'),
    )
    db.session.add(doctor)
    db.session.commit()
    return jsonify(doctor.to_dict()), 201

@doctor_bp.route('/profile/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    data = request.json
    fields = [
        'full_name', 'phone', 'qualification', 'experience_years',
        'hospital_name', 'hospital_address', 'latitude', 'longitude',
        'available_days', 'available_from', 'available_to',
        'consultation_fee', 'bio', 'is_active', 'specialization_id'
    ]
    for field in fields:
        if field in data:
            setattr(doctor, field, data[field])
    db.session.commit()
    return jsonify(doctor.to_dict())


# ─── APPOINTMENTS ────────────────────────────────────────────────────
@doctor_bp.route('/appointments', methods=['GET'])
def get_appointments():
    doctor_id = request.args.get('doctor_id')
    status = request.args.get('status')
    date = request.args.get('date')

    if not doctor_id:
        return jsonify({'error': 'Doctor ID required'}), 400

    query = Appointment.query.filter_by(doctor_id=doctor_id)
    if status:
        query = query.filter_by(status=status)
    if date:
        query = query.filter_by(appointment_date=date)

    appointments = query.order_by(Appointment.appointment_date.desc()).all()
    return jsonify([a.to_dict() for a in appointments])

@doctor_bp.route('/appointments/<int:appointment_id>/status', methods=['PUT'])
def update_appointment_status(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.json
    new_status = data.get('status')

    valid_statuses = ['Pending', 'Approved', 'Completed', 'Cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of {valid_statuses}'}), 400

    old_status = appointment.status
    appointment.status = new_status

    if data.get('treatment_details'):
        appointment.treatment_details = data['treatment_details']
    if data.get('notes'):
        appointment.notes = data['notes']

    appointment.updated_at = datetime.utcnow()

    # Notify patient
    doctor = Doctor.query.get(appointment.doctor_id)
    msg_map = {
        'Approved': f"Your appointment with Dr. {doctor.full_name} on {appointment.appointment_date} has been approved.",
        'Completed': f"Your consultation with Dr. {doctor.full_name} has been marked as completed.",
        'Cancelled': f"Your appointment with Dr. {doctor.full_name} on {appointment.appointment_date} has been cancelled by the doctor."
    }
    if new_status in msg_map:
        notif = Notification(
            recipient_type='patient',
            recipient_id=appointment.patient_id,
            message=msg_map[new_status]
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify(appointment.to_dict())

@doctor_bp.route('/appointments/<int:appointment_id>/treatment', methods=['PUT'])
def update_treatment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.json
    appointment.treatment_details = data.get('treatment_details', appointment.treatment_details)
    appointment.notes = data.get('notes', appointment.notes)
    if appointment.status != 'Completed':
        appointment.status = 'Completed'
    appointment.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(appointment.to_dict())


# ─── DASHBOARD STATS ─────────────────────────────────────────────────
@doctor_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    doctor_id = request.args.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor ID required'}), 400

    total = Appointment.query.filter_by(doctor_id=doctor_id).count()
    pending = Appointment.query.filter_by(doctor_id=doctor_id, status='Pending').count()
    approved = Appointment.query.filter_by(doctor_id=doctor_id, status='Approved').count()
    completed = Appointment.query.filter_by(doctor_id=doctor_id, status='Completed').count()
    cancelled = Appointment.query.filter_by(doctor_id=doctor_id, status='Cancelled').count()

    today = datetime.today().date()
    today_appointments = Appointment.query.filter_by(
        doctor_id=doctor_id, appointment_date=today
    ).filter(Appointment.status.notin_(['Cancelled'])).all()

    return jsonify({
        'stats': {
            'total': total, 'pending': pending, 'approved': approved,
            'completed': completed, 'cancelled': cancelled
        },
        'today_appointments': [a.to_dict() for a in today_appointments]
    })


# ─── NOTIFICATIONS ───────────────────────────────────────────────────
@doctor_bp.route('/notifications', methods=['GET'])
def get_notifications():
    doctor_id = request.args.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor ID required'}), 400
    notifs = Notification.query.filter_by(
        recipient_type='doctor', recipient_id=doctor_id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify([n.to_dict() for n in notifs])

@doctor_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
def mark_read(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    notif.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})


# ─── PATIENTS (viewed by doctor) ─────────────────────────────────────
@doctor_bp.route('/patients', methods=['GET'])
def get_my_patients():
    doctor_id = request.args.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor ID required'}), 400

    patient_ids = db.session.query(Appointment.patient_id).filter_by(
        doctor_id=doctor_id
    ).distinct().all()
    patient_ids = [pid[0] for pid in patient_ids]
    patients = Patient.query.filter(Patient.id.in_(patient_ids)).all()
    return jsonify([p.to_dict() for p in patients])

@doctor_bp.route('/patients/<int:patient_id>/history', methods=['GET'])
def get_patient_history(patient_id):
    doctor_id = request.args.get('doctor_id')
    query = Appointment.query.filter_by(patient_id=patient_id)
    if doctor_id:
        query = query.filter_by(doctor_id=doctor_id)
    appointments = query.order_by(Appointment.appointment_date.desc()).all()
    patient = Patient.query.get_or_404(patient_id)
    return jsonify({
        'patient': patient.to_dict(),
        'appointments': [a.to_dict() for a in appointments]
    })


# ─── SPECIALIZATIONS ─────────────────────────────────────────────────
@doctor_bp.route('/specializations', methods=['GET'])
def get_specializations():
    specs = Specialization.query.order_by(Specialization.name).all()
    return jsonify([{'id': s.id, 'name': s.name, 'description': s.description} for s in specs])


# ── VIEW APPOINTMENT DOCUMENT ──────────────────────────────────────
@doctor_bp.route('/appointments/<int:appointment_id>/document', methods=['GET'])
def get_appointment_document(appointment_id):
    appt = Appointment.query.get_or_404(appointment_id)
    return jsonify(appt.to_dict(include_doc=True))

# ── WRITE / UPDATE PRESCRIPTION ───────────────────────────────────
@doctor_bp.route('/appointments/<int:appointment_id>/prescription', methods=['POST'])
def save_prescription(appointment_id):
    appt = Appointment.query.get_or_404(appointment_id)
    data = request.json

    appt.diagnosis         = data.get('diagnosis', '')
    appt.prescription_text = data.get('prescription_text', '')
    appt.follow_up_date    = data.get('follow_up_date') or None
    appt.prescription_date = datetime.utcnow()
    appt.treatment_details = data.get('treatment_details', '')
    if data.get('status'):
        appt.status = data['status']
    appt.updated_at = datetime.utcnow()
    db.session.commit()

    # Notify patient
    doctor = Doctor.query.get(appt.doctor_id)
    notif = Notification(
        recipient_type='patient',
        recipient_id=appt.patient_id,
        message=f"Dr. {doctor.full_name if doctor else 'Your doctor'} has provided a prescription for your appointment on {appt.appointment_date}."
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({'message': 'Prescription saved!', 'appointment': appt.to_dict()})
