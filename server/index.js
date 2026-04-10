import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import diagramRouter from './routes/diagram.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '20mb' }));

app.use('/api/diagram', diagramRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
