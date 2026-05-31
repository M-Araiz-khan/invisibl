import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://sqoshttyexuyequpvzkf.supabase.co';

// Yahan apni COPY ki hui lambi key paste karein (Jo eyJhb se shuru hoti hai)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxb3NodHR5ZXh1eWVxdXB2emtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODIzNjMsImV4cCI6MjA5NTI1ODM2M30.tRkbGQHbehn0wbGAXJrYoZQaPgwDr-Aqci-rK-BLEyc'; 

console.log("🚀 Supabase connected with correct Key!"); 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);