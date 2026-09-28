// js/config.js

const SUPABASE_PROJECT_URL = "https://nsmljllkktkphqcpmwda.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_c8CWz4tqfppmApJxJekO_Q_lDsIci8C";

const supabaseClient = supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);

const AppState = {
  user: null,
  profile: null,
  activeTab: 'chests'
};
