from flask import Blueprint, request, jsonify
from models.models import db

hospital_bp = Blueprint('hospital', __name__, url_prefix='/api/hospitals')

# ── Add Hospital model inline ────────────────────────────────────────
from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, DateTime
from datetime import datetime

class Hospital(db.Model):
    __tablename__ = 'hospitals'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text)
    area = db.Column(db.String(100))
    city = db.Column(db.String(100), default='Jaipur')
    state = db.Column(db.String(100), default='Rajasthan')
    phone = db.Column(db.String(20))
    emergency_phone = db.Column(db.String(20))
    email = db.Column(db.String(150))
    hospital_type = db.Column(db.String(50))
    specializations = db.Column(db.Text)
    total_beds = db.Column(db.Integer)
    has_emergency = db.Column(db.Boolean, default=True)
    has_icu = db.Column(db.Boolean, default=True)
    has_ambulance = db.Column(db.Boolean, default=True)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    timings = db.Column(db.String(100), default='24/7')
    website = db.Column(db.String(200))
    rating = db.Column(db.Numeric(2, 1), default=4.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'area': self.area,
            'city': self.city,
            'state': self.state,
            'phone': self.phone,
            'emergency_phone': self.emergency_phone,
            'hospital_type': self.hospital_type,
            'specializations': self.specializations,
            'total_beds': self.total_beds,
            'has_emergency': self.has_emergency,
            'has_icu': self.has_icu,
            'has_ambulance': self.has_ambulance,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'timings': self.timings,
            'rating': float(self.rating) if self.rating else None,
        }

# ── ROUTES ───────────────────────────────────────────────────────────
@hospital_bp.route('/', methods=['GET'])
def get_hospitals():
    hospital_type = request.args.get('type')
    area = request.args.get('area')
    search = request.args.get('search')

    query = Hospital.query

    if hospital_type:
        query = query.filter_by(hospital_type=hospital_type)
    if area:
        query = query.filter(Hospital.area.ilike(f'%{area}%'))
    if search:
        query = query.filter(
            db.or_(
                Hospital.name.ilike(f'%{search}%'),
                Hospital.specializations.ilike(f'%{search}%'),
                Hospital.area.ilike(f'%{search}%')
            )
        )

    hospitals = query.order_by(Hospital.rating.desc()).all()
    return jsonify([h.to_dict() for h in hospitals])

@hospital_bp.route('/types', methods=['GET'])
def get_types():
    types = db.session.query(Hospital.hospital_type).distinct().all()
    return jsonify([t[0] for t in types if t[0]])

@hospital_bp.route('/areas', methods=['GET'])
def get_areas():
    areas = db.session.query(Hospital.area).distinct().order_by(Hospital.area).all()
    return jsonify([a[0] for a in areas if a[0]])
