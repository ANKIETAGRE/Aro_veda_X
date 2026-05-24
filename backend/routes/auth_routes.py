from flask import Blueprint, request, jsonify
from models.models import db, Patient, Doctor
from werkzeug.security import generate_password_hash, check_password_hash
import traceback

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ── PATIENT REGISTER ─────────────────────────────────────────────────
@auth_bp.route('/patient/register', methods=['POST'])
def patient_register():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400

        for f in ['full_name', 'email', 'password']:
            if not data.get(f):
                return jsonify({'error': f'{f} is required'}), 400

        email = data['email'].lower().strip()

        if Patient.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered. Please login instead.'}), 409

        patient = Patient(
            full_name     = data['full_name'].strip(),
            email         = email,
            phone         = data.get('phone', ''),
            age           = data.get('age') or None,
            gender        = data.get('gender', 'Male'),
            blood_group   = data.get('blood_group', ''),
            password_hash = generate_password_hash(data['password'])
        )
        db.session.add(patient)
        db.session.commit()
        return jsonify({'message': 'Registration successful!', 'user': patient.to_dict(), 'role': 'patient'}), 201

    except Exception as e:
        db.session.rollback()
        err_detail = traceback.format_exc()
        print("REGISTER ERROR:", err_detail)
        # Return the real error so user/dev can see it
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# ── PATIENT LOGIN ─────────────────────────────────────────────────────
@auth_bp.route('/patient/login', methods=['POST'])
def patient_login():
    try:
        data = request.json
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        patient = Patient.query.filter_by(email=data['email'].lower().strip()).first()

        if not patient:
            return jsonify({'error': 'Email not registered. Please create an account first.'}), 404

        if not patient.password_hash:
            return jsonify({'error': 'No password set for this account. Please register again.'}), 400

        if not check_password_hash(patient.password_hash, data['password']):
            return jsonify({'error': 'Incorrect password. Please try again.'}), 401

        return jsonify({'message': 'Login successful!', 'user': patient.to_dict(), 'role': 'patient'}), 200

    except Exception as e:
        print("LOGIN ERROR:", traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# ── DOCTOR REGISTER ───────────────────────────────────────────────────
@auth_bp.route('/doctor/register', methods=['POST'])
def doctor_register():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400

        for f in ['full_name', 'email', 'password', 'specialization_id']:
            if not data.get(f):
                return jsonify({'error': f'{f} is required'}), 400

        email = data['email'].lower().strip()

        if Doctor.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered. Please login instead.'}), 409

        doctor = Doctor(
            full_name         = data['full_name'].strip(),
            email             = email,
            phone             = data.get('phone', ''),
            specialization_id = data['specialization_id'],
            qualification     = data.get('qualification', ''),
            experience_years  = data.get('experience_years') or 0,
            hospital_name     = data.get('hospital_name', ''),
            hospital_address  = data.get('hospital_address', ''),
            available_days    = data.get('available_days', 'Mon,Tue,Wed,Thu,Fri'),
            available_from    = data.get('available_from', '09:00'),
            available_to      = data.get('available_to', '17:00'),
            consultation_fee  = data.get('consultation_fee') or 500,
            bio               = data.get('bio', ''),
            password_hash     = generate_password_hash(data['password'])
        )
        db.session.add(doctor)
        db.session.commit()
        return jsonify({'message': 'Registration successful!', 'user': doctor.to_dict(), 'role': 'doctor'}), 201

    except Exception as e:
        db.session.rollback()
        print("DOCTOR REGISTER ERROR:", traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# ── DOCTOR LOGIN ──────────────────────────────────────────────────────
@auth_bp.route('/doctor/login', methods=['POST'])
def doctor_login():
    try:
        data = request.json
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        doctor = Doctor.query.filter_by(email=data['email'].lower().strip()).first()

        if not doctor:
            return jsonify({'error': 'Email not registered. Please create an account first.'}), 404

        if not doctor.password_hash:
            return jsonify({'error': 'No password set. Please register again.'}), 400

        if not check_password_hash(doctor.password_hash, data['password']):
            return jsonify({'error': 'Incorrect password. Please try again.'}), 401

        return jsonify({'message': 'Login successful!', 'user': doctor.to_dict(), 'role': 'doctor'}), 200

    except Exception as e:
        print("DOCTOR LOGIN ERROR:", traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500
