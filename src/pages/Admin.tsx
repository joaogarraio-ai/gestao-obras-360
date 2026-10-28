import { useCallback, useEffect, useState } from 'react'
import { Building2, CircleAlert, Copy, Crown, FlaskConical } from 'lucide-react'
import { diasRestantes, supabase, type Plano } from '../lib/supabase'
import { useSync } from '../lib/sync'
import { formatDatePt, toISODate } from '../lib/dates'
import { Badge, Button, Card, EmptyState, Field, Input, PageTitle, Select, Stat } from '../components/ui'

interface EmpresaAdmin {
  id: string
  nome: string
  codigo_convite: string
  plano: Plano
  acesso_ate: string
  bloqueada: boolean
  observacao: string | null
  criado_em: string
  admin_email: string | null
  membros: number
  obras: number
  ultima_atividade: string | null
}

type Filtro = 'todas' | 'teste' | 'mensal' | 'vencidas' | 'bloqueadas'

const vencida = (e: EmpresaAdmin) => new Date(e.acesso_ate).getTime() <= Date.now()
const SEM_VENCIMENTO = 2900

/** Fim do dia escolhido, no horário do aparelho. */
function fimDoDia(iso: string) {
  return new Date(`${iso}T23:59:59`).toISOString()
}

function somarDias(e: EmpresaAdmin, dias: number) {
  const base = Math.max(Date.now(), new Date(e.acesso_ate).getTime())
  return fimDoDia(toISODate(new Date(base + dias * 86_400_000)))
}

function situacao(e: EmpresaAdmin): { texto: string; tone: 'green' | 'amber' | 'red' | 'brand' } {
  if (e.bloqueada) return { texto: 'Bloqueada', tone: 'red' }
  if (vencida(e)) return { texto: e.plano === 'teste' ? 'Teste terminou' : 'Mensalidade vencida', tone: 'red' }
  if (e.plano === 'teste') return { texto: `Teste · ${diasRestantes(e)} dia(s)`, tone: 'amber' }
  return { texto: 'Mensal em dia', tone: 'green' }
}

