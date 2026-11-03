import { useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { limparEndereco } from '../lib/formatos'
import { numeroParaInput, parseMoneyInput } from '../lib/money'
import { STATUS_OBRA_LABEL, TIPO_OBRA_LABEL, type Endereco, type Obra, type StatusObra, type TipoObra } from '../lib/types'
import CamposEndereco from './CamposEndereco'
import { Button, Card, Field, Input, Select, TextArea } from './ui'

export type DadosObra = Omit<Obra, 'id' | 'ativo' | 'bdi'>

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
      {children}
    </div>
  )
}

const NOVO_CLIENTE = '__novo'

/** Cadastro completo da obra: identificação, cliente, endereço, prazos, valores e responsável técnico. */
export default function FormObra({
  obra,
  onSalvar,
  onCancelar,
  textoSalvar = 'Salvar obra',
}: {
  obra?: Obra
  onSalvar: (dados: DadosObra) => void
  onCancelar: () => void
  textoSalvar?: string
}) {
  const { db, addItem } = useStore()
  const [f, setF] = useState({
    nome: obra?.nome ?? '',
    codigo: obra?.codigo ?? '',
    tipo: (obra?.tipo ?? '') as TipoObra | '',
    status: (obra?.status ?? 'andamento') as StatusObra,
    clienteId: obra?.clienteId ?? '',
    novoCliente: obra && !obra.clienteId ? (obra.cliente ?? '') : '',
    dataInicio: obra?.dataInicio ?? '',
    dataFim: obra?.dataFim ?? '',
    valorContrato: numeroParaInput(obra?.valorContrato),
    areaConstruida: numeroParaInput(obra?.areaConstruida),
    responsavelTecnico: obra?.responsavelTecnico ?? '',
    registroProfissional: obra?.registroProfissional ?? '',
    art: obra?.art ?? '',
    alvara: obra?.alvara ?? '',
    observacao: obra?.observacao ?? '',
  })
  // obras antigas tinham o endereço num campo só: ele vira a rua para não se perder
  const [endereco, setEndereco] = useState<Endereco>({
    cep: obra?.cep,
    logradouro: obra?.logradouro ?? (obra?.cidade ? undefined : obra?.endereco),
    numero: obra?.numero,
    complemento: obra?.complemento,
    bairro: obra?.bairro,
    cidade: obra?.cidade,
    uf: obra?.uf,
  })
  const [erro, setErro] = useState<string | null>(null)
  const set = (patch: Partial<typeof f>) => setF((atual) => ({ ...atual, ...patch }))
  const clienteNovo = f.clienteId === NOVO_CLIENTE || (!f.clienteId && db.clientes.length === 0)

  function salvar() {
    if (!f.nome.trim()) {
      setErro('Dê um nome para a obra.')
      return
    }
    if (f.dataInicio && f.dataFim && f.dataFim < f.dataInicio) {
      setErro('O término não pode ser antes do início.')
      return
    }
    let clienteId = f.clienteId && f.clienteId !== NOVO_CLIENTE ? f.clienteId : undefined
    let clienteNome = clienteId ? db.clientes.find((c) => c.id === clienteId)?.nome : undefined
    if (!clienteId && f.novoCliente.trim()) {
      const existente = db.clientes.find((c) => c.nome.toLowerCase() === f.novoCliente.trim().toLowerCase())
      const cliente = existente ?? addItem('clientes', { nome: f.novoCliente.trim(), tipoPessoa: 'pf', ativo: true })
      clienteId = cliente.id
      clienteNome = cliente.nome
    }
    onSalvar({
      nome: f.nome.trim(),
      codigo: f.codigo.trim() || undefined,
      tipo: f.tipo || undefined,
      status: f.status,
      clienteId,
      cliente: clienteNome,
      endereco: undefined,
      ...limparEndereco(endereco),
      // campos de endereço apagados precisam ir como undefined para sumir na edição
      ...Object.fromEntries(
        (['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] as const)
          .filter((k) => !endereco[k]?.trim())
          .map((k) => [k, undefined]),
      ),
      dataInicio: f.dataInicio || undefined,
      dataFim: f.dataFim || undefined,
      valorContrato: parseMoneyInput(f.valorContrato) || undefined,
      areaConstruida: parseMoneyInput(f.areaConstruida) || undefined,
      responsavelTecnico: f.responsavelTecnico.trim() || undefined,
      registroProfissional: f.registroProfissional.trim() || undefined,
      art: f.art.trim() || undefined,
      alvara: f.alvara.trim() || undefined,
      observacao: f.observacao.trim() || undefined,
    })
  }

  return (
    <Card className="p-4 space-y-5 border-brand-300">
      <Secao titulo="Identificação">
        <Field label="Nome da obra *">
          <Input value={f.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex: Residência Família Souza" autoFocus={!obra} />
        </Field>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Field label="Código">
            <Input value={f.codigo} onChange={(e) => set({ codigo: e.target.value })} placeholder="Ex: OB-012" />
          </Field>
          <Field label="Tipo de obra">
            <Select value={f.tipo} onChange={(e) => set({ tipo: e.target.value as TipoObra | '' })}>
              <option value="">—</option>
              {Object.entries(TIPO_OBRA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Situação">
            <Select value={f.status} onChange={(e) => set({ status: e.target.value as StatusObra })}>
              {Object.entries(STATUS_OBRA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Secao>

      <Secao titulo="Cliente">
        {db.clientes.length > 0 && (
          <Field label="Cliente">
            <Select value={f.clienteId} onChange={(e) => set({ clienteId: e.target.value })}>
              <option value="">Sem cliente</option>
              {db.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
              <option value={NOVO_CLIENTE}>+ Cadastrar novo cliente</option>
            </Select>
          </Field>
        )}
        {clienteNovo && (
          <Field label={db.clientes.length > 0 ? 'Nome do novo cliente' : 'Nome do cliente'}>
            <Input value={f.novoCliente} onChange={(e) => set({ novoCliente: e.target.value })} placeholder="Os outros dados ficam em Cadastros › Clientes" />
          </Field>
        )}
      </Secao>

      <Secao titulo="Endereço da obra">
        <CamposEndereco valor={endereco} onChange={setEndereco} />
      </Secao>

      <Secao titulo="Prazo e valores">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Início">
            <Input type="date" value={f.dataInicio} onChange={(e) => set({ dataInicio: e.target.value })} />
          </Field>
          <Field label="Término previsto">
            <Input type="date" value={f.dataFim} onChange={(e) => set({ dataFim: e.target.value })} />
          </Field>
          <Field label="Valor do contrato (R$)">
            <Input value={f.valorContrato} onChange={(e) => set({ valorContrato: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Área construída (m²)">
            <Input value={f.areaConstruida} onChange={(e) => set({ areaConstruida: e.target.value })} inputMode="decimal" />
          </Field>
        </div>
      </Secao>

      <Secao titulo="Responsabilidade técnica e documentos">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Responsável técnico">
            <Input value={f.responsavelTecnico} onChange={(e) => set({ responsavelTecnico: e.target.value })} placeholder="Engenheiro / arquiteto" />
          </Field>
          <Field label="CREA / CAU">
            <Input value={f.registroProfissional} onChange={(e) => set({ registroProfissional: e.target.value })} />
          </Field>
          <Field label="ART / RRT">
            <Input value={f.art} onChange={(e) => set({ art: e.target.value })} />
          </Field>
          <Field label="Alvará">
            <Input value={f.alvara} onChange={(e) => set({ alvara: e.target.value })} />
          </Field>
        </div>
        <Field label="Observações">
          <TextArea value={f.observacao} onChange={(e) => set({ observacao: e.target.value })} />
        </Field>
      </Secao>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <Button onClick={salvar} className="flex-1">
          {textoSalvar}
        </Button>
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}
