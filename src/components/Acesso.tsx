import { useEffect, useState, type ReactNode } from 'react'
import { supabase, type Empresa } from '../lib/supabase'
import { useSync } from '../lib/sync'
import { Button, Card, Field, Input } from './ui'

function Tela({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-amber-800 text-white px-4 py-3 flex items-center gap-2">
        <span className="text-xl">👷</span>
        <span className="font-bold text-lg">Obra 360</span>
      </header>
      <main className="flex-1 px-4 py-6 max-w-md w-full mx-auto">{children}</main>
    </div>
  )
}

function traduzirErro(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/already registered/i.test(msg)) return 'Este e-mail já tem conta. Use "Entrar".'
  if (/password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão com a internet.'
  return msg
}

function Login() {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)

  async function enviar() {
    if (!supabase || !email.trim() || !senha) return
    setCarregando(true)
    setMensagem(null)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      if (error) setMensagem({ tipo: 'erro', texto: traduzirErro(error.message) })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) setMensagem({ tipo: 'erro', texto: traduzirErro(error.message) })
      else if (!data.session) setMensagem({ tipo: 'ok', texto: 'Conta criada. Abra o e-mail que enviamos e clique no link de confirmação; depois entre aqui.' })
    }
    setCarregando(false)
  }

  async function esqueciSenha() {
    if (!supabase || !email.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite seu e-mail primeiro.' })
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname + '#/conta' })
    setMensagem(error ? { tipo: 'erro', texto: traduzirErro(error.message) } : { tipo: 'ok', texto: 'Enviamos um link para redefinir a senha.' })
  }

  return (
    <Tela>
      <h1 className="text-xl font-bold text-stone-900 mb-1">{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
      <p className="text-sm text-stone-500 mb-4">Os dados das obras ficam guardados na nuvem e são compartilhados com a sua equipe.</p>
      <Card className="p-4 space-y-3">
        <Field label="E-mail">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
          />
        </Field>
        {mensagem && <p className={`text-sm ${mensagem.tipo === 'erro' ? 'text-red-600' : 'text-green-700'}`}>{mensagem.texto}</p>}
        <Button className="w-full" onClick={enviar} disabled={carregando}>
          {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Button>
        <div className="flex justify-between text-sm">
          <button className="text-amber-700" onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}>
            {modo === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
          </button>
          {modo === 'entrar' && (
            <button className="text-stone-500" onClick={esqueciSenha}>
              Esqueci a senha
            </button>
          )}
        </div>
      </Card>
    </Tela>
  )
}

function EscolherEmpresa() {
  const { session, escolherEmpresa, sair } = useSync()
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    supabase
      ?.from('empresas')
      .select('id,nome,codigo_convite')
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro(traduzirErro(error.message))
        setEmpresas(data ?? [])
      })
  }, [])

  async function rpc(fn: 'criar_empresa' | 'entrar_empresa', args: Record<string, string>) {
    if (!supabase) return
    setCarregando(true)
    setErro(null)
    const { data, error } = await supabase.rpc(fn, args)
    setCarregando(false)
    if (error) setErro(traduzirErro(error.message))
    else if (data) await escolherEmpresa(data as Empresa)
  }

  return (
    <Tela>
      <h1 className="text-xl font-bold text-stone-900 mb-1">Sua empresa</h1>
      <p className="text-sm text-stone-500 mb-4">Conectado como {session?.user.email}. Todos da mesma empresa veem e lançam nas mesmas obras.</p>

      {empresas === null && <p className="text-sm text-stone-500">Carregando…</p>}

      {empresas && empresas.length > 0 && (
        <div className="space-y-2 mb-4">
          {empresas.map((e) => (
            <button key={e.id} className="block w-full text-left" onClick={() => escolherEmpresa(e)}>
              <Card className="p-4 hover:border-amber-400">
                <p className="font-semibold text-stone-800">{e.nome}</p>
                <p className="text-xs text-stone-500">Entrar</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Card className="p-4 space-y-3 mb-3">
        <Field label="Entrar numa empresa com código de convite">
          <div className="flex gap-2">
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: 7F3A9C21" />
            <Button onClick={() => codigo.trim() && rpc('entrar_empresa', { codigo: codigo.trim() })} disabled={carregando}>
              Entrar
            </Button>
          </div>
        </Field>
      </Card>

      <Card className="p-4 space-y-3">
        <Field label="Ou criar uma empresa nova">
          <div className="flex gap-2">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da empresa" />
            <Button variant="secondary" onClick={() => nome.trim() && rpc('criar_empresa', { nome_empresa: nome.trim() })} disabled={carregando}>
              Criar
            </Button>
          </div>
        </Field>
        <p className="text-xs text-stone-500">Ao criar, as obras e lançamentos que já estão neste aparelho são enviados para a empresa.</p>
      </Card>

      {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}

      <button className="block mx-auto mt-6 text-sm text-stone-500" onClick={sair}>
        Sair da conta
      </button>
    </Tela>
  )
}

/** Quando o app está ligado ao Supabase, exige login e empresa antes de mostrar os dados. */
export default function Acesso({ children }: { children: ReactNode }) {
  const { configurado, carregandoSessao, session, empresa, pronto, status, ultimoErro, trocarEmpresa } = useSync()
  if (!configurado) return <>{children}</>
  if (carregandoSessao) return <Tela>Carregando…</Tela>
  if (!session) return <Login />
  if (!empresa) return <EscolherEmpresa />
  if (!pronto) {
    return (
      <Tela>
        {status === 'carregando' || status === 'enviando' ? (
          <p className="text-stone-600">Baixando os dados de {empresa.nome}…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-red-600">Não foi possível carregar os dados da empresa{ultimoErro ? `: ${traduzirErro(ultimoErro)}` : '.'}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
              <Button variant="secondary" onClick={trocarEmpresa}>
                Trocar empresa
              </Button>
            </div>
          </div>
        )}
      </Tela>
    )
  }
  return <>{children}</>
}
