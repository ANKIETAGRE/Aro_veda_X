import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const QUICK_CHIPS = [
  { label: '📅 Book appointment',    msg: 'How do I book an appointment?' },
  { label: '🔍 Symptom checker',     msg: 'How do I use the symptom checker?' },
  { label: '🏥 Find hospitals',      msg: 'How do I find nearby hospitals?' },
  { label: '💊 Nearby chemists',     msg: 'How do I find nearby chemists?' },
  { label: '📂 Upload document',     msg: 'How do I upload a medical document?' },
  { label: '💊 View prescription',   msg: 'How do I view my prescription?' },
  { label: '📅 Reschedule',          msg: 'How do I reschedule my appointment?' },
  { label: '🔐 Login issues',        msg: 'I am having trouble logging in' },
  { label: '🚨 Emergency help',      msg: 'I need emergency medical help' },
  { label: '👨‍⚕️ Doctor portal',      msg: 'How does the doctor portal work?' },
];

const FAQ = [
  { q: 'How do I book an appointment?',           a: 'Go to Find Doctors → click Book Appointment → choose date & time → add reason → upload document (optional) → Confirm.' },
  { q: 'How does the Symptom Checker work?',      a: 'Select your symptoms → click Analyze → AI predicts possible conditions → see medicines + nearby chemists.' },
  { q: 'How do I view my prescription?',          a: 'Go to My Appointments → look for the 💊 Rx Ready badge → click View to read the prescription.' },
  { q: 'How do I attach a document to an appointment?', a: 'During booking (Step 3) or from My Appointments → click 📎 Attach Doc on any active appointment.' },
  { q: 'How do I get directions to a hospital?',  a: 'Go to Nearby Hospitals → click any hospital → click "Open Directions in Google Maps".' },
  { q: 'Can I cancel my appointment?',            a: 'Yes — go to My Appointments → click ✕ Cancel on any Pending or Approved appointment.' },
];

function FormattedText({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => (
        <div key={i} style={{ marginBottom: line.trim() ? 2 : 4 }}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2,-2)}</strong>
              : part
          )}
        </div>
      ))}
    </div>
  );
}

