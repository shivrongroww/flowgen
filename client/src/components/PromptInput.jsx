import { useState, useRef } from 'react';

const EXAMPLES = [
  'How does a user sign up and verify their email?',
  'Walk me through an e-commerce checkout process.',
  'Explain how a CI/CD pipeline works.',
];

const FORMAT_PATTERNS = [
  { label: 'Mermaid',   re: /^\s*(graph|flowchart|sequenceDiagram|stateDiagram)/i },
  { label: 'PlantUML',  re: /@startuml/i },
  { label: 'ASCII',     re: /(-{2,}>|={2,}>|→|[\[\(][^\]\)]+[\]\)].*(-+>|→))/m },
  { label: 'Outline',   re: /^(\s{2,}|\t+)[^\s]/m },
];

function detectFormat(text) {
  for (const { label, re } of FORMAT_PATTERNS) {
    if (re.test(text)) return label;
  }
  return null;
}

export default function PromptInput({ onGenerate, loading }) {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState(null);
  const [detectedFormat, setDetectedFormat] = useState(null);
  const fileInputRef = useRef();

  function handleTextChange(e) {
    const val = e.target.value;
    setPrompt(val);
    setDetectedFormat(detectFormat(val));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (prompt.trim() || image) onGenerate(prompt.trim(), image);
  }

  function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage({ dataUrl: ev.target.result, mimeType: file.type });
    reader.readAsDataURL(file);
  }

  function handlePaste(e) {
    // Image paste
    const imgItem = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      loadImageFile(imgItem.getAsFile());
      return;
    }
    // Text paste — let it land in the textarea, then detect format
    setTimeout(() => {
      const val = e.target.value;
      setDetectedFormat(detectFormat(val));
    }, 0);
  }

  function handleDrop(e) {
    e.preventDefault();
    loadImageFile(e.dataTransfer.files?.[0]);
  }

  function handleFileChange(e) {
    loadImageFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function clearImage() { setImage(null); }

  const canSubmit = !loading && (prompt.trim() || image);

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <div className="prompt-label-row">
        <label className="prompt-label" htmlFor="prompt">Problem Statement</label>
        {detectedFormat && (
          <span className="format-badge">{detectedFormat}</span>
        )}
      </div>

      <textarea
        id="prompt"
        className="prompt-textarea"
        value={prompt}
        onChange={handleTextChange}
        onPaste={handlePaste}
        placeholder={
          image
            ? 'Add a description (optional)…'
            : 'Describe a flow, or paste Mermaid / PlantUML / ASCII…'
        }
        rows={5}
        disabled={loading}
      />

      {image ? (
        <div className="image-preview">
          <img src={image.dataUrl} alt="Uploaded diagram" />
          <button type="button" className="image-clear" onClick={clearImage} disabled={loading}>✕</button>
        </div>
      ) : (
        <div
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current.click()}
        >
          <span className="drop-zone-icon">↑</span>
          <span>Drop image here, paste, or <u>browse</u></span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}

      <button className="generate-btn" type="submit" disabled={!canSubmit}>
        {loading ? 'Generating…' : 'Generate Diagram'}
      </button>

      <div className="examples">
        <p className="examples-label">Try an example:</p>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="example-chip"
            onClick={() => { setPrompt(ex); setDetectedFormat(null); }}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}
