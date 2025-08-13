import React, { useState } from 'react';
import axios from 'axios';
// import AssistantComponent from '../../components/AssistantComponent/AssistantComponent';
export default function AI() {
  const [text, setText] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/assistant/ask', { text });
      setReply(res.data.reply);
    } catch (err) {
      setError('Failed to get reply');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>AI Assistant</h2>
      <textarea
        rows={4}
        style={{ width: '100%', padding: 10 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask the assistant anything..."
      />
      <button onClick={handleAsk} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? 'Loading...' : 'Ask'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {reply && (
        <div style={{ marginTop: 20 }}>
          <h4>Assistant's Reply:</h4>
          <p>{reply}</p>
        </div>
      )}

       {/* <AssistantComponent />  */}
    </div>
  );
}
