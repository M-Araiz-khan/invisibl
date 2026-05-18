const { db, auth } = require('../config/firebaseAdmin');
const logger = require('../utils/logger');

// --------------------------------------------------------------
// UPDATE PROFILE
// --------------------------------------------------------------
exports.updateProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { displayName, phoneNumber, bio } = req.body;

    // 1. Validate displayName
    if (!displayName || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'Valid Display Name is required' });
    }

    const trimmedName = displayName.trim();
    const safePhone = phoneNumber ? phoneNumber.trim() : '';
    const safeBio = bio ? bio.trim() : 'Available on Invisible Ink';

    // 2. Update Firebase Auth (Safe Mode)
    // Firebase Auth requires strict E.164 format (+92...). 
    // Isko alag try-catch mein rakha hai taake invalid phone format ki wajah se RTDB update block na ho.
    const authUpdateFields = { displayName: trimmedName };
    if (safePhone) authUpdateFields.phoneNumber = safePhone;

    try {
      await auth.updateUser(uid, authUpdateFields);
    } catch (authError) {
      logger.warn(`Firebase Auth update skipped for UID: ${uid} (Likely invalid phone format)`, {
        message: authError.message
      });
      // Code won't crash here, it will continue to update the Database!
    }

    // 3. Update Realtime Database profile
    const userRef = db.ref(`users/${uid}/profile`);
    await userRef.update({
      displayName: trimmedName,
      phoneNumber: safePhone, // DB accepts any string, so it's safe here
      bio: safeBio,
      updatedAt: Date.now(), // FIXED: Replaced db.ServerValue with Date.now() for Node.js safety
    });

    logger.info(`Profile updated successfully for UID: ${uid}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully!' 
    });

  } catch (error) {
    logger.error(`Critical error updating profile for UID: ${req.user?.uid}`, error);
    return res.status(500).json({ error: 'Could not update profile' });
  }
};

// --------------------------------------------------------------
// GET PROFILE
// --------------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const snapshot = await db.ref(`users/${uid}/profile`).once('value');
    
    const profile = snapshot.exists()
      ? snapshot.val()
      : {
          displayName: 'New Agent',
          bio: 'Available on Invisible Ink',
          phoneNumber: '',
        };

    return res.status(200).json(profile);
  } catch (error) {
    logger.error(`Error fetching profile for UID: ${req.user?.uid}`, error);
    return res.status(500).json({ error: 'Could not fetch profile' });
  }
};