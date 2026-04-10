import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import PromptInput from './components/PromptInput.jsx';
import FlowCanvas from './components/FlowCanvas.jsx';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('idle'); // idle | copying | done
  const canvasRef = useRef(null);

  async function handleGenerate(prompt, image) {
    setLoading(true);
    setError('');
    try {
      const API = import.meta.env.DEV ? 'http://localhost:3001/api/diagram' : '/api/diagram';
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          image: image ? image.dataUrl : undefined,
          mimeType: image ? image.mimeType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!canvasRef.current) return;
    setCopyState('copying');
    try {
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#111111',
        pixelRatio: 2,
      });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Flow<span>Gen</span></span>
        <span className="tagline">turn any problem into a flow diagram</span>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-title">User Flow</div>
          <div className="sidebar-subtitle">Describe a process and AI will generate the diagram</div>
          <PromptInput onGenerate={handleGenerate} loading={loading} />
          {error && <div className="error-box">{error}</div>}
          <div className="legend">
            <div className="legend-title">Legend</div>
            <div className="legend-item"><span className="legend-dot start" /> Start</div>
            <div className="legend-item"><span className="legend-dot primary" /> Primary flow</div>
            <div className="legend-item"><span className="legend-dot secondary" /> Secondary flow</div>
            <div className="legend-item"><span className="legend-dot error" /> Error</div>
          </div>
        </aside>
        <main className="canvas-area">
          {nodes.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-state-title">Your diagram<br />appears here</div>
              <p>Describe a process or problem on the left and click <strong>Generate</strong>.</p>
            </div>
          )}
          {nodes.length > 0 && (
            <>
              <div ref={canvasRef} style={{ width: '100%', height: '100%' }}>
                <FlowCanvas nodes={nodes} edges={edges} />
              </div>
              <button
                className={`copy-btn ${copyState}`}
                onClick={handleCopy}
                disabled={copyState === 'copying'}
                title="Copy diagram as image"
              >
                {copyState === 'done' ? '✓ Copied' : copyState === 'copying' ? '…' : 'Copy Image'}
              </button>
            </>
          )}
          {loading && (
            <div className="loading-overlay">
              <div className="spinner" />
              <p>Generating diagram</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
