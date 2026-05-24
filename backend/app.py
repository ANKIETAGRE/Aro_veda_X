import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from models.models import db
from routes.patient_routes import patient_bp
from routes.doctor_routes import doctor_bp
from routes.hospital_routes import hospital_bp
from routes.auth_routes import auth_bp
from routes.chemist_routes import chemist_bp
from routes.document_routes import doc_bp
from routes.chat_routes import chat_bp

load_dotenv()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 'postgresql://postgres:password@localhost:5432/medical_db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

    CORS(app, origins=['http://localhost:3000', 'http://localhost:5173'])
    db.init_app(app)

    app.register_blueprint(patient_bp)
    app.register_blueprint(doctor_bp)
    app.register_blueprint(hospital_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(chemist_bp)
    app.register_blueprint(doc_bp)
    app.register_blueprint(chat_bp)

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'message': 'Medical API running'})

    @app.route('/api/specializations')
    def specializations():
        from models.models import Specialization
        specs = Specialization.query.order_by(Specialization.name).all()
        return jsonify([{'id': s.id, 'name': s.name} for s in specs])

    with app.app_context():
        db.create_all()
        try:
            from ml.predictor import train_ml_model
            clf, le = train_ml_model(db)
            app.config['ML_MODEL'] = clf
            app.config['ML_ENCODER'] = le
            print("ML model trained successfully")
        except Exception as e:
            print(f"ML model training skipped: {e}")
            app.config['ML_MODEL'] = None
            app.config['ML_ENCODER'] = None

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
