/* ============================================
   supabaseClient.js
   Vigil — Ashborne
   Initialises and exports a single Supabase
   client instance used across the entire app
   ============================================ */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase