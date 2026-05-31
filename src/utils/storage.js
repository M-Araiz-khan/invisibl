import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  downloadAsync,
  getInfoAsync, // ✅ Sahi API for checking files/directories
  makeDirectoryAsync
} from 'expo-file-system';

// ✅ SUPABASE IMPORT
import { supabase } from '../config/supabaseclient';

// ── Storage keys ──────────────────────────────────────
const CONTACTS_KEY = '@invisible_contacts';
const MESSAGES_PREFIX = '@invisible_messages_';
const PROFILE_KEY = '@invisible_profile';
const PIN_KEY = 'app_pin';
const SECURITY_ANSWER_KEY = 'security_answer';

// ── Media directory helpers ────────────────────────────
const getMediaDir = () => `${documentDirectory}media/`;

// ✅ PRO FIX: getInfoAsync se check kiya
const ensureMediaDir = async () => {
  const dirPath = getMediaDir();
  const dirInfo = await getInfoAsync(dirPath);
  
  if (!dirInfo.exists) {
    await makeDirectoryAsync(dirPath, { intermediates: true });
  }
};

// ── Media caching (offline support) ────────────────────
export const cacheMediaFile = async (tempUri, fileName) => {
  try {
    await ensureMediaDir();
    const permanentUri = getMediaDir() + fileName;
    await copyAsync({ from: tempUri, to: permanentUri });
    return permanentUri;
  } catch (error) {
    console.error('Error caching media file:', error);
    return null;
  }
};

export const downloadAndCacheMedia = async (remoteUrl, fileName) => {
  if (!remoteUrl) return null;
  try {
    await ensureMediaDir();
    const localUri = getMediaDir() + fileName;
    
    // ✅ PRO FIX: getInfoAsync se check kiya
    const fileInfo = await getInfoAsync(localUri);
    
    if (fileInfo.exists) return localUri; // already cached
    
    const { uri } = await downloadAsync(remoteUrl, localUri);
    return uri;
  } catch (error) {
    console.error('Error downloading media:', error);
    return null;
  }
};

export const deleteLocalMedia = async (fileName) => {
  try {
    const uri = getMediaDir() + fileName;
    
    // ✅ PRO FIX: getInfoAsync se check kiya
    const fileInfo = await getInfoAsync(uri);
    
    if (fileInfo.exists) {
      await deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.error('Error deleting media file:', error);
  }
};

// ── Profile ────────────────────────────────────────────
export const getMyProfile = async () => {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    if (data) return JSON.parse(data);

    const defaultProfile = {
      id: 'USR-' + Date.now().toString(),
      name: 'Secret Agent',
      phone: '',
      bio: 'Available on Invisible Ink',
    };
    await saveMyProfile(defaultProfile);
    return defaultProfile;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const saveMyProfile = async (profileData) => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
  } catch (err) {
    console.error("Error saving profile", err);
  }
};

// ── Contacts ───────────────────────────────────────────
export const getContacts = async () => {
  try {
    const data = await AsyncStorage.getItem(CONTACTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const addContact = async (newContact) => {
  try {
    const contacts = await getContacts();
    contacts.unshift(newContact);
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.error("Error saving contact", err);
  }
};

export const deleteContacts = async (contactIdsArray) => {
  try {
    let contacts = await getContacts();
    contacts = contacts.filter(c => !contactIdsArray.includes(c.id));
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));

    for (let id of contactIdsArray) {
      await AsyncStorage.removeItem(MESSAGES_PREFIX + id);
      // Optionally clean media files for this contact here
    }
  } catch (err) {
    console.error("Error deleting contacts", err);
  }
};

// ── Messages (JSON only – media paths are stored inside) ─
export const getMessages = async (contactId) => {
  try {
    // 1. Supabase se fresh data fetch karein
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', contactId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // 2. Local storage ko update kar dein (Offline support ke liye)
    await AsyncStorage.setItem(MESSAGES_PREFIX + contactId, JSON.stringify(data));
    
    return data;
  } catch (err) {
    console.error("Supabase fetch failed, loading offline...", err);
    // Agar internet nahi hai, toh purana local data return karein
    const localData = await AsyncStorage.getItem(MESSAGES_PREFIX + contactId);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveMessage = async (contactId, messagesArray) => {
  try {
    await AsyncStorage.setItem(MESSAGES_PREFIX + contactId, JSON.stringify(messagesArray));
  } catch (err) {
    console.error("Error saving messages", err);
  }
};

// ── PIN & Security ─────────────────────────────────────
export const getAppPin = async () => {
  try {
    return await AsyncStorage.getItem(PIN_KEY);
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const setAppPin = async (pin) => {
  try {
    await AsyncStorage.setItem(PIN_KEY, pin);
  } catch (err) {
    console.error("Error setting PIN", err);
  }
};

export const changeAppPin = setAppPin;

export const saveSecurityAnswer = async (answer) => {
  try {
    await AsyncStorage.setItem(SECURITY_ANSWER_KEY, answer.toLowerCase().trim());
  } catch (err) {
    console.log(err);
  }
};

export const getSecurityAnswer = async () => {
  try {
    const answer = await AsyncStorage.getItem(SECURITY_ANSWER_KEY);
    return answer || '';
  } catch (err) {
    console.log(err);
    return '';
  }
};

// ── Self‑destruct timer ─────────────────────────────────
export const startSelfDestructTimer = (chatId, messageId, timeoutSeconds) => {
  console.log(`Timer started! Message ${messageId} will explode in ${timeoutSeconds}s 💣`);

  setTimeout(async () => {
    try {
      // 1. Remove from Supabase DB
      await supabase
        .from('messages')
        .delete()
        .match({ id: messageId });

      // 2. Remove from local storage
      const localData = await AsyncStorage.getItem(MESSAGES_PREFIX + chatId);
      if (localData) {
        let messages = JSON.parse(localData);
        messages = messages.filter(msg => msg.id !== messageId);
        await AsyncStorage.setItem(MESSAGES_PREFIX + chatId, JSON.stringify(messages));
      }

      console.log(`POOF! 💨 Message ${messageId} self-destructed successfully.`);
    } catch (err) {
      console.error(`Failed to destruct message ${messageId}`, err);
    }
  }, timeoutSeconds * 1000);
};