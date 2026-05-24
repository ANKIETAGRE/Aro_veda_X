import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

const QUICK_CHIPS = [
  { label: '📅 Book appointment',     msg: 'How do I book an appointment?' },
  { label: '🔍 Symptom checker',      msg: 'How do I use the symptom checker?' },
  { label: '🏥 Find hospitals',       msg: 'How do I find nearby hospitals?' },
  { label: '💊 Nearby chemists',      msg: 'How do I find nearby chemists?' },
  { label: '📂 Upload document',      msg: 'How do I upload a medical document?' },
  { label: '💊 View prescription',    msg: 'How do I view my prescription?' },
  { label: '🔐 Login issues',         msg: 'I am having trouble logging in' },
  { label: '📅 Reschedule',           msg: 'How do I reschedule my appointment?' },
];

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', padding:'10px 14px', background:'#f1f5f9', borderRadius:'18px 18px 18px 4px', width:'fit-content' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:7, height:7, borderRadius:'50%', background:'#94a3b8',
          animation:'typingBounce 1.2s infinite',
          animationDelay: `${i*0.2}s`
        }}/>
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isBot = msg.role === 'assistant';
  return (
    <div style={{ display:'flex', flexDirection:isBot?'row':'row-reverse', gap:8, alignItems:'flex-end', marginBottom:12 }}>
      {isBot && (
        <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#2d6a4f,#40916c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, boxShadow:'0 2px 8px rgba(45,106,79,0.3)' }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth:'78%', padding:'10px 14px', fontSize:13, lineHeight:1.6,
        borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
        background: isBot ? '#f1f5f9' : 'linear-gradient(135deg,#2d6a4f,#40916c)',
        color: isBot ? '#1e293b' : 'white',
        boxShadow: isBot ? 'none' : '0 4px 12px rgba(45,106,79,0.3)',
        whiteSpace: 'pre-wrap',
      }}>
        <FormattedText text={msg.content} isBot={isBot} />
        <div style={{ fontSize:10, opacity:0.5, marginTop:4, textAlign:'right' }}>
          {new Date(msg.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>
    </div>
  );
}

function FormattedText({ text, isBot }) {
  // Render **bold**, bullet points, line breaks
  const parts = text.split('\n');
  return (
    <div>
      {parts.map((line, i) => {
        // Bold: **text**
        const formatted = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2,-2)}</strong>;
          }
          return part;
        });
        return (
          <div key={i} style={{ marginBottom: line.trim() ? 2 : 4 }}>
            {formatted}
          </div>
        );
      })}
    </div>
  );
}