export default function HelpSupport() {
  const { patientId, doctorId, patientData, doctorData } = useApp();
  const portal = doctorId ? 'doctor' : 'patient';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Hi${patientData?.full_name ? ', ' + patientData.full_name.split(' ')[0] : doctorData?.full_name ? ', Dr. ' + doctorData.full_name.split(' ')[0] : ''}! I'm AroBot.**\n\nI'm your AroVedax AI assistant. I can help you with:\n\n📅 Appointment booking & management\n🔍 Symptom Checker guidance\n🏥 Nearby Hospitals & directions\n💊 Chemists & medicines\n📂 Medical documents\n💊 Viewing prescriptions\n🔐 Login & account issues\n\nWhat do you need help with today?`,
      time: Date.now()
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, time: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await API.post('/chat/message', { message: msg, messages: history, portal });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply, time: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "😔 I'm having trouble connecting. Please try again in a moment.",
        time: Date.now()
      }]);
    } finally { setLoading(false); }
  };

  const clearChat = () => setMessages([{
    role: 'assistant',
    content: "👋 Chat cleared! How can I help you today?",
    time: Date.now()
  }]);

  return (
    <div className="animate-fade" style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 4 }}>🤖 Help &amp; Support</h1>
        <p style={{ color: 'var(--text-muted)' }}>Ask AroBot anything about using AroVedax</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Chat ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

          {/* Chat header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#2d6a4f,#52b788)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>AroBot</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                AI-powered assistant · Always available
              </div>
            </div>
            <button onClick={clearChat} title="Clear chat"
              className="btn btn-outline btn-sm" style={{ fontSize: 12 }}>
              🗑️ Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px', display: 'flex', flexDirection: 'column' }}>
            {messages.map((msg, i) => {
              const isBot = msg.role === 'assistant';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: isBot ? 'row' : 'row-reverse', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
                  {isBot && (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#2d6a4f,#52b788)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth: '75%', padding: '12px 16px', fontSize: 13.5, lineHeight: 1.65,
                    borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                    background: isBot ? '#f8fafc' : 'linear-gradient(135deg,#2d6a4f,#40916c)',
                    color: isBot ? '#1e293b' : 'white',
                    boxShadow: isBot ? '0 1px 4px rgba(0,0,0,0.06)' : '0 4px 16px rgba(45,106,79,0.25)',
                    border: isBot ? '1px solid var(--border)' : 'none',
                  }}>
                    <FormattedText text={msg.content} />
                    <div style={{ fontSize: 10, opacity: 0.45, marginTop: 6, textAlign: 'right' }}>
                      {new Date(msg.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!isBot && (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, color: 'white', fontWeight: 700 }}>
                      {(patientData?.full_name || doctorData?.full_name || 'U')[0]}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#2d6a4f,#52b788)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '18px 18px 18px 4px', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
                      animation: 'typingBounce 1.2s infinite', animationDelay: `${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips — show when few messages */}
          {messages.length <= 2 && (
            <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_CHIPS.map((chip, i) => (
                <button key={i} onClick={() => sendMessage(chip.msg)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
                  onMouseEnter={e => { e.target.style.background='var(--border)'; e.target.style.transform='translateY(-1px)'; }}
                  onMouseLeave={e => { e.target.style.background='var(--bg)'; e.target.style.transform='translateY(0)'; }}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask anything about AroVedax... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              style={{ flex: 1, padding: '10px 14px', fontSize: 13.5, border: '1.5px solid var(--border)', borderRadius: 12, resize: 'none', lineHeight: 1.5, fontFamily: 'var(--font-body)', maxHeight: 100, overflowY: 'auto', background: 'var(--bg)', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                background: input.trim() && !loading ? 'linear-gradient(135deg,#2d6a4f,#40916c)' : '#e2e8f0',
                color: input.trim() && !loading ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, transition: 'all 0.2s', transform: 'none',
              }}
              onMouseEnter={e => { if (input.trim() && !loading) e.target.style.transform='scale(1.08)'; }}
              onMouseLeave={e => e.target.style.transform='scale(1)'}>
              {loading
                ? <div style={{ width:16, height:16, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
                : '➤'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: FAQ + Info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

          {/* FAQ */}
          <div className="card">
            <div className="card-header"><h2>❓ Frequently Asked</h2></div>
            <div>
              {FAQ.map((item, i) => (
                <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-body)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{item.q}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick nav cards */}
          <div className="card">
            <div className="card-header"><h2>🔗 Quick Navigation</h2></div>
            <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(portal === 'patient' ? [
                { icon:'🔍', label:'Symptom Checker', path:'/patient/symptom-checker' },
                { icon:'👨‍⚕️', label:'Find Doctors',    path:'/patient/doctors' },
                { icon:'📅', label:'My Appointments', path:'/patient/appointments' },
                { icon:'🏥', label:'Nearby Hospitals', path:'/patient/nearby' },
                { icon:'💊', label:'Nearby Chemists',  path:'/patient/chemists' },
                { icon:'📂', label:'My Documents',     path:'/patient/documents' },
              ] : [
                { icon:'📅', label:'Appointments',   path:'/doctor/appointments' },
                { icon:'👥', label:'My Patients',    path:'/doctor/patients' },
                { icon:'🔔', label:'Notifications',  path:'/doctor/notifications' },
                { icon:'👤', label:'My Profile',     path:'/doctor/profile' },
              ]).map((item, i) => (
                <a key={i} href={item.path}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
                  <span>{item.icon}</span> {item.label}
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
                </a>
              ))}
            </div>
          </div>

          {/* Emergency box */}
          <div style={{ padding: '16px', background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', borderRadius: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'white', marginBottom: 4 }}>🚨 Medical Emergency?</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 12 }}>
              Tap to open your phone dialer instantly — same as Google Maps directions.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="tel:102"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: 'white', color: '#dc2626', borderRadius: 10, textDecoration: 'none', fontWeight: 800, fontSize: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                📞 102 &nbsp;—&nbsp; Ambulance
              </a>
              <a href="tel:112"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 10, textDecoration: 'none', fontWeight: 800, fontSize: 15 }}>
                🆘 112 &nbsp;—&nbsp; Emergency Services
              </a>
              <a href="/patient/nearby"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                🗺️ Find Nearest Hospital &amp; Call Their Ambulance →
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%,60%,100% { transform:translateY(0) }
          30%          { transform:translateY(-6px) }
        }
      `}</style>
    </div>
  );
}
