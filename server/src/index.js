import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'CoreERP Backend API'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

app.listen(PORT, () => {
  console.log(`[CoreERP Server] Listening on http://localhost:${PORT}`);
});