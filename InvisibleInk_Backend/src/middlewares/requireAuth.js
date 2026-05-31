// const { auth } = require('../config/firebaseAdmin'); // Isko nikal diya
const supabase = require('../config/supabaseclient'); // ✅ FIXED: Import Supabase client
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

    // Verify the token (✅ FIXED: Using Supabase auth.getUser)
    const { data, error } = await supabase.auth.getUser(token);

    // Agar error aaye ya user data null ho
    if (error || !data?.user) {
      throw error || new Error('User not found in Supabase');
    }

    // Supabase ka decoded user object req.user mein daal diya
    req.user = data.user;
    next();
  } catch (error) {
    const errorMessage = (error.message || '').toLowerCase();

    // Distinguish between known auth errors and unexpected ones
    // Supabase token expire hone par message mein 'expired' return karta hai
    if (errorMessage.includes('expired')) {
      logger.warn('Expired token used');
      return res.status(401).json({ error: 'Unauthorized. Token expired.' }); // Usually 401 is better for expired auth
    }

    // Any other Supabase Auth error (e.g., AuthApiError, invalid token, signature failed)
    if (error.name === 'AuthApiError' || errorMessage.includes('invalid') || errorMessage.includes('jwt')) {
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