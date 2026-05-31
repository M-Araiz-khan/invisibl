const logger = require('../utils/logger');

exports.verifyLogin = async (req, res) => {
  try {
    // Middleware ab Supabase ka token verify karke req.user mein data bhejay ga
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: No user data found' });
    }

    // Supabase mein 'uid' ki jagah 'id' use hota hai
    logger.info(`User login verified for ID: ${user.id}`);

    res.status(200).json({
      success: true,
      message: 'Access Granted via Supabase',
      user: {
        id: user.id || '', // 'uid' ko 'id' mein change kar diya
        email: user.email || '',
        // Supabase mein extra info aksar 'user_metadata' object mein hoti hai
        name: user.user_metadata?.name || user.name || 'Anonymous Agent',
      },
    });
  } catch (error) {
    logger.error('Critical error in verifyLogin controller', { stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};