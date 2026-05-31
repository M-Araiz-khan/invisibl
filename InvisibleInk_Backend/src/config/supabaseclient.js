require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Backend mein URL aur Service Role Key hamesha .env se aati hai
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sqoshttyexuyequpvzkf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🚀 Backend Supabase Connected Securely!");

module.exports = supabase;