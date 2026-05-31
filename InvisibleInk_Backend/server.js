require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./src/utils/logger');

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
//const userRoutes = require('./src/routes/userRoutes'); // ✅ Added just in case you need it

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================
// TODO: Restrict CORS origins in production (e.g. allow only your frontend domain)
app.use(cors());
app.use(express.json());

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
//app.use('/api/user', userRoutes); // ✅ Uncomment if using userRoutes

// ==========================================
// ROOT & HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
  res.send('Invisible Ink Backend is Running...');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Invisible Ink Server is running securely with Supabase.',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================
// 404 Handler (for unknown routes)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ==========================================
// SERVER STARTUP
// ==========================================
const PORT = process.env.PORT || 3000;
// ✅ FIXED: Check for Supabase URL instead of the old DB_URL
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  if (SUPABASE_URL) {
    logger.info(`Linked to Supabase Database: ${SUPABASE_URL}`);
  } else {
    logger.warn('⚠️ EXPO_PUBLIC_SUPABASE_URL missing in .env file!');
  }
});