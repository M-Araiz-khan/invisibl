const { auth } = require('../config/firebaseAdmin'); // ✅ FIXED: Directly import auth
const logger = require('../utils/logger');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or malformed Authorization header');
      return res.status(401).json({ error: 'Unauthorized. No token provided.' });
    }

    // Extract and clean the token
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      logger.warn('Token is empty');
      return res.status(401).json({ error: 'Unauthorized. No token provided.' });
    }

    // Verify the token (✅ FIXED: Using auth instance directly)
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    // Distinguish between known auth errors and unexpected ones
    if (error.code === 'auth/id-token-expired') {
      logger.warn('Expired token used');
      return res.status(401).json({ error: 'Unauthorized. Token expired.' }); // Usually 401 is better for expired auth
    }

    if (error.code?.startsWith('auth/')) {
      // Any other Firebase Auth error (e.g., invalid token, revoked token)
      logger.warn('Invalid token attempt', { message: error.message });
      return res.status(403).json({ error: 'Forbidden. Invalid token.' });
    }

    // Unexpected error – don't leak details to the client
    logger.error('Unexpected error during token verification', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = requireAuth;