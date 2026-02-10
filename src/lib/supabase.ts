import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tkbaayhknsumzplfvanp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYmFheWhrbnN1bXpwbGZ2YW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzgyNDAsImV4cCI6MjA4MzAxNDI0MH0.JeC_uotDgA6rIh3VDHtFvVjh9CQiM0KhzW6IfRr0_cM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
