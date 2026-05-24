from flask import Blueprint, request, jsonify
import os, json, traceback, requests

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

SYSTEM_PROMPT = """You are AroBot, a friendly and knowledgeable medical assistant for AroVedax — a healthcare appointment booking platform.

Your role is to help patients and doctors with:
1. **Appointment Booking** — how to book, reschedule, or cancel appointments; choosing the right doctor
2. **Symptom Checker** — how to use it, what the predictions mean, when to see a doctor urgently
3. **Finding Hospitals** — how to use the map, filter types, get directions
4. **Nearby Chemists** — how to find medicine shops, get directions, use filters
5. **Medical Documents** — how to upload, view, and manage X-rays, blood reports, prescriptions
6. **Doctor Portal** — how doctors can view patient documents and write prescriptions
7. **General Health Queries** — basic health info, when to seek emergency care
8. **Account & Login Issues** — registration, login, profile setup

Guidelines:
- Be warm, empathetic, and clear. You are talking to patients who may be worried or confused.
- Keep responses concise but complete. Use bullet points for steps.
- For serious medical emergencies (chest pain, difficulty breathing, unconsciousness), always say: "⚠️ This sounds like a medical emergency. Please call 112 immediately or go to the nearest emergency room."
- For symptom questions, remind users the Symptom Checker is for guidance only — always recommend consulting a real doctor.
- If asked about specific medicines or dosages, give general info but say a doctor or pharmacist should be consulted.
- Use relevant emojis to make responses friendly (📅, 💊, 🏥, 🗺️, 📎, etc.)
- Always refer to the platform as "AroVedax"
- If you don't know something specific about AroVedax, say so honestly and guide the user to the relevant section.
- Format navigation tips like: Go to **Patient Portal → [Section Name]**

AroVedax Feature Summary:
- Patient Portal: Dashboard, Symptom Checker, Find Doctors, My Appointments, Nearby Hospitals, Nearby Chemists, My Documents
- Doctor Portal: Dashboard, Appointments (view patient docs + write Rx), Patients, Profile
- Booking flow: 3 steps — Date/Time → Reason & Note → Upload Document (optional) → Confirm
- Prescription: Doctors write prescriptions inside each appointment; patients see them with a green "💊 Rx Ready" badge
"""

@chat_bp.route('/message', methods=['POST'])
def chat_message():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data'}), 400

        messages   = data.get('messages', [])
        user_msg   = data.get('message', '')
        portal     = data.get('portal', 'patient')  # patient or doctor

        if not user_msg.strip():
            return jsonify({'error': 'Message is empty'}), 400

        # Build conversation history
        history = []
        for m in messages[-10:]:  # keep last 10 messages for context
            if m.get('role') in ('user', 'assistant') and m.get('content'):
                history.append({'role': m['role'], 'content': m['content']})

        # Add current message
        history.append({'role': 'user', 'content': user_msg})

        api_key = os.getenv('ANTHROPIC_API_KEY', '')
        if not api_key:
            # Fallback smart responses when no API key
            reply = get_fallback_response(user_msg, portal)
            return jsonify({'reply': reply, 'fallback': True})

        # Call Anthropic API
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json={
                'model': 'claude-haiku-4-5-20251001',
                'max_tokens': 600,
                'system': SYSTEM_PROMPT + (f"\n\nThe user is currently in the **{portal.title()} Portal**." if portal else ''),
                'messages': history,
            },
            timeout=30
        )

        if resp.status_code != 200:
            reply = get_fallback_response(user_msg, portal)
            return jsonify({'reply': reply, 'fallback': True})

        result = resp.json()
        reply  = result['content'][0]['text']
        return jsonify({'reply': reply})

    except Exception as e:
        print("CHAT ERROR:", traceback.format_exc())
        return jsonify({'reply': get_fallback_response(data.get('message',''), 'patient'), 'fallback': True})


