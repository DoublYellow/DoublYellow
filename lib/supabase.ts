import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mihqpweuziyjuualslrp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1paHFwd2V1eml5anV1YWxzbHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTU3NDksImV4cCI6MjA4ODUzMTc0OX0.pj9PzU8gvOHUNelw1ek7Cf9-PBDYEf-PmfiesMElGtw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);