"use client";

import type { StockOptions, StockRequest } from "@/lib/stock-store";
import styles from "./estoque.module.css";
import {
  Boxes,
  Building2,
  Check,
  ClipboardList,
  FileText,
  PackagePlus,
  Printer,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type DraftItem = {
  id: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  observacao: string;
};

type FormState = {
  cliente: string;
  ambiente: string;
  destino: "CLIENTE" | "FABRICA" | "ESCRITORIO" | "LOJA" | "";
  retiradoPor: string;
  responsavelEstoque: string;
  justificativa: string;
};

const emptyForm: FormState = {
  cliente: "",
  ambiente: "",
  destino: "",
  retiradoPor: "",
  responsavelEstoque: "JO",
  justificativa: "",
};

const emptyItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  descricao: "",
  quantidade: "1",
  unidade: "UN",
  observacao: "",
});

function upper(value: string) {
  return value.trim().toUpperCase();
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

export default function EstoqueClient({
  options,
  initialRequests,
}: {
  options: StockOptions;
  initialRequests: StockRequest[];
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [item, setItem] = useState<DraftItem>(emptyItem());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>(initialRequests);
  const [selected, setSelected] = useState<StockRequest | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Pronto para registrar saida.");

  const filteredRequests = useMemo(() => {
    const term = upper(search);
    if (!term) return requests;
    return requests.filter((request) =>
      [request.numero, request.cliente, request.ambiente, request.retiradoPor, request.destino]
        .join(" ")
        .toUpperCase()
        .includes(term),
    );
  }, [requests, search]);

  const totalItemsToday = useMemo(() => {
    const currentDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date());
    return requests
      .filter((request) => request.data === currentDate)
      .reduce((total, request) => total + request.items.length, 0);
  }, [requests]);

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: key === "justificativa" ? value : upper(value) }));
  }

  function addItem() {
    const descricao = upper(item.descricao);
    const quantidade = item.quantidade.trim();
    const unidade = upper(item.unidade || "UN");
    if (!descricao || !quantidade) {
      setNotice("Informe material e quantidade antes de adicionar.");
      return;
    }

    setItems((current) => [...current, { ...item, descricao, quantidade, unidade }]);
    setItem(emptyItem());
    setNotice("Item adicionado na requisicao.");
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((row) => row.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!form.destino || items.length === 0) {
      setNotice("Preencha os campos e adicione pelo menos um item.");
      return;
    }

    setBusy(true);
    setNotice("Salvando requisicao...");

    const response = await fetch("/api/stock-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items }),
    });
    const payload = (await response.json()) as { ok: boolean; request?: StockRequest; error?: string };
    setBusy(false);

    if (!payload.ok || !payload.request) {
      setNotice(payload.error ?? "Nao foi possivel salvar.");
      return;
    }

    setRequests((current) => [payload.request!, ...current]);
    setSelected(payload.request);
    setForm(emptyForm);
    setItems([]);
    setItem(emptyItem());
    setNotice(`Requisicao ${payload.request.numero} salva. Impressao pronta.`);
    setTimeout(() => window.print(), 350);
  }

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${styles.noPrint}`}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}>NX</div>
          <div>
            <strong>Nexora</strong>
            <span>Central de Estoque</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <button className={styles.navActive} type="button">
            <Boxes size={18} />
            Saida de materiais
          </button>
          <button type="button">
            <ClipboardList size={18} />
            Historico
          </button>
          <button type="button">
            <Printer size={18} />
            Impressao
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <span>Status</span>
          <strong>Operacao online</strong>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={`${styles.topbar} ${styles.noPrint}`}>
          <div>
            <span className={styles.eyebrow}>Nexora / Estoque</span>
            <h1>Requisicao de saida de materiais</h1>
          </div>
          <div className={styles.operator}>
            <UserRound size={18} />
            Estoque - Jo
          </div>
        </header>

        <section className={`${styles.metrics} ${styles.noPrint}`}>
          <article>
            <span>Requisicoes</span>
            <strong>{requests.length}</strong>
            <small>Total salvo</small>
          </article>
          <article>
            <span>Itens hoje</span>
            <strong>{totalItemsToday}</strong>
            <small>Saidas registradas</small>
          </article>
          <article>
            <span>Destino atual</span>
            <strong>{form.destino || "..."}</strong>
            <small>{todayLabel()}</small>
          </article>
        </section>

        <div className={`${styles.workspace} ${styles.noPrint}`}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Novo movimento</span>
                <h2>Dados da retirada</h2>
              </div>
              <span className={styles.notice}>{notice}</span>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <label>
                Cliente ou destino
                <input
                  list="clientes"
                  value={form.cliente}
                  onChange={(event) => updateForm("cliente", event.target.value)}
                  required
                />
              </label>

              <label>
                Ambiente
                <input
                  list="ambientes"
                  value={form.ambiente}
                  onChange={(event) => updateForm("ambiente", event.target.value)}
                  required
                />
              </label>

              <label>
                Tipo de saida
                <select
                  value={form.destino}
                  onChange={(event) => updateForm("destino", event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="CLIENTE">Cliente</option>
                  <option value="FABRICA">Fabrica</option>
                  <option value="ESCRITORIO">Escritorio</option>
                  <option value="LOJA">Loja</option>
                </select>
              </label>

              <label>
                Funcionario retirando
                <input
                  list="funcionarios"
                  value={form.retiradoPor}
                  onChange={(event) => updateForm("retiradoPor", event.target.value)}
                  required
                />
              </label>

              <label>
                Responsavel do estoque
                <input
                  value={form.responsavelEstoque}
                  onChange={(event) => updateForm("responsavelEstoque", event.target.value)}
                  required
                />
              </label>

              <label className={styles.full}>
                Justificativa da saida
                <textarea
                  value={form.justificativa}
                  onChange={(event) => updateForm("justificativa", event.target.value)}
                  required
                />
              </label>

              <div className={styles.itemBuilder}>
                <label>
                  Material
                  <input
                    list="materiais"
                    value={item.descricao}
                    onChange={(event) => setItem((current) => ({ ...current, descricao: upper(event.target.value) }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addItem();
                      }
                    }}
                  />
                </label>
                <label>
                  Qtd.
                  <input
                    value={item.quantidade}
                    onChange={(event) => setItem((current) => ({ ...current, quantidade: event.target.value }))}
                  />
                </label>
                <label>
                  Un.
                  <input
                    value={item.unidade}
                    onChange={(event) => setItem((current) => ({ ...current, unidade: upper(event.target.value) }))}
                  />
                </label>
                <button className={styles.addButton} type="button" onClick={addItem}>
                  <PackagePlus size={18} />
                  Adicionar
                </button>
              </div>

              <div className={styles.itemsBox}>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Material</th>
                      <th>Qtd.</th>
                      <th>Un.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.empty}>Nenhum item incluido.</td>
                      </tr>
                    ) : (
                      items.map((row, index) => (
                        <tr key={row.id}>
                          <td>{index + 1}</td>
                          <td>{row.descricao}</td>
                          <td>{row.quantidade}</td>
                          <td>{row.unidade}</td>
                          <td>
                            <button className={styles.iconButton} type="button" onClick={() => removeItem(row.id)}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.actions}>
                <button className={styles.secondary} type="button" onClick={() => setSelected(requests[0] ?? null)}>
                  <Printer size={17} />
                  Imprimir ultima
                </button>
                <button className={styles.primary} type="submit" disabled={busy}>
                  {busy ? <Check size={17} /> : <Save size={17} />}
                  Salvar e imprimir
                </button>
              </div>
            </form>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Base salva</span>
                <h2>Historico</h2>
              </div>
            </div>
            <div className={styles.search}>
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar requisicao" />
            </div>
            <div className={styles.history}>
              {filteredRequests.length === 0 ? (
                <div className={styles.emptyCard}>Nenhum registro encontrado.</div>
              ) : (
                filteredRequests.map((request) => (
                  <button
                    className={selected?.id === request.id ? styles.historyActive : styles.historyCard}
                    key={request.id}
                    type="button"
                    onClick={() => setSelected(request)}
                  >
                    <strong>{request.numero}</strong>
                    <span>{request.cliente} / {request.ambiente}</span>
                    <small>{request.data} {request.hora} - {request.items.length} item(ns)</small>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>

        <PrintView request={selected} />
      </main>

      <datalist id="clientes">{options.clientes.map((value) => <option value={value} key={value} />)}</datalist>
      <datalist id="ambientes">{options.ambientes.map((value) => <option value={value} key={value} />)}</datalist>
      <datalist id="funcionarios">{options.funcionarios.map((value) => <option value={value} key={value} />)}</datalist>
      <datalist id="materiais">{options.materiais.map((value) => <option value={value} key={value} />)}</datalist>
    </div>
  );
}

function PrintView({ request }: { request: StockRequest | null }) {
  if (!request) {
    return (
      <section className={styles.printEmpty}>
        <FileText size={20} />
        Salve ou selecione uma requisicao para imprimir.
      </section>
    );
  }

  return (
    <section className={styles.printSheet}>
      {[1, 2].map((copy) => (
        <div key={copy}>
          <article className={styles.via}>
            <header className={styles.printHeader}>
              <strong>HAPPY HOUSE</strong>
              <span>REQUISICAO DE SAIDA DE MATERIAIS</span>
            </header>

            <div className={styles.printGrid}>
              <PrintField label="Data" value={request.data} />
              <PrintField label="Hora" value={request.hora} />
              <PrintField label="Requisicao No" value={request.numero} wide />
              <PrintField label="Cliente / destino" value={request.cliente} wide />
              <PrintField label="Ambiente" value={request.ambiente} />
              <PrintField label="Tipo" value={request.destino} />
              <PrintField label="Funcionario retirando" value={request.retiradoPor} wide />
              <PrintField label="Responsavel estoque" value={request.responsavelEstoque} wide />
              <PrintField label="Justificativa" value={request.justificativa} full />
            </div>

            <table className={styles.printTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Descricao do material</th>
                  <th>Qtd.</th>
                  <th>Un.</th>
                </tr>
              </thead>
              <tbody>
                {request.items.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.descricao}</td>
                    <td>{row.quantidade}</td>
                    <td>{row.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.signatures}>
              <span>Assinatura do funcionario retirando</span>
              <span>Assinatura do estoque</span>
            </div>
          </article>
          {copy === 1 && <div className={styles.cutLine}>RECORTE</div>}
        </div>
      ))}
    </section>
  );
}

function PrintField({ label, value, wide, full }: { label: string; value: string; wide?: boolean; full?: boolean }) {
  return (
    <div className={`${styles.printField} ${wide ? styles.wide : ""} ${full ? styles.fullPrint : ""}`}>
      <b>{label}</b>
      <span>{value}</span>
    </div>
  );
}