def get_fallback_response(msg, portal):
    """Smart rule-based fallback when API key not set"""
    m = msg.lower()

    if any(w in m for w in ['emergency', 'chest pain', 'can\'t breathe', 'unconscious', 'heart attack', 'stroke']):
        return "⚠️ **This sounds like a medical emergency!**\n\nPlease call **112** immediately or go to the nearest emergency room. Do not wait.\n\nFor nearest hospitals, go to **Patient Portal → Nearby Hospitals** and use the emergency filter. 🏥"

    if any(w in m for w in ['book', 'appointment', 'schedule', 'doctor']):
        return "📅 **Booking an Appointment:**\n\n1. Go to **Patient Portal → Find Doctors**\n2. Filter by specialization if needed\n3. Click **Book Appointment** on any doctor\n4. Choose date & time slot\n5. Add reason and optional note to doctor\n6. Upload any relevant reports (X-Ray, blood test, etc.) — optional\n7. Confirm booking!\n\nYour doctor will approve and you'll get notified. 😊"

    if any(w in m for w in ['symptom', 'checker', 'disease', 'diagnosis', 'sick', 'pain', 'fever']):
        return "🔍 **Using the Symptom Checker:**\n\n1. Go to **Patient Portal → Symptom Checker**\n2. Search and select your symptoms\n3. Click **Analyze** — our AI predicts possible conditions\n4. View suggested medicines and nearby chemists for each result\n5. Click **Find Doctor** to book with the right specialist\n\n⚠️ The Symptom Checker is for guidance only — always consult a real doctor for proper diagnosis."

    if any(w in m for w in ['hospital', 'nearby', 'map', 'emergency hospital', 'direction']):
        return "🏥 **Finding Nearby Hospitals:**\n\n1. Go to **Patient Portal → Nearby Hospitals**\n2. Your location is detected automatically (or enter manually)\n3. Filter by type: Government, Private, Super Specialty, etc.\n4. Toggle **Emergency Only** to show 24-hour emergency hospitals\n5. Click any hospital → **Open Directions in Google Maps** 🗺️\n\nChoose Walk, Drive, or Cycle mode for directions!"

    if any(w in m for w in ['chemist', 'medicine', 'pharmacy', 'drug', 'tablet', 'shop']):
        return "💊 **Finding Nearby Chemists:**\n\n1. Go to **Patient Portal → Nearby Chemists**\n2. Filter: 🔴 24-Hour open, 🛵 Home Delivery, 💰 Generic Medicines\n3. Search by shop name or area\n4. Click any shop → **Open Directions in Google Maps**\n\nAlso, after using the Symptom Checker, medicines show **✅ Available nearby** and you can get directions directly from the results page!"

    if any(w in m for w in ['document', 'upload', 'report', 'xray', 'x-ray', 'blood test', 'mri', 'scan']):
        return "📂 **Managing Medical Documents:**\n\n**Upload documents:**\n- Go to **Patient Portal → My Documents** → click **Upload Document**\n- Or attach while booking: **Find Doctors → Book → Step 3: Upload Document**\n\n**Supported types:** X-Ray 🩻, MRI, Blood Test 🩸, ECG, Prescription, and 12+ more\n\n**View/Download:** Click any document card to open it inline\n\n**Mark Important:** Click ⭐ to star important documents"

    if any(w in m for w in ['prescription', 'rx', 'medicine from doctor', 'doctor wrote']):
        return "💊 **Viewing Your Prescription:**\n\n1. Go to **Patient Portal → My Appointments**\n2. Look for the **💊 Rx Ready** green badge\n3. Click **View →** to open your prescription\n4. You'll see: Diagnosis, Medicines with dosage, Follow-up date\n\nYou get a notification when your doctor writes a prescription! 🔔"

    if any(w in m for w in ['cancel', 'reschedule', 'change appointment']):
        return "📅 **Rescheduling or Cancelling:**\n\n**Reschedule:**\n1. Go to **My Appointments**\n2. Click **📅 Reschedule** on the appointment\n3. Pick a new date and time slot\n4. Confirm\n\n**Cancel:**\n1. Click **✕ Cancel** on the appointment\n2. Confirm cancellation\n\n⚠️ Completed or already-cancelled appointments cannot be modified."

    if any(w in m for w in ['login', 'register', 'sign up', 'account', 'password', 'forgot']):
        return "🔐 **Account Help:**\n\n**Register:** Click **Patient Portal** or **Doctor Portal** on the home screen → **Register** tab → fill in details\n\n**Login:** Enter your registered email and password\n\n**Wrong password?** Make sure Caps Lock is off and you're using the correct email\n\n**New account:** Email must be unique — each email can only register once per portal\n\nFor further help, contact support. 📧"

    if any(w in m for w in ['doctor portal', 'doctor side', 'how do i approve', 'how to write prescription']):
        return "👨‍⚕️ **Doctor Portal Guide:**\n\n**Approving appointments:**\nAppointments → Click ✅ Approve on Pending appointments\n\n**Viewing patient documents:**\nClick 👁️ Open on any appointment → see patient's uploaded X-Ray/report on the left\n\n**Writing a Prescription:**\n1. Click 👁️ Open on an Approved appointment\n2. Click **💊 Write Rx**\n3. Enter diagnosis, prescription details, follow-up date\n4. Click **Save & Send** — patient gets notified instantly!"

    if any(w in m for w in ['hello', 'hi', 'hey', 'help', 'helo', 'good morning', 'good evening']):
        return "👋 **Hello! I'm AroBot**, your AroVedax assistant!\n\nI can help you with:\n\n📅 **Booking appointments**\n🔍 **Symptom checker**\n🏥 **Finding hospitals**\n💊 **Nearby chemists**\n📂 **Medical documents**\n💊 **Prescriptions**\n🔐 **Account issues**\n\nWhat do you need help with today?"

    return "🤔 I'm not sure about that specific query. Here's what I can help with:\n\n• 📅 Appointment booking & management\n• 🔍 Symptom Checker usage\n• 🏥 Nearby Hospitals map\n• 💊 Nearby Chemists & medicines\n• 📂 Uploading & managing documents\n• 💊 Viewing prescriptions\n• 🔐 Login & account issues\n\nTry asking something like *\"How do I book an appointment?\"* or *\"How does the symptom checker work?\"* 😊"
