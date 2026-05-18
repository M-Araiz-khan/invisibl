const logger = require('../utils/logger');

exports.verifyLogin = async (req, res) => {
  try {
    // Middleware should place the decoded token in req.user
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: No user data found' });
    }

    logger.info(`User login verified for UID: ${user.uid}`);

    res.status(200).json({
      success: true,
      message: 'Access Granted',
      user: {
        uid: user.uid || '',
        email: user.email || '',
        name: user.name || 'Anonymous Agent',
      },
    });
  } catch (error) {
    logger.error('Critical error in verifyLogin controller', { stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};