// js/config.js

// Replace these two strings with your free project credentials from supabase.com
const SUPABASE_PROJECT_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

// Initialize client
const supabaseClient = supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);

// Global application state
const AppState = {
  user: null,          // Current authenticated player
  profile: null,       // Profile record (coins, username, etc.)
  activeTab: 'chests', // Current view pane
  activeTradeTab: 'incoming'
};