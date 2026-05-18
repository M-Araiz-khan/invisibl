const admin = require('../config/firebaseAdmin');
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

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    logger?.info(`User authenticated: UID=${decodedToken.uid}`);
    next();
  } catch (error) {
    logger?.error('Firebase token verification failed', {
      message: error.message,
      stack: error.stack,
    });

    // Distinguish between expired / invalid token if needed
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(401).json({ error: 'Invalid or Expired Token' });
  }
};

module.exports = { protect };