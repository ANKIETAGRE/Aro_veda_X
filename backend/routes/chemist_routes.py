from flask import Blueprint, request, jsonify
from models.models import db
from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, DateTime
from datetime import datetime

chemist_bp = Blueprint('chemist', __name__, url_prefix='/api/chemists')

class ChemistShop(db.Model):
    __tablename__ = 'chemist_shops'
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(200), nullable=False)
    address       = db.Column(db.Text)
    area          = db.Column(db.String(100))
    city          = db.Column(db.String(100), default='Jaipur')
    phone         = db.Column(db.String(20))
    owner_name    = db.Column(db.String(100))
    open_time     = db.Column(db.String(20), default='8:00 AM')
    close_time    = db.Column(db.String(20), default='10:00 PM')
    is_24hrs      = db.Column(db.Boolean, default=False)
    has_generic   = db.Column(db.Boolean, default=True)
    has_ayurvedic = db.Column(db.Boolean, default=False)
    home_delivery = db.Column(db.Boolean, default=False)
    latitude      = db.Column(db.Numeric(10, 8))
    longitude     = db.Column(db.Numeric(11, 8))
    rating        = db.Column(db.Numeric(2, 1), default=4.0)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'address':       self.address,
            'area':          self.area,
            'city':          self.city,
            'phone':         self.phone,
            'owner_name':    self.owner_name,
            'open_time':     self.open_time,
            'close_time':    self.close_time,
            'is_24hrs':      self.is_24hrs,
            'has_generic':   self.has_generic,
            'has_ayurvedic': self.has_ayurvedic,
            'home_delivery': self.home_delivery,
            'latitude':      float(self.latitude)  if self.latitude  else None,
            'longitude':     float(self.longitude) if self.longitude else None,
            'rating':        float(self.rating)    if self.rating    else None,
        }

@chemist_bp.route('/', methods=['GET'])
def get_chemists():
    search    = request.args.get('search', '')
    area      = request.args.get('area', '')
    only_24hr = request.args.get('only_24hr') == 'true'
    delivery  = request.args.get('delivery')  == 'true'
    generic   = request.args.get('generic')   == 'true'

    q = ChemistShop.query
    if search:
        q = q.filter(db.or_(
            ChemistShop.name.ilike(f'%{search}%'),
            ChemistShop.area.ilike(f'%{search}%'),
        ))
    if area:    q = q.filter(ChemistShop.area.ilike(f'%{area}%'))
    if only_24hr: q = q.filter_by(is_24hrs=True)
    if delivery:  q = q.filter_by(home_delivery=True)
    if generic:   q = q.filter_by(has_generic=True)

    shops = q.order_by(ChemistShop.rating.desc()).all()
    return jsonify([s.to_dict() for s in shops])

@chemist_bp.route('/search-medicine', methods=['GET'])
def search_medicine():
    """Find chemists that likely carry a given medicine (all chemists for now — can be extended)"""
    medicine = request.args.get('medicine', '')
    shops = ChemistShop.query.order_by(ChemistShop.rating.desc()).limit(10).all()
    return jsonify({
        'medicine': medicine,
        'shops': [s.to_dict() for s in shops]
    })
