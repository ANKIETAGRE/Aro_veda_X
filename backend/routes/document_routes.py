from flask import Blueprint, request, jsonify
from models.models import db
from datetime import datetime
import traceback
import base64

doc_bp = Blueprint('documents', __name__, url_prefix='/api/documents')

# ── Model ─────────────────────────────────────────────────────────────
class MedicalDocument(db.Model):
    __tablename__ = 'medical_documents'
    id            = db.Column(db.Integer, primary_key=True)
    patient_id    = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    title         = db.Column(db.String(255), nullable=False)
    doc_type      = db.Column(db.String(100), nullable=False)
    category      = db.Column(db.String(100))
    description   = db.Column(db.Text)
    file_data     = db.Column(db.Text, nullable=False)   # base64
    file_name     = db.Column(db.String(255), nullable=False)
    file_type     = db.Column(db.String(50), nullable=False)
    file_size     = db.Column(db.Integer)
    doctor_name   = db.Column(db.String(150))
    hospital_name = db.Column(db.String(200))
    report_date   = db.Column(db.Date)
    tags          = db.Column(db.String(500))
    is_important  = db.Column(db.Boolean, default=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, include_file=False):
        d = {
            'id':            self.id,
            'patient_id':    self.patient_id,
            'title':         self.title,
            'doc_type':      self.doc_type,
            'category':      self.category,
            'description':   self.description,
            'file_name':     self.file_name,
            'file_type':     self.file_type,
            'file_size':     self.file_size,
            'doctor_name':   self.doctor_name,
            'hospital_name': self.hospital_name,
            'report_date':   str(self.report_date) if self.report_date else None,
            'tags':          self.tags,
            'is_important':  self.is_important,
            'created_at':    str(self.created_at),
        }
        if include_file:
            d['file_data'] = self.file_data
        return d

# ── UPLOAD ────────────────────────────────────────────────────────────
@doc_bp.route('/upload', methods=['POST'])
def upload_document():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400

        required = ['patient_id', 'title', 'doc_type', 'file_data', 'file_name', 'file_type']
        for f in required:
            if not data.get(f):
                return jsonify({'error': f'{f} is required'}), 400

        # Validate base64
        try:
            base64.b64decode(data['file_data'].split(',')[-1])
        except Exception:
            return jsonify({'error': 'Invalid file data'}), 400

        report_date = None
        if data.get('report_date'):
            try:
                report_date = datetime.strptime(data['report_date'], '%Y-%m-%d').date()
            except ValueError:
                pass

        doc = MedicalDocument(
            patient_id    = data['patient_id'],
            title         = data['title'].strip(),
            doc_type      = data['doc_type'],
            category      = data.get('category', ''),
            description   = data.get('description', ''),
            file_data     = data['file_data'],
            file_name     = data['file_name'],
            file_type     = data['file_type'],
            file_size     = data.get('file_size', 0),
            doctor_name   = data.get('doctor_name', ''),
            hospital_name = data.get('hospital_name', ''),
            report_date   = report_date,
            tags          = data.get('tags', ''),
            is_important  = data.get('is_important', False),
        )
        db.session.add(doc)
        db.session.commit()
        return jsonify({'message': 'Document uploaded successfully!', 'document': doc.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        print("UPLOAD ERROR:", traceback.format_exc())
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

# ── LIST (no file data) ───────────────────────────────────────────────
@doc_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_documents(patient_id):
    try:
        doc_type  = request.args.get('type', '')
        category  = request.args.get('category', '')
        search    = request.args.get('search', '')
        important = request.args.get('important') == 'true'

        q = MedicalDocument.query.filter_by(patient_id=patient_id)
        if doc_type:  q = q.filter(MedicalDocument.doc_type.ilike(f'%{doc_type}%'))
        if category:  q = q.filter(MedicalDocument.category.ilike(f'%{category}%'))
        if important: q = q.filter_by(is_important=True)
        if search:
            q = q.filter(db.or_(
                MedicalDocument.title.ilike(f'%{search}%'),
                MedicalDocument.doc_type.ilike(f'%{search}%'),
                MedicalDocument.doctor_name.ilike(f'%{search}%'),
                MedicalDocument.hospital_name.ilike(f'%{search}%'),
                MedicalDocument.tags.ilike(f'%{search}%'),
            ))

        docs = q.order_by(MedicalDocument.created_at.desc()).all()
        return jsonify([d.to_dict() for d in docs])

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET SINGLE DOC (with file data for viewing) ───────────────────────
@doc_bp.route('/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    try:
        doc = MedicalDocument.query.get_or_404(doc_id)
        return jsonify(doc.to_dict(include_file=True))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── TOGGLE IMPORTANT ──────────────────────────────────────────────────
@doc_bp.route('/<int:doc_id>/important', methods=['PATCH'])
def toggle_important(doc_id):
    try:
        doc = MedicalDocument.query.get_or_404(doc_id)
        doc.is_important = not doc.is_important
        doc.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'is_important': doc.is_important})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ── DELETE ────────────────────────────────────────────────────────────
@doc_bp.route('/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    try:
        doc = MedicalDocument.query.get_or_404(doc_id)
        db.session.delete(doc)
        db.session.commit()
        return jsonify({'message': 'Document deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