export default function AroBot() {
  const { patientId, doctorId } = useApp();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    { role:'assistant', content:"👋 **Hi! I'm AroBot**, your AroVedax assistant!\n\nI can help you with appointments, symptoms, hospitals, chemists, documents, and more.\n\nWhat do you need help with today?", time: Date.now() }
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [minimised, setMinimised] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const portal = doctorId ? 'doctor' : 'patient';

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (messagesEndRef.current && open) {
      messagesEndRef.current.scrollIntoView({ behavior:'smooth' });
    }
  }, [messages, loading, open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role:'user', content:msg, time:Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role:m.role, content:m.content }));
      const res = await API.post('/chat/message', {
        message:  msg,
        messages: history,
        portal,
      });
      const botMsg = { role:'assistant', content:res.data.reply, time:Date.now() };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, {
        role:'assistant',
        content:"😔 Sorry, I'm having trouble right now. Please try again in a moment, or navigate to the relevant section directly.",
        time: Date.now()
      }]);
    } finally { setLoading(false); }
  };

  const clearChat = () => {
    setMessages([{ role:'assistant', content:"👋 **Hi! I'm AroBot**, your AroVedax assistant!\n\nI can help you with appointments, symptoms, hospitals, chemists, documents, and more.\n\nWhat do you need help with today?", time:Date.now() }]);
  };

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%,60%,100% { transform:translateY(0) }
          30%          { transform:translateY(-6px) }
        }
        @keyframes botPulse {
          0%,100% { box-shadow:0 4px 20px rgba(45,106,79,0.4) }
          50%      { box-shadow:0 4px 32px rgba(45,106,79,0.7) }
        }
        @keyframes slideInUp {
          from { opacity:0; transform:translateY(20px) scale(0.95) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes badgePop {
          0%   { transform:scale(0) }
          70%  { transform:scale(1.2) }
          100% { transform:scale(1) }
        }
        .chat-chip:hover { background:#e2e8f0 !important; transform:translateY(-1px); }
        .send-btn:hover  { transform:scale(1.05); }
        .chat-input:focus { outline:none; border-color:#40916c !important; box-shadow:0 0 0 3px rgba(64,145,108,0.15) !important; }
      `}</style>

      {/* ── FLOATING BUBBLE ── */}
      <div
        onClick={() => { setOpen(!open); setUnread(0); }}
        style={{
          position:'fixed', bottom:28, right:28, zIndex:9999,
          width:58, height:58, borderRadius:'50%',
          background:'linear-gradient(135deg,#2d6a4f,#40916c)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:26, animation:'botPulse 3s infinite',
          boxShadow:'0 4px 20px rgba(45,106,79,0.4)',
          transition:'transform 0.2s',
          transform: open ? 'scale(0.92)' : 'scale(1)',
          userSelect:'none',
        }}>
        {open ? '✕' : '🤖'}
        {unread > 0 && !open && (
          <div style={{
            position:'absolute', top:-4, right:-4,
            width:20, height:20, borderRadius:'50%',
            background:'#e63946', color:'white',
            fontSize:11, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid white',
            animation:'badgePop 0.3s ease',
          }}>{unread}</div>
        )}
      </div>

      {/* ── CHAT WINDOW ── */}
      {open && (
        <div style={{
          position:'fixed', bottom:100, right:28, zIndex:9998,
          width:380, height: minimised ? 56 : 560,
          background:'white', borderRadius:20,
          boxShadow:'0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)',
          display:'flex', flexDirection:'column', overflow:'hidden',
          animation:'slideInUp 0.25s ease',
          transition:'height 0.3s ease',
        }}>

          {/* Header */}
          <div style={{
            padding:'14px 18px', flexShrink:0,
            background:'linear-gradient(135deg,#1b4332,#2d6a4f)',
            display:'flex', alignItems:'center', gap:10, cursor:'pointer',
          }} onClick={() => setMinimised(!minimised)}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'white' }}>AroBot</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'#4ade80' }}/> Always here to help
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button title="Clear chat" onClick={e=>{e.stopPropagation();clearChat();}}
                style={{ background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12 }}>🗑️</button>
              <button title={minimised?'Expand':'Minimise'} onClick={e=>{e.stopPropagation();setMinimised(!minimised);}}
                style={{ background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12 }}>
                {minimised?'▲':'▼'}
              </button>
            </div>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 8px', display:'flex', flexDirection:'column' }}>
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                {loading && (
                  <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:12 }}>
                    <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#2d6a4f,#40916c)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🤖</div>
                    <TypingDots />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick chips — only show at start */}
              {messages.length <= 2 && (
                <div style={{ padding:'0 14px 8px', display:'flex', flexWrap:'wrap', gap:6 }}>
                  {QUICK_CHIPS.map((chip,i) => (
                    <button key={i} className="chat-chip" onClick={() => sendMessage(chip.msg)}
                      style={{ padding:'5px 10px', fontSize:11, fontWeight:500, borderRadius:99, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', transition:'all 0.15s', color:'#374151' }}>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ padding:'10px 14px 14px', borderTop:'1px solid #f1f5f9', display:'flex', gap:8, alignItems:'flex-end' }}>
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  rows={1}
                  placeholder="Ask me anything about AroVedax..."
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  style={{
                    flex:1, padding:'9px 13px', fontSize:13,
                    border:'1.5px solid #e2e8f0', borderRadius:12,
                    resize:'none', lineHeight:1.5, fontFamily:'inherit',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                    maxHeight:80, overflowY:'auto', background:'#f8fafc',
                  }}
                />
                <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}
                  style={{
                    width:38, height:38, borderRadius:'50%', border:'none', cursor:'pointer',
                    background: input.trim() && !loading ? 'linear-gradient(135deg,#2d6a4f,#40916c)' : '#e2e8f0',
                    color: input.trim() && !loading ? 'white' : '#94a3b8',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, flexShrink:0, transition:'all 0.2s',
                  }}>
                  {loading ? <div style={{ width:14,height:14,border:'2px solid white',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite' }}/> : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
