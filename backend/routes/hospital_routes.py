from flask import Blueprint, request, jsonify
from models.models import db
import math
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

@hospital_bp.route('/nearby', methods=['GET'])
def get_nearby_hospitals():
    """Return hospitals within a given radius (km) of a latitude/longitude point.
    Query parameters:
      - lat: latitude (required)
      - lng: longitude (required)
      - radius: search radius in km (optional, default 5 km)
    """
    try:
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        radius = float(request.args.get('radius', 5))
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid or missing lat/lng/radius'}), 400

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Earth radius in km
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * R * math.asin(math.sqrt(a))

    hospitals = Hospital.query.all()
    nearby = [h.to_dict() for h in hospitals if h.latitude is not None and h.longitude is not None and haversine(lat, lng, float(h.latitude), float(h.longitude)) <= radius]
    return jsonify(nearby)
@hospital_bp.route('/seed', methods=['POST'])
def seed_hospitals():
    """Seed the database with sample hospitals in Jaipur."""
    if Hospital.query.first():
        return jsonify({'message': 'Hospitals already exist'}), 200

    sample_hospitals = [
        Hospital(
            name='City Care Hospital', address='Malviya Nagar, Jaipur, Rajasthan', area='Malviya Nagar',
            phone='0141-2345678', emergency_phone='102', hospital_type='General', specializations='General Medicine',
            total_beds=150, latitude=26.8530, longitude=75.8047
        ),
        Hospital(
            name='Apex Super Specialty', address='Mansarovar, Jaipur, Rajasthan', area='Mansarovar',
            phone='0141-8765432', emergency_phone='112', hospital_type='Super Specialty', specializations='Cardiology, Neurology',
            total_beds=300, latitude=26.8549, longitude=75.7634
        ),
        Hospital(
            name='Fortis Escorts', address='JLN Marg, Jaipur, Rajasthan', area='JLN Marg',
            phone='0141-9998888', emergency_phone='112', hospital_type='Private', specializations='Multi-specialty',
            total_beds=250, latitude=26.8370, longitude=75.8055
        ),
        Hospital(
            name='SMS Government Hospital', address='Tonk Road, Jaipur, Rajasthan', area='Tonk Road',
            phone='0141-2223333', emergency_phone='102', hospital_type='Government', specializations='All',
            total_beds=1000, latitude=26.8947, longitude=75.8071
        ),
        Hospital(
            name='Vaishali Nursing Home', address='Vaishali Nagar, Jaipur, Rajasthan', area='Vaishali Nagar',
            phone='0141-4445555', emergency_phone='102', hospital_type='Nursing Home', specializations='Maternity, Pediatrics',
            total_beds=50, latitude=26.9260, longitude=75.7387
        )
    ]
    db.session.add_all(sample_hospitals)
    db.session.commit()
    return jsonify({'message': 'Successfully seeded 5 hospitals'}), 201
