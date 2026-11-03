import { FileUp, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { generateId } from '../lib/id'
import { toISODate } from '../lib/dates'
import { etapasDaObra } from '../lib/gestao'
import { formatBRL, numeroParaInput, parseMoneyInput } from '../lib/money'
import { chaveValida, dividirParcelas, lerChave, lerXmlNfe, mascaraChave, mesmoDocumento, somaItens, type ParcelaXml } from '../lib/notas'
import { mascaraDocumento } from '../lib/formatos'
import { adicionarAnexo, removerAnexosDe } from '../lib/anexos'
import {
  CATEGORIA_LABEL,
  FORMA_PAGAMENTO_DESPESA_LABEL,
  MODELO_NOTA_LABEL,
  type CategoriaCusto,
  type FormaPagamentoDespesa,
  type ItemNota,
  type ModeloNota,
  type NotaFiscal,
  type TipoNota,
} from '../lib/types'
import Anexos from './Anexos'
import { Button, Card, Field, Input, Select, TextArea } from './ui'

function Secao({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
        {extra}
      </div>
      {children}
    </div>
  )
}

type ItemForm = {
  id: string
  codigo?: string
  ncm?: string
  descricao: string
  quantidade: string
  unidade: string
  valorUnitario: string
}
const itemParaForm = (i: ItemNota): ItemForm => ({
  ...i,
  quantidade: numeroParaInput(i.quantidade),
  valorUnitario: numeroParaInput(i.valorUnitario),
})

type Pagamento = 'nenhum' | 'avista_pago' | 'parcelado'

/** Cadastro de nota fiscal de compra (entrada) ou de venda/serviço (saída), com itens, impostos, parcelas e fotos. */
export default function FormNota({ tipo, nota, onFechar }: { tipo: TipoNota; nota?: NotaFiscal; onFechar: () => void }) {
  const { db, addItem, updateItem, removeItem, addFornecedor } = useStore()
  const [id] = useState(() => nota?.id ?? generateId())
  const hoje = toISODate(new Date())
  const entrada = tipo === 'entrada'
  const parcelasExistentes = db.lancamentos.filter((l) => l.notaId === id)
  const xmlRef = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versaoAnexos, setVersaoAnexos] = useState(0)

  const [f, setF] = useState({
    modelo: (nota?.modelo ?? (entrada ? 'nfe' : 'nfse')) as ModeloNota,
    numero: nota?.numero ?? '',
    serie: nota?.serie ?? '',
    chaveAcesso: nota?.chaveAcesso ? mascaraChave(nota.chaveAcesso) : '',
    dataEmissao: nota?.dataEmissao ?? hoje,
    dataEntrada: nota?.dataEntrada ?? (entrada ? hoje : ''),
    naturezaOperacao: nota?.naturezaOperacao ?? '',
    parteId: (entrada ? nota?.fornecedorId : nota?.clienteId) ?? '',
    nomeParte: nota?.nomeParte ?? '',
    documentoParte: nota?.documentoParte ?? '',
    obraId: nota?.obraId ?? (db.obras.length === 1 ? db.obras[0].id : ''),
    etapaId: nota?.etapaId ?? '',
    categoria: (nota?.categoria ?? (entrada ? 'material' : '')) as CategoriaCusto | '',
    valorServicos: numeroParaInput(nota?.valorServicos || undefined),
    valorProdutosManual: numeroParaInput(nota && nota.itens.length === 0 ? nota.valorProdutos || undefined : undefined),
    desconto: numeroParaInput(nota?.desconto || undefined),
    frete: numeroParaInput(nota?.frete || undefined),
    outrasDespesas: numeroParaInput(nota?.outrasDespesas || undefined),
    valorICMS: numeroParaInput(nota?.valorICMS),
    valorIPI: numeroParaInput(nota?.valorIPI),
    valorISS: numeroParaInput(nota?.valorISS),
    valorPisCofins: numeroParaInput(nota?.valorPisCofins),
    retencoes: numeroParaInput(nota?.retencoes),
    observacao: nota?.observacao ?? '',
  })
  const set = (patch: Partial<typeof f>) => setF((a) => ({ ...a, ...patch }))
  const [itens, setItens] = useState<ItemForm[]>(() => (nota?.itens ?? []).map(itemParaForm))
  const [pagamento, setPagamento] = useState<Pagamento>(nota ? 'nenhum' : 'parcelado')
  const [forma, setForma] = useState<FormaPagamentoDespesa | ''>(entrada ? 'boleto' : 'pix')
  const [nParcelas, setNParcelas] = useState('1')
  const [primeiroVenc, setPrimeiroVenc] = useState(hoje)
  const [intervalo, setIntervalo] = useState('30')
  const [parcelasXml, setParcelasXml] = useState<ParcelaXml[] | null>(null)
  const movimentosDaNota = db.movimentosEstoque.filter((m) => m.notaId === id)
  const [darEntrada, setDarEntrada] = useState(entrada && (nota ? movimentosDaNota.length > 0 : true))

  // ---- totais ----
  const produtos =
    itens.length > 0
      ? somaItens(
          itens.map((i) => ({
            ...i,
            quantidade: parseMoneyInput(i.quantidade),
            valorUnitario: parseMoneyInput(i.valorUnitario),
          })),
        )
      : parseMoneyInput(f.valorProdutosManual)
  const servicos = parseMoneyInput(f.valorServicos)
  const total =
    Math.round(
      (produtos + servicos - parseMoneyInput(f.desconto) + parseMoneyInput(f.frete) + parseMoneyInput(f.outrasDespesas) + parseMoneyInput(f.valorIPI)) * 100,
    ) / 100
  const retencoes = parseMoneyInput(f.retencoes)
  const liquido = total - retencoes

  const parcelasPrevistas: ParcelaXml[] =
    pagamento === 'parcelado'
      ? (parcelasXml ?? dividirParcelas(liquido, Math.max(1, Math.min(48, Number(nParcelas) || 1)), primeiroVenc || hoje, Number(intervalo) || 30))
      : []

  // ---- chave de acesso ----
  function aoMudarChave(v: string) {
    const chave = mascaraChave(v)
    set({ chaveAcesso: chave })
    setAviso(null)
    const lida = lerChave(chave)
    if (!lida) return
    if (!chaveValida(chave)) {
      setAviso('Chave com dígito verificador inválido. Confira os números.')
      return
    }
    const forn = entrada ? db.fornecedores.find((x) => mesmoDocumento(x.documento, lida.cnpj)) : undefined
    setF((a) => ({
      ...a,
      chaveAcesso: chave,
      modelo: lida.modelo,
      numero: a.numero || lida.numero,
      serie: a.serie || lida.serie,
      parteId: forn ? forn.id : a.parteId,
      documentoParte: forn ? a.documentoParte : a.documentoParte || mascaraDocumento(lida.cnpj),
    }))
    setAviso(forn ? `Fornecedor encontrado: ${forn.nome}.` : 'Número e série preenchidos pela chave.')
  }

  // ---- XML ----
  async function importarXml(file: File | undefined) {
    if (!file) return
    setErro(null)
    const lido = lerXmlNfe(await file.text())
    if (!lido) {
      setErro('Esse arquivo não parece um XML de NF-e.')
      return
    }
    const { nota: n, emitente, destinatario, parcelas } = lido
    let parteId = ''
    let nomeParte = ''
    let documentoParte = ''
    if (entrada) {
      const existente = db.fornecedores.find((x) => mesmoDocumento(x.documento, emitente.documento))
      if (existente) parteId = existente.id
      else if (emitente.nome) {
        const novo = addFornecedor({
          nome: emitente.nome,
          ativo: true,
          categoria: 'material',
          tipoPessoa: emitente.documento.length > 11 ? 'pj' : 'pf',
          documento: mascaraDocumento(emitente.documento),
          telefone: emitente.telefone,
          cep: emitente.cep,
          logradouro: emitente.logradouro,
          numero: emitente.numero,
          complemento: emitente.complemento,
          bairro: emitente.bairro,
          cidade: emitente.cidade,
          uf: emitente.uf,
        })
        parteId = novo.id
      }
    } else {
      const cli = db.clientes.find((c) => mesmoDocumento(c.documento, destinatario.documento))
      if (cli) parteId = cli.id
      else {
        nomeParte = destinatario.nome
        documentoParte = mascaraDocumento(destinatario.documento)
      }
    }
    setF((a) => ({
      ...a,
      modelo: n.modelo ?? a.modelo,
      numero: n.numero ?? a.numero,
      serie: n.serie ?? '',
      chaveAcesso: n.chaveAcesso ? mascaraChave(n.chaveAcesso) : '',
      dataEmissao: n.dataEmissao || a.dataEmissao,
      naturezaOperacao: n.naturezaOperacao ?? '',
      parteId,
      nomeParte,
      documentoParte,
      valorProdutosManual: '',
      desconto: numeroParaInput(n.desconto || undefined),
      frete: numeroParaInput(n.frete || undefined),
      outrasDespesas: numeroParaInput(n.outrasDespesas || undefined),
      valorICMS: numeroParaInput(n.valorICMS),
      valorIPI: numeroParaInput(n.valorIPI),
      valorPisCofins: numeroParaInput(n.valorPisCofins),
    }))
    setItens((n.itens ?? []).map(itemParaForm))
    if (parcelas.length > 0) {
      setPagamento('parcelado')
      setParcelasXml(
        parcelas.map((p, i) => ({
          ...p,
          numero: `${i + 1}/${parcelas.length}`,
        })),
      )
    }
    await adicionarAnexo('notasFiscais', id, file)
    setVersaoAnexos((v) => v + 1)
    setAviso(`XML importado: ${n.itens?.length ?? 0} item(ns)${parcelas.length ? `, ${parcelas.length} parcela(s)` : ''}. O XML ficou anexado à nota.`)
    if (xmlRef.current) xmlRef.current.value = ''
  }

  // ---- salvar ----
  function salvar() {
    if (!f.numero.trim()) return setErro('Informe o número da nota.')
    if (total <= 0) return setErro('Informe os valores da nota (itens, produtos ou serviços).')
    const parte = entrada ? db.fornecedores.find((x) => x.id === f.parteId) : db.clientes.find((x) => x.id === f.parteId)
    const dados: Omit<NotaFiscal, 'id'> = {
      tipo,
      modelo: f.modelo,
      numero: f.numero.trim(),
      serie: f.serie.trim() || undefined,
      chaveAcesso: f.chaveAcesso.replace(/\D/g, '') || undefined,
      dataEmissao: f.dataEmissao || hoje,
      dataEntrada: f.dataEntrada || undefined,
      naturezaOperacao: f.naturezaOperacao.trim() || undefined,
      fornecedorId: entrada ? f.parteId || undefined : undefined,
      clienteId: !entrada ? f.parteId || undefined : undefined,
      nomeParte: parte ? undefined : f.nomeParte.trim() || undefined,
      documentoParte: parte ? undefined : f.documentoParte.trim() || undefined,
      obraId: f.obraId || undefined,
      etapaId: (f.obraId && f.etapaId) || undefined,
      categoria: f.categoria || undefined,
      itens: itens
        .filter((i) => i.descricao.trim())
        .map((i) => ({
          ...i,
          descricao: i.descricao.trim(),
          quantidade: parseMoneyInput(i.quantidade),
          valorUnitario: parseMoneyInput(i.valorUnitario),
        })),
      valorProdutos: produtos,
      valorServicos: servicos,
      desconto: parseMoneyInput(f.desconto),
      frete: parseMoneyInput(f.frete),
      outrasDespesas: parseMoneyInput(f.outrasDespesas),
      valorTotal: total,
      valorICMS: parseMoneyInput(f.valorICMS) || undefined,
      valorIPI: parseMoneyInput(f.valorIPI) || undefined,
      valorISS: parseMoneyInput(f.valorISS) || undefined,
      valorPisCofins: parseMoneyInput(f.valorPisCofins) || undefined,
      retencoes: retencoes || undefined,
      cancelada: nota?.cancelada,
      observacao: f.observacao.trim() || undefined,
    }
    if (nota) updateItem('notasFiscais', id, dados)
    else addItem('notasFiscais', { ...dados, id })

    const nomeParte = parte?.nome ?? dados.nomeParte ?? ''
    const desc = `${entrada ? 'NF' : 'NF emitida'} ${dados.numero}${nomeParte ? ` · ${nomeParte}` : ''}`
    const base = {
      obraId: dados.obraId,
      tipo: entrada ? ('despesa' as const) : ('receita' as const),
      categoria: entrada ? dados.categoria : undefined,
      notaId: id,
      formaPagamento: forma || undefined,
      fornecedorId: dados.fornecedorId,
      clienteId: dados.clienteId,
    }
    // estoque: refaz as entradas desta nota a partir dos itens
    for (const m of movimentosDaNota) removeItem('movimentosEstoque', m.id)
    if (entrada && darEntrada && dados.obraId && !dados.cancelada) {
      const criados = new Map<string, string>()
      for (const it of dados.itens) {
        if (it.quantidade <= 0) continue
        const chave = it.descricao.toLowerCase()
        const materialId =
          db.materiaisEstoque.find((m) => m.nome.toLowerCase() === chave)?.id ??
          criados.get(chave) ??
          addItem('materiaisEstoque', { nome: it.descricao, unidade: it.unidade || 'un' }).id
        criados.set(chave, materialId)
        addItem('movimentosEstoque', {
          materialId,
          obraId: dados.obraId,
          data: dados.dataEntrada || dados.dataEmissao,
          tipo: 'entrada',
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          etapaId: dados.etapaId,
          observacao: `NF ${dados.numero}`,
          notaId: id,
        })
      }
    }

    if (pagamento !== 'nenhum') {
      // refaz só as parcelas que ainda não foram pagas
      for (const l of parcelasExistentes) if (!l.pago) removeItem('lancamentos', l.id)
    }
    if (pagamento === 'avista_pago') {
      addItem('lancamentos', {
        ...base,
        descricao: desc,
        valor: liquido,
        vencimento: dados.dataEmissao,
        pago: true,
        dataPagamento: dados.dataEmissao,
      })
    } else if (pagamento === 'parcelado') {
      for (const p of parcelasPrevistas) {
        addItem('lancamentos', {
          ...base,
          descricao: `${desc} (${p.numero})`,
          parcela: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
          pago: false,
        })
      }
    }
    onFechar()
  }

  function cancelar() {
    if (!nota) void removerAnexosDe('notasFiscais', id)
    onFechar()
  }

  const etapas = f.obraId ? etapasDaObra(db, f.obraId) : []
  const partes = entrada ? db.fornecedores : db.clientes
  const setItem = (i: number, patch: Partial<ItemForm>) => setItens((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <Card className="p-4 space-y-6 border-brand-300">
      <Secao
        titulo={nota ? `Editar nota ${nota.numero}` : entrada ? 'Nova nota de compra' : 'Nova nota de venda / serviço'}
        extra={
          <>
            <Button variant="secondary" className="py-1 text-xs" onClick={() => xmlRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Importar XML da NF-e
            </Button>
            <input ref={xmlRef} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={(e) => importarXml(e.target.files?.[0])} />
          </>
        }
      >
        {aviso && <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">{aviso}</p>}
        <Field label="Chave de acesso (44 números)">
          <Input
            value={f.chaveAcesso}
            onChange={(e) => aoMudarChave(e.target.value)}
            inputMode="numeric"
            placeholder="Digite ou cole a chave que está abaixo do código de barras"
          />
        </Field>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="Modelo">
            <Select value={f.modelo} onChange={(e) => set({ modelo: e.target.value as ModeloNota })}>
              {Object.entries(MODELO_NOTA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Número *">
            <Input value={f.numero} onChange={(e) => set({ numero: e.target.value })} inputMode="numeric" />
          </Field>
          <Field label="Série">
            <Input value={f.serie} onChange={(e) => set({ serie: e.target.value })} />
          </Field>
          <Field label="Emissão">
            <Input type="date" value={f.dataEmissao} onChange={(e) => set({ dataEmissao: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entrada && (
            <Field label="Data de entrada / recebimento">
              <Input type="date" value={f.dataEntrada} onChange={(e) => set({ dataEntrada: e.target.value })} />
            </Field>
          )}
          <Field label="Natureza da operação">
            <Input
              value={f.naturezaOperacao}
              onChange={(e) => set({ naturezaOperacao: e.target.value })}
              placeholder={entrada ? 'Ex: Venda de mercadoria' : 'Ex: Prestação de serviço de construção'}
            />
          </Field>
        </div>
      </Secao>

      <Secao titulo={entrada ? 'Fornecedor (emitente)' : 'Cliente (tomador)'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label={entrada ? 'Fornecedor' : 'Cliente'}>
            <Select value={f.parteId} onChange={(e) => set({ parteId: e.target.value })}>
              <option value="">{entrada ? 'Não cadastrado (digitar)' : 'Não cadastrado (digitar)'}</option>
              {partes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </Field>
          {!f.parteId && (
            <>
              <Field label="Nome / razão social">
                <Input value={f.nomeParte} onChange={(e) => set({ nomeParte: e.target.value })} />
              </Field>
              <Field label="CPF / CNPJ">
                <Input value={f.documentoParte} onChange={(e) => set({ documentoParte: mascaraDocumento(e.target.value) })} inputMode="numeric" />
              </Field>
            </>
          )}
        </div>
      </Secao>

      <Secao titulo="Obra e centro de custo">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Field label="Obra">
            <Select value={f.obraId} onChange={(e) => set({ obraId: e.target.value, etapaId: '' })}>
              <option value="">Sem obra (empresa)</option>
              {db.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>
          {etapas.length > 0 && (
            <Field label="Etapa">
              <Select value={f.etapaId} onChange={(e) => set({ etapaId: e.target.value })}>
                <option value="">—</option>
                {etapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {entrada && (
            <Field label="Tipo de custo">
              <Select value={f.categoria} onChange={(e) => set({ categoria: e.target.value as CategoriaCusto | '' })}>
                <option value="">Despesas gerais</option>
                {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Secao>

      <Secao
        titulo={`Itens da nota${itens.length ? ` (${itens.length})` : ''}`}
        extra={
          <Button
            variant="ghost"
            className="py-1 text-xs"
            onClick={() =>
              setItens((l) => [
                ...l,
                {
                  id: generateId(),
                  descricao: '',
                  quantidade: '1',
                  unidade: 'un',
                  valorUnitario: '',
                },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Item
          </Button>
        }
      >
        {itens.length === 0 && <p className="text-xs text-slate-500">Opcional. Sem itens, informe só o valor dos produtos ou serviços abaixo.</p>}
        {itens.map((it, i) => (
          <div
            key={it.id}
            className="grid grid-cols-[4.5rem_3.5rem_1fr_auto] sm:grid-cols-[1fr_4.5rem_3.5rem_6.5rem_auto] gap-1.5 items-end border-b border-slate-100 pb-2 sm:border-0 sm:pb-0"
          >
            <div className="col-span-4 sm:col-span-1">
              <Field label={i === 0 ? 'Descrição' : ''}>
                <Input value={it.descricao} onChange={(e) => setItem(i, { descricao: e.target.value })} placeholder="Descrição do produto" />
              </Field>
            </div>
            <Field label={i === 0 ? 'Qtd.' : ''}>
              <Input value={it.quantidade} onChange={(e) => setItem(i, { quantidade: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label={i === 0 ? 'Un.' : ''}>
              <Input value={it.unidade} onChange={(e) => setItem(i, { unidade: e.target.value })} />
            </Field>
            <Field label={i === 0 ? 'Valor unit.' : ''}>
              <Input value={it.valorUnitario} onChange={(e) => setItem(i, { valorUnitario: e.target.value })} inputMode="decimal" />
            </Field>
            <button className="mb-2.5 text-slate-400 hover:text-red-600" aria-label="Remover item" onClick={() => setItens((l) => l.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </Secao>

      {entrada && itens.length > 0 && (
        <label className="flex items-start gap-2 text-sm text-slate-700 -mt-3">
          <input type="checkbox" className="mt-0.5 accent-brand-700" checked={darEntrada} onChange={(e) => setDarEntrada(e.target.checked)} />
          <span>
            Dar entrada dos itens no estoque da obra
            {!f.obraId && darEntrada && <span className="block text-xs text-amber-600">Escolha a obra acima para o material entrar no estoque dela.</span>}
          </span>
        </label>
      )}

      <Secao titulo="Valores e impostos">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {itens.length === 0 ? (
            <Field label="Produtos (R$)">
              <Input value={f.valorProdutosManual} onChange={(e) => set({ valorProdutosManual: e.target.value })} inputMode="decimal" />
            </Field>
          ) : (
            <Field label="Produtos (soma dos itens)">
              <Input value={formatBRL(produtos)} readOnly className="bg-slate-50" />
            </Field>
          )}
          <Field label="Serviços (R$)">
            <Input value={f.valorServicos} onChange={(e) => set({ valorServicos: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Frete (R$)">
            <Input value={f.frete} onChange={(e) => set({ frete: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Desconto (R$)">
            <Input value={f.desconto} onChange={(e) => set({ desconto: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Outras despesas (R$)">
            <Input value={f.outrasDespesas} onChange={(e) => set({ outrasDespesas: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="IPI (R$)">
            <Input value={f.valorIPI} onChange={(e) => set({ valorIPI: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="ICMS (R$)">
            <Input value={f.valorICMS} onChange={(e) => set({ valorICMS: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="ISS (R$)">
            <Input value={f.valorISS} onChange={(e) => set({ valorISS: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="PIS / COFINS (R$)">
            <Input value={f.valorPisCofins} onChange={(e) => set({ valorPisCofins: e.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Retenções (INSS, IR...)">
            <Input value={f.retencoes} onChange={(e) => set({ retencoes: e.target.value })} inputMode="decimal" />
          </Field>
        </div>
        <div className="flex flex-wrap justify-end gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Total da nota <b className="text-slate-900 text-base">{formatBRL(total)}</b>
          </span>
          {retencoes > 0 && (
            <span className="text-slate-500">
              Líquido a {entrada ? 'pagar' : 'receber'} <b className="text-slate-900 text-base">{formatBRL(liquido)}</b>
            </span>
          )}
        </div>
      </Secao>

      <Secao titulo={entrada ? 'Pagamento (contas a pagar)' : 'Recebimento (contas a receber)'}>
        {parcelasExistentes.length > 0 && (
          <p className="text-xs text-slate-600">
            Esta nota já tem {parcelasExistentes.length} parcela(s) no Financeiro ({parcelasExistentes.filter((p) => p.pago).length} paga(s)). Escolha uma opção
            abaixo só se quiser refazer as que estão em aberto.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['nenhum', parcelasExistentes.length ? 'Manter como está' : 'Não lançar'],
              ['avista_pago', entrada ? 'À vista, já paga' : 'À vista, já recebida'],
              ['parcelado', 'A prazo / parcelado'],
            ] as [Pagamento, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setPagamento(v)}
              className={`rounded-lg border px-2 py-2 text-xs sm:text-sm font-medium ${pagamento === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
            >
              {l}
            </button>
          ))}
        </div>
        {pagamento !== 'nenhum' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label="Forma de pagamento">
              <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamentoDespesa | '')}>
                <option value="">—</option>
                {Object.entries(FORMA_PAGAMENTO_DESPESA_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            {pagamento === 'parcelado' && !parcelasXml && (
              <>
                <Field label="Parcelas">
                  <Input value={nParcelas} onChange={(e) => setNParcelas(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                </Field>
                <Field label="1º vencimento">
                  <Input type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
                </Field>
                <Field label="Intervalo">
                  <Select value={intervalo} onChange={(e) => setIntervalo(e.target.value)}>
                    <option value="30">Mensal</option>
                    <option value="7">Semanal</option>
                    <option value="14">Quinzenal</option>
                    <option value="28">28 dias</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
        )}
        {pagamento === 'parcelado' && parcelasPrevistas.length > 0 && (
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
            {parcelasPrevistas.map((p) => (
              <div key={p.numero} className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">
                  Parcela {p.numero} · vence {p.vencimento.split('-').reverse().join('/')}
                </span>
                <span className="font-medium tabular">{formatBRL(p.valor)}</span>
              </div>
            ))}
            {parcelasXml && (
              <button className="w-full px-3 py-1.5 text-left text-xs text-brand-700" onClick={() => setParcelasXml(null)}>
                Parcelas vieram do XML. Clique para definir outras.
              </button>
            )}
          </div>
        )}
      </Secao>

      <Secao titulo="Foto da nota, PDF ou XML">
        <Anexos key={versaoAnexos} refColecao="notasFiscais" refId={id} compacto />
        <Field label="Observações">
          <TextArea value={f.observacao} onChange={(e) => set({ observacao: e.target.value })} />
        </Field>
      </Secao>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <Button onClick={salvar} className="flex-1">
          {nota ? 'Salvar alterações' : 'Lançar nota'}
        </Button>
        <Button variant="secondary" onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}
