const supabase = require('../config/supabaseclient'); // Sahi import (chota 'c')
const logger = require('../utils/logger');

// 1. Profile Fetch Karne Ka Function
exports.getProfile = async (req, res) => {
  try {
    // req.user humein requireAuth middleware se milta hai
    const userId = req.user.id; 

    const { data: profile, error } = await supabase
      .from('profiles') // Supabase mein aapki table ka naam 'profiles' hona chahiye
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Row not found error
         return res.status(404).json({ error: 'Profile abhi tak bani nahi hai' });
      }
      throw error;
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    logger.error('Profile lane mein masla:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 2. Profile Update/Save Karne Ka Function
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, bio } = req.body;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ 
        name: name || 'Secret Agent', 
        phone: phone || '', 
        bio: bio || 'Available on Invisible Ink'
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Profile updated for ID: ${userId}`);
    res.status(200).json({ success: true, profile: updatedProfile });
  } catch (error) {
    logger.error('Profile update karne mein masla:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};