function CartaoEmpresa({ e, aoSalvar }: { e: EmpresaAdmin; aoSalvar: () => void }) {
  const [obs, setObs] = useState(e.observacao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const s = situacao(e)
  const semVencimento = new Date(e.acesso_ate).getFullYear() >= SEM_VENCIMENTO

  async function salvar(mudanca: Partial<Pick<EmpresaAdmin, 'plano' | 'acesso_ate' | 'bloqueada' | 'observacao'>>) {
    if (!supabase) return
    setSalvando(true)
    setErro(null)
    const { error } = await supabase.rpc('admin_atualizar_empresa', {
      empresa: e.id,
      novo_plano: mudanca.plano ?? e.plano,
      novo_acesso_ate: mudanca.acesso_ate ?? e.acesso_ate,
      nova_bloqueada: mudanca.bloqueada ?? e.bloqueada,
      nova_observacao: mudanca.observacao ?? obs,
    })
    setSalvando(false)
    if (error) setErro(error.message)
    else aoSalvar()
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{e.nome}</p>
          <p className="text-xs text-slate-500 truncate">{e.admin_email ?? 'Ninguém entrou ainda'}</p>
        </div>
        <Badge tone={s.tone}>{s.texto}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div>
          <p className="text-slate-500">Vence em</p>
          <p className="font-semibold text-slate-800">{semVencimento ? 'Não vence' : formatDatePt(toISODate(new Date(e.acesso_ate)))}</p>
        </div>
        <div>
          <p className="text-slate-500">Usuários · obras</p>
          <p className="font-semibold text-slate-800">
            {e.membros} · {e.obras}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Último uso</p>
          <p className="font-semibold text-slate-800">{e.ultima_atividade ? formatDatePt(toISODate(new Date(e.ultima_atividade))) : '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        Código de convite <span className="font-mono font-semibold text-slate-800">{e.codigo_convite}</span>
        <button className="rounded p-1 hover:bg-slate-100" aria-label="Copiar código" onClick={() => navigator.clipboard?.writeText(e.codigo_convite)}>
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="py-1.5" disabled={salvando} onClick={() => salvar({ plano: 'mensal', acesso_ate: somarDias(e, 30), bloqueada: false })}>
          +30 dias mensal
        </Button>
        <Button variant="secondary" className="py-1.5" disabled={salvando} onClick={() => salvar({ plano: 'teste', acesso_ate: somarDias(e, 7) })}>
          +7 dias de teste
        </Button>
        <Button
          variant={e.bloqueada ? 'secondary' : 'danger'}
          className="py-1.5"
          disabled={salvando}
          onClick={() => {
            if (!e.bloqueada && !confirm(`Bloquear o acesso de ${e.nome}? Os dados ficam guardados.`)) return
            salvar({ bloqueada: !e.bloqueada })
          }}
        >
          {e.bloqueada ? 'Liberar' : 'Bloquear'}
        </Button>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-brand-700">Ajustar plano, data e anotações</summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Plano">
              <Select value={e.plano} onChange={(ev) => salvar({ plano: ev.target.value as Plano })} disabled={salvando}>
                <option value="teste">Teste grátis</option>
                <option value="mensal">Mensal</option>
              </Select>
            </Field>
            <Field label="Acesso até">
              <Input
                type="date"
                value={semVencimento ? '' : toISODate(new Date(e.acesso_ate))}
                onChange={(ev) => ev.target.value && salvar({ acesso_ate: fimDoDia(ev.target.value) })}
                disabled={salvando}
              />
            </Field>
          </div>
          <Field label="Anotações (valor, contato, forma de pagamento…)">
            <div className="flex gap-2">
              <Input value={obs} onChange={(ev) => setObs(ev.target.value)} />
              <Button variant="secondary" disabled={salvando || obs === (e.observacao ?? '')} onClick={() => salvar({ observacao: obs })}>
                Salvar
              </Button>
            </div>
          </Field>
          <p className="text-xs text-slate-400">Criada em {formatDatePt(toISODate(new Date(e.criado_em)))}</p>
        </div>
      </details>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </Card>
  )
}

export default function Admin() {
  const { mestre } = useSync()
  const [empresas, setEmpresas] = useState<EmpresaAdmin[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const [novaNome, setNovaNome] = useState('')
  const [novaDias, setNovaDias] = useState('7')
  const [criada, setCriada] = useState<{ nome: string; codigo: string } | null>(null)

  const carregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('admin_listar_empresas')
    if (error) setErro(error.message)
    else {
      setErro(null)
      setEmpresas((data ?? []) as EmpresaAdmin[])
    }
  }, [])

  useEffect(() => {
    if (mestre) carregar()
  }, [mestre, carregar])

  async function criarEmpresa() {
    if (!supabase || !novaNome.trim()) return
    const { data, error } = await supabase.rpc('admin_criar_empresa', { nome_empresa: novaNome.trim(), dias_teste: Number(novaDias) || 0 })
    if (error) {
      setErro(error.message)
      return
    }
    const nova = data as { nome: string; codigo_convite: string }
    setCriada({ nome: nova.nome, codigo: nova.codigo_convite })
    setNovaNome('')
    carregar()
  }

  if (!mestre) return <EmptyState text="Esta área é só para a conta mestre do sistema." />

  const lista = (empresas ?? [])
    .filter((e) => !busca.trim() || `${e.nome} ${e.admin_email ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))
    .filter((e) => {
      if (filtro === 'teste') return e.plano === 'teste' && !vencida(e) && !e.bloqueada
      if (filtro === 'mensal') return e.plano === 'mensal' && !vencida(e) && !e.bloqueada
      if (filtro === 'vencidas') return vencida(e) && !e.bloqueada
      if (filtro === 'bloqueadas') return e.bloqueada
      return true
    })
  const todas = empresas ?? []
  const emTeste = todas.filter((e) => e.plano === 'teste' && !vencida(e) && !e.bloqueada).length
  const pagantes = todas.filter((e) => e.plano === 'mensal' && !vencida(e) && !e.bloqueada && new Date(e.acesso_ate).getFullYear() < SEM_VENCIMENTO).length
  const vencidas = todas.filter((e) => vencida(e) && !e.bloqueada).length

  return (
    <div>
      <PageTitle title="Administração do sistema" subtitle="Empresas que usam o JotaP Obra 360, período de teste e mensalidades" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Empresas" value={todas.length} icon={<Building2 className="h-4 w-4" />} />
        <Stat label="Em teste" value={emTeste} icon={<FlaskConical className="h-4 w-4" />} />
        <Stat label="Mensal em dia" value={pagantes} icon={<Crown className="h-4 w-4" />} />
        <Stat label="Vencidas" value={vencidas} icon={<CircleAlert className="h-4 w-4" />} />
      </div>

      <Card className="p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Criar empresa para um cliente</p>
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_8rem_auto] gap-2 items-end">
          <Field label="Nome da empresa">
            <Input value={novaNome} onChange={(e) => setNovaNome(e.target.value)} />
          </Field>
          <Field label="Dias de teste">
            <Input value={novaDias} onChange={(e) => setNovaDias(e.target.value)} inputMode="numeric" />
          </Field>
          <Button onClick={criarEmpresa}>Criar</Button>
        </div>
        {criada && (
          <p className="text-sm text-green-700">
            {criada.nome} criada. Mande o código <b className="font-mono">{criada.codigo}</b> para o cliente: quem entrar primeiro com ele vira o administrador.
          </p>
        )}
        <p className="text-xs text-slate-500">Clientes que criam a própria conta pelo site também começam com 7 dias de teste grátis.</p>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail" />
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="sm:w-48">
          <option value="todas">Todas</option>
          <option value="teste">Em teste</option>
          <option value="mensal">Mensal em dia</option>
          <option value="vencidas">Vencidas</option>
          <option value="bloqueadas">Bloqueadas</option>
        </Select>
      </div>

      {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
      {empresas === null && !erro && <p className="text-sm text-slate-500">Carregando…</p>}
      {empresas && lista.length === 0 && <EmptyState text="Nenhuma empresa neste filtro." />}

      <div className="grid gap-3 lg:grid-cols-2">
        {lista.map((e) => (
          <CartaoEmpresa key={`${e.id}-${e.acesso_ate}-${e.observacao}`} e={e} aoSalvar={carregar} />
        ))}
      </div>
    </div>
  )
}
