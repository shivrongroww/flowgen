import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a flow diagram expert. Analyse the input (text description, structured diagram syntax, and/or an image) and return ONLY valid JSON with two arrays:
- nodes: array of { id: string, type: string, data: { label: string }, position: { x: number, y: number } }
- edges: array of { id: string, source: string, target: string, label?: string }

Node types — use exactly these values:
- "start"     → the single entry point of the flow (yellow)
- "end"       → the single exit point of the flow (purple)
- "decision"  → any yes/no question, condition check, or branching point (diamond shape)
- "primary"   → main happy-path steps (purple/lavender)
- "secondary" → alternative or optional steps (white outline)
- "error"     → error or failure states (orange)

You must correctly parse ALL of the following input formats:
- Natural language descriptions ("user signs up, then verifies email…")
- Mermaid flowchart / graph syntax (graph LR, flowchart TD, etc.)
- PlantUML (@startuml … @enduml)
- ASCII block diagrams using arrows like -->, ->, =>, →, boxes like [] or ()
- Indented outlines or bullet lists representing hierarchy
- Any other plain-text representation of a flow

When parsing structured syntax (Mermaid, PlantUML, ASCII):
- Extract every node and edge faithfully — do not summarise or skip steps.
- Preserve edge labels (Yes/No, conditions, loop back labels, etc.).
- Map start/end nodes to "start"/"end" types; any conditional/branching/question node to "decision"; error/failure branches to "error"; optional/alt paths to "secondary"; everything else to "primary".

When an image is provided:
- Extract every node and connection visible in the image faithfully.
- Infer node type from visual style (colour, shape) in the image.

Other rules:
- Position all nodes at x:0, y:0 — layout is computed automatically on the client.
- Keep labels short (2–5 words).
- Return raw JSON only. No markdown, no code fences, no explanation.`;

router.post('/', async (req, res) => {
  const { prompt, image, mimeType } = req.body;

  if (!prompt && !image) {
    return res.status(400).json({ error: 'prompt or image is required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const parts = [];

    if (prompt?.trim()) {
      parts.push({ text: prompt.trim() });
    }

    if (image) {
      // image arrives as a data URL: "data:<mimeType>;base64,<data>"
      const base64 = image.includes(',') ? image.split(',')[1] : image;
      const resolvedMimeType = mimeType || 'image/png';
      parts.push({ inlineData: { mimeType: resolvedMimeType, data: base64 } });
      if (!prompt?.trim()) {
        parts.unshift({ text: 'Extract the complete flow diagram from this image.' });
      }
    }

    const result = await model.generateContent(parts);
    const raw = result.response.text().trim();

    let diagram;
    try {
      diagram = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
      diagram = JSON.parse(cleaned);
    }

    if (!Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
      return res.status(500).json({ error: 'Invalid diagram structure from AI' });
    }

    res.json(diagram);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate diagram' });
  }
});

export default router;
