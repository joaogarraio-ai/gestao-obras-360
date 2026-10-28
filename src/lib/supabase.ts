import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Cliente do Supabase, ou null quando o app roda só no aparelho (sem as chaves configuradas). */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        // PKCE devolve o login em ?code=..., que não briga com as rotas em #/ do HashRouter.
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export interface Empresa {
  id: string
  nome: string
  codigo_convite: string
}

export interface Membro {
  user_id: string
  email: string | null
  papel: 'admin' | 'membro'
}
