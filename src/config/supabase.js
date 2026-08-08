import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: async () => ({
          data: {
            session: JSON.parse(localStorage.getItem('agrimitra_session') || 'null')
          },
          error: null
        }),
        signUp: async ({ email, password, options }) => {
          const fakeUser = {
            id: 'usr_' + Date.now(),
            email,
            user_metadata: options?.data || {}
          };
          const session = { user: fakeUser, access_token: 'token_' + Date.now() };
          localStorage.setItem('agrimitra_session', JSON.stringify(session));
          return { data: { user: fakeUser, session }, error: null };
        },
        signInWithPassword: async ({ email, password }) => {
          const fakeUser = {
            id: 'usr_' + Date.now(),
            email,
            user_metadata: { farmer_name: email.split('@')[0] }
          };
          const session = { user: fakeUser, access_token: 'token_' + Date.now() };
          localStorage.setItem('agrimitra_session', JSON.stringify(session));
          return { data: { user: fakeUser, session }, error: null };
        },
        signOut: async () => {
          localStorage.removeItem('agrimitra_session');
          return { error: null };
        },
        onAuthStateChange: (callback) => {
          const session = JSON.parse(localStorage.getItem('agrimitra_session') || 'null');
          if (session) callback('SIGNED_IN', session);
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: (table) => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null })
        }),
        insert: (data) => Promise.resolve({ data, error: null }),
        upsert: (data) => Promise.resolve({ data, error: null }),
        update: (data) => ({
          eq: () => Promise.resolve({ data, error: null })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null })
        })
      })
    };

export default supabase;
