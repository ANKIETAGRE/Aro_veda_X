"""
Disease Prediction Module
Uses both rule-based and ML (Scikit-learn) approaches
"""
import numpy as np
import json
from sqlalchemy import text

# All known symptoms (must match DB)
ALL_SYMPTOMS = [
    'fever', 'headache', 'cough', 'cold', 'sore throat',
    'fatigue', 'body ache', 'nausea', 'vomiting', 'diarrhea',
    'chest pain', 'shortness of breath', 'skin rash', 'itching',
    'joint pain', 'back pain', 'dizziness', 'loss of appetite',
    'abdominal pain', 'runny nose', 'sneezing', 'chills',
    'sweating', 'weight loss', 'frequent urination', 'blurred vision',
    'palpitations', 'swollen lymph nodes', 'muscle weakness', 'anxiety'
]

def predict_rule_based(symptoms_entered, db):
    """
    Rule-based prediction: score each disease by matched symptoms with weights
    Returns top 3 disease matches with scores
    """
    from models.models import Disease, Symptom, DiseaseSymptom, DiseaseMedicine, Medicine, Precaution

    symptoms_lower = [s.lower().strip() for s in symptoms_entered]

    # Get all symptom IDs for entered symptoms
    symptom_ids = []
    for sym_name in symptoms_lower:
        sym = Symptom.query.filter(Symptom.name.ilike(f'%{sym_name}%')).first()
        if sym:
            symptom_ids.append(sym.id)

    if not symptom_ids:
        return []

    # Score each disease
    diseases = Disease.query.all()
    scores = []

    for disease in diseases:
        ds_entries = DiseaseSymptom.query.filter_by(disease_id=disease.id).all()
        total_weight = sum(float(ds.weight) for ds in ds_entries)
        matched_weight = sum(
            float(ds.weight) for ds in ds_entries if ds.symptom_id in symptom_ids
        )
        if matched_weight > 0:
            score = (matched_weight / total_weight) * 100 if total_weight > 0 else 0
            scores.append((disease, score))

    # Sort by score descending
    scores.sort(key=lambda x: x[1], reverse=True)
    top = scores[:3]

    results = []
    for disease, score in top:
        if score < 10:
            continue
        # Get medicines
        dm_entries = DiseaseMedicine.query.filter_by(disease_id=disease.id).all()
        medicines = []
        for dm in dm_entries:
            med = Medicine.query.get(dm.medicine_id)
            if med:
                medicines.append({
                    'name': med.name,
                    'type': med.type,
                    'dosage': dm.dosage_instructions
                })
        # Get precautions
        precs = Precaution.query.filter_by(disease_id=disease.id).all()
        precautions = [p.precaution for p in precs]

        results.append({
            'disease': disease.to_dict(),
            'confidence': round(score, 1),
            'medicines': medicines,
            'precautions': precautions,
            'method': 'rule-based'
        })

    return results


def get_symptom_vector(symptoms_entered):
    """Convert symptom list to binary vector"""
    symptoms_lower = [s.lower().strip() for s in symptoms_entered]
    vector = []
    for sym in ALL_SYMPTOMS:
        matched = any(sym in entered or entered in sym for entered in symptoms_lower)
        vector.append(1 if matched else 0)
    return vector


def train_ml_model(db):
    """
    Train a simple Random Forest classifier from DB data
    Returns trained model and label encoder
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    from models.models import Disease, DiseaseSymptom, Symptom

    diseases = Disease.query.all()
    X, y = [], []

    for disease in diseases:
        ds_entries = DiseaseSymptom.query.filter_by(disease_id=disease.id).all()
        symptom_ids = [ds.symptom_id for ds in ds_entries]

        # Get symptom names for this disease
        symptom_names = []
        for sid in symptom_ids:
            sym = Symptom.query.get(sid)
            if sym:
                symptom_names.append(sym.name)

        # Create multiple training samples (with and without some symptoms)
        # Base sample: all symptoms
        vector = [1 if sym in symptom_names else 0 for sym in ALL_SYMPTOMS]
        X.append(vector)
        y.append(disease.name)

        # Partial samples for robustness
        for _ in range(3):
            partial = vector.copy()
            for i in range(len(partial)):
                if partial[i] == 1 and np.random.rand() < 0.3:
                    partial[i] = 0
            if sum(partial) > 0:
                X.append(partial)
                y.append(disease.name)

    if len(X) < 5:
        return None, None

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y_encoded)

    return clf, le


def predict_ml(symptoms_entered, clf, le, db):
    """Use ML model for prediction"""
    from models.models import Disease, DiseaseMedicine, Medicine, Precaution

    if clf is None or le is None:
        return []

    vector = get_symptom_vector(symptoms_entered)
    if sum(vector) == 0:
        return []

    proba = clf.predict_proba([vector])[0]
    top_indices = np.argsort(proba)[::-1][:3]

    results = []
    for idx in top_indices:
        confidence = proba[idx] * 100
        if confidence < 5:
            continue
        disease_name = le.classes_[idx]
        disease = Disease.query.filter_by(name=disease_name).first()
        if not disease:
            continue

        dm_entries = DiseaseMedicine.query.filter_by(disease_id=disease.id).all()
        medicines = []
        for dm in dm_entries:
            med = Medicine.query.get(dm.medicine_id)
            if med:
                medicines.append({
                    'name': med.name,
                    'type': med.type,
                    'dosage': dm.dosage_instructions
                })

        precs = Precaution.query.filter_by(disease_id=disease.id).all()
        precautions = [p.precaution for p in precs]

        results.append({
            'disease': disease.to_dict(),
            'confidence': round(confidence, 1),
            'medicines': medicines,
            'precautions': precautions,
            'method': 'ml'
        })

    return results


def predict_combined(symptoms_entered, clf, le, db):
    """
    Combine rule-based and ML predictions
    Merge results, average scores where disease overlaps
    """
    rule_results = predict_rule_based(symptoms_entered, db)
    ml_results = predict_ml(symptoms_entered, clf, le, db)

    combined = {}

    for r in rule_results:
        name = r['disease']['name']
        combined[name] = r.copy()
        combined[name]['rule_confidence'] = r['confidence']
        combined[name]['ml_confidence'] = 0

    for r in ml_results:
        name = r['disease']['name']
        if name in combined:
            combined[name]['ml_confidence'] = r['confidence']
            combined[name]['confidence'] = round(
                (combined[name]['rule_confidence'] * 0.5 + r['confidence'] * 0.5), 1
            )
            combined[name]['method'] = 'combined'
        else:
            combined[name] = r.copy()
            combined[name]['rule_confidence'] = 0
            combined[name]['ml_confidence'] = r['confidence']

    sorted_results = sorted(combined.values(), key=lambda x: x['confidence'], reverse=True)
    return sorted_results[:3]
