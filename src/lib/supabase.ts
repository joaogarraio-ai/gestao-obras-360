import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Valores públicos do projeto obra-360 (a chave anon pode ficar no navegador; o acesso é protegido pelo RLS).
const URL_PADRAO = 'https://rbmyvmndnjppyptihtgi.supabase.co'
const CHAVE_PADRAO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibXl2bW5kbmpwcHlwdGlodGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDA0MDIsImV4cCI6MjEwODc3NjQwMn0.Y6g_97PCB3zZdJ9SPvdJ0p7bR4TI3RWLJoouw--fG3U'

/** Tira espaços, aspas e caracteres invisíveis que entram quando a chave é colada. */
function limpar(valor: string | undefined) {
  return (valor ?? '').replace(/[^\x21-\x7e]/g, '').replace(/^["']+|["']+$/g, '')
}

const urlEnv = limpar(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const chaveEnv = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
const url = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(urlEnv.replace(/\/+$/, '')) ? urlEnv.replace(/\/+$/, '') : URL_PADRAO
const anonKey = /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(chaveEnv) ? chaveEnv : CHAVE_PADRAO

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
