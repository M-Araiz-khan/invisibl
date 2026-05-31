// const admin = require('../config/firebaseAdmin'); // Isko remove kar diya
const supabase = require('../config/supabaseclient'); // Supabase client import kiya
const logger = require('../utils/logger'); // optional, remove if not available

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger?.warn('Missing or malformed Authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();

    if (!token) {
      logger?.warn('Token is empty after extraction');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify Supabase JWT token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw error || new Error('Invalid user or token');
    }

    // Decoded token ki jagah Supabase ka user object save kar rahe hain
    req.user = data.user;

    // Supabase mein 'uid' ki jagah 'id' use hota hai
    logger?.info(`User authenticated: ID=${data.user.id}`);
    next();
  } catch (error) {
    logger?.error('Supabase token verification failed', {
      message: error.message,
      stack: error.stack,
    });

    // Distinguish between expired / invalid token if needed
    // Supabase generally returns specific messages for expired tokens
    if (error.message && error.message.toLowerCase().includes('expired')) {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(401).json({ error: 'Invalid or Expired Token' });
  }
};

module.exports = { protect };