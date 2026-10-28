import { useEffect, useState } from 'react'
import { supabase, type Membro } from '../lib/supabase'
import { useSync } from '../lib/sync'
import { Badge, Button, Card, Field, Input, PageTitle } from '../components/ui'
import Backup from '../components/Backup'

const STATUS_TEXTO = {
  local: 'Modo local: os dados ficam só neste aparelho.',
  carregando: 'Carregando os dados da empresa…',
  sincronizado: 'Tudo sincronizado com a nuvem.',
  enviando: 'Enviando mudanças…',
  offline: 'Sem internet. As mudanças ficam guardadas e são enviadas quando a conexão voltar.',
  erro: 'Erro ao sincronizar.',
} as const

export default function Conta() {
  const { configurado, session, empresa, status, pendentes, ultimoErro, sincronizarAgora, trocarEmpresa, sair } = useSync()
  const [membros, setMembros] = useState<Membro[]>([])
  const [copiado, setCopiado] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [msgSenha, setMsgSenha] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !empresa) return
    supabase
      .from('membros')
      .select('user_id,email,papel')
      .eq('empresa_id', empresa.id)
      .then(({ data }) => setMembros((data ?? []) as Membro[]))
  }, [empresa])

  if (!configurado) {
    return (
      <div>
        <PageTitle title="Conta e sincronização" />
        <div className="space-y-3">
          <Card className="p-4 text-sm text-stone-600 space-y-2">
            <p>{STATUS_TEXTO.local}</p>
            <p>Para a equipe compartilhar os dados, o app precisa ser ligado a um banco de dados Supabase. O passo a passo está no README do projeto.</p>
          </Card>
          <Backup />
        </div>
      </div>
    )
  }

  async function compartilharConvite() {
    if (!empresa) return
    const texto = `Entre na empresa ${empresa.nome} no Obra 360: ${window.location.origin}${window.location.pathname}\nCódigo de convite: ${empresa.codigo_convite}`
    if (navigator.share) {
      await navigator.share({ text: texto }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    }
  }

  async function trocarSenha() {
    if (!supabase || novaSenha.length < 6) {
      setMsgSenha('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setMsgSenha(error ? error.message : 'Senha alterada.')
    setNovaSenha('')
  }

  return (
    <div className="space-y-3">
      <PageTitle title="Conta e sincronização" subtitle={session?.user.email ?? undefined} />

      <Card className="p-4">
        <p className="text-sm text-stone-700">{STATUS_TEXTO[status]}</p>
        {pendentes > 0 && <p className="text-xs text-stone-500 mt-1">{pendentes} mudança(s) aguardando envio.</p>}
        {status === 'erro' && ultimoErro && <p className="text-xs text-red-600 mt-1">{ultimoErro}</p>}
        <Button variant="secondary" className="mt-3" onClick={sincronizarAgora}>
          Sincronizar agora
        </Button>
      </Card>

      {empresa && (
        <Card className="p-4 space-y-3">
          <div>
            <p className="text-xs text-stone-500">Empresa</p>
            <p className="font-semibold text-stone-800">{empresa.nome}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Código de convite (passe para a equipe)</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-amber-800">{empresa.codigo_convite}</p>
          </div>
          <Button onClick={compartilharConvite}>{copiado ? 'Convite copiado ✓' : 'Enviar convite'}</Button>
          <div>
            <p className="text-xs text-stone-500 mb-1">Equipe ({membros.length})</p>
            <div className="space-y-1">
              {membros.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between text-sm">
                  <span className="text-stone-700 truncate">{m.email ?? m.user_id}</span>
                  {m.papel === 'admin' && <Badge tone="amber">admin</Badge>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-2">
        <Field label="Trocar senha">
          <div className="flex gap-2">
            <Input type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            <Button variant="secondary" onClick={trocarSenha}>
              Salvar
            </Button>
          </div>
        </Field>
        {msgSenha && <p className="text-xs text-stone-600">{msgSenha}</p>}
      </Card>

      <Backup />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={trocarEmpresa}>
          Trocar empresa
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={() => {
            const aviso = pendentes > 0 ? `Ainda há ${pendentes} mudança(s) não enviadas, que serão perdidas. ` : ''
            if (confirm(`${aviso}Sair da conta e apagar os dados deste aparelho?`)) sair()
          }}
        >
          Sair
        </Button>
      </div>
    </div>
  )
}
