"use client";

import type { StockBalance, StockMovement, StockOptions, StockRequest } from "@/lib/stock-store";
import styles from "./estoque.module.css";
import {
  Boxes,
  Check,
  ClipboardList,
  FileText,
  ListPlus,
  PackagePlus,
  Printer,
  Save,
  Search,
  Settings2,
  Trash2,
  UserRound,
  Warehouse,
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

type View = "saida" | "historico" | "impressao" | "cadastros" | "saldo";
type RegisterKey = keyof StockOptions;

const registerLabels: Record<RegisterKey, string> = {
  clientes: "Cliente",
  ambientes: "Ambiente",
  funcionarios: "Funcionario",
  materiais: "Item",
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

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
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
  initialBalances,
  initialMovements,
}: {
  options: StockOptions;
  initialRequests: StockRequest[];
  initialBalances: StockBalance[];
  initialMovements: StockMovement[];
}) {
  const [view, setView] = useState<View>("saida");
  const [registry, setRegistry] = useState<StockOptions>(options);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [item, setItem] = useState<DraftItem>(emptyItem());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>(initialRequests);
  const [balances, setBalances] = useState<StockBalance[]>(initialBalances);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [selected, setSelected] = useState<StockRequest | null>(initialRequests[0] ?? null);
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

  const saldoTotal = useMemo(() => balances.reduce((total, row) => total + row.quantidade, 0), [balances]);

  function navigate(nextView: View) {
    if (nextView === "impressao" && !selected) setSelected(requests[0] ?? null);
    setView(nextView);
  }

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: key === "justificativa" ? value : upper(value) }));
  }

  async function refreshInventory() {
    const response = await fetch("/api/inventory", { cache: "no-store" });
    const payload = (await response.json()) as {
      ok: boolean;
      balances?: StockBalance[];
      movements?: StockMovement[];
    };
    if (payload.ok) {
      setBalances(payload.balances ?? []);
      setMovements(payload.movements ?? []);
    }
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
    setNotice("Salvando requisicao e baixando saldo...");

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
    setRegistry((current) => ({
      clientes: Array.from(new Set([...current.clientes, payload.request!.cliente])).sort(),
      ambientes: Array.from(new Set([...current.ambientes, payload.request!.ambiente])).sort(),
      funcionarios: Array.from(new Set([...current.funcionarios, payload.request!.retiradoPor, payload.request!.responsavelEstoque])).sort(),
      materiais: Array.from(new Set([...current.materiais, ...payload.request!.items.map((row) => row.descricao)])).sort(),
    }));
    await refreshInventory();
    setNotice(`Requisicao ${payload.request.numero} salva. Saldo baixado e impressao pronta.`);
    setView("impressao");
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
          <NavButton active={view === "saida"} icon={<Boxes size={18} />} label="Saida de materiais" onClick={() => navigate("saida")} />
          <NavButton active={view === "historico"} icon={<ClipboardList size={18} />} label="Historico" onClick={() => navigate("historico")} />
          <NavButton active={view === "impressao"} icon={<Printer size={18} />} label="Impressao" onClick={() => navigate("impressao")} />
          <NavButton active={view === "cadastros"} icon={<Settings2 size={18} />} label="Cadastros" onClick={() => navigate("cadastros")} />
          <NavButton active={view === "saldo"} icon={<Warehouse size={18} />} label="Saldo estoque" onClick={() => navigate("saldo")} />
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
            <h1>{titleByView[view]}</h1>
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
            <span>Saldo total</span>
            <strong>{formatQuantity(saldoTotal)}</strong>
            <small>{todayLabel()}</small>
          </article>
        </section>

        {view === "saida" && (
          <div className={`${styles.workspace} ${styles.noPrint}`}>
            <SalidaPanel
              busy={busy}
              form={form}
              item={item}
              items={items}
              notice={notice}
              options={registry}
              onAddItem={addItem}
              onChangeForm={updateForm}
              onChangeItem={setItem}
              onRemoveItem={removeItem}
              onSubmit={submit}
              onPrintLast={() => {
                setSelected(requests[0] ?? null);
                setView("impressao");
                setTimeout(() => window.print(), 100);
              }}
            />
            <HistoryPanel
              filteredRequests={filteredRequests}
              search={search}
              selected={selected}
              setSearch={setSearch}
              onSelect={(request) => {
                setSelected(request);
                setView("impressao");
              }}
            />
          </div>
        )}

        {view === "historico" && (
          <div className={`${styles.singleWorkspace} ${styles.noPrint}`}>
            <HistoryPanel
              filteredRequests={filteredRequests}
              search={search}
              selected={selected}
              setSearch={setSearch}
              onSelect={(request) => {
                setSelected(request);
                setView("impressao");
              }}
              wide
            />
          </div>
        )}

        {view === "cadastros" && (
          <RegistersPanel options={registry} onOptionsChange={setRegistry} />
        )}

        {view === "saldo" && (
          <InventoryPanel
            balances={balances}
            movements={movements}
            options={registry}
            onInventoryChange={(nextBalances, nextMovements) => {
              setBalances(nextBalances);
              setMovements(nextMovements);
            }}
            onOptionsChange={setRegistry}
          />
        )}

        {view === "impressao" && (
          <div className={styles.noPrint}>
            <div className={styles.printActions}>
              <button className={styles.secondary} type="button" onClick={() => setView("historico")}>
                <ClipboardList size={17} />
                Buscar requisicao
              </button>
              <button className={styles.primary} type="button" disabled={!selected} onClick={() => window.print()}>
                <Printer size={17} />
                Imprimir
              </button>
            </div>
          </div>
        )}

        <PrintView request={selected} />
      </main>

      <datalist id="clientes">{registry.clientes.map((value) => <option value={value} key={value} />)}</datalist>
      <datalist id="ambientes">{registry.ambientes.map((value) => <option value={value} key={value} />)}</datalist>
      <datalist id="funcionarios">{registry.funcionarios.map((value) => <option value={value} key={value} />)}</datalist>
      <datalist id="materiais">{registry.materiais.map((value) => <option value={value} key={value} />)}</datalist>
    </div>
  );
}

const titleByView: Record<View, string> = {
  saida: "Requisicao de saida de materiais",
  historico: "Historico de requisicoes",
  impressao: "Impressao da requisicao",
  cadastros: "Cadastros",
  saldo: "Saldo estoque",
};

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? styles.navActive : ""} type="button" onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function SalidaPanel({
  busy,
  form,
  item,
  items,
  notice,
  options,
  onAddItem,
  onChangeForm,
  onChangeItem,
  onRemoveItem,
  onSubmit,
  onPrintLast,
}: {
  busy: boolean;
  form: FormState;
  item: DraftItem;
  items: DraftItem[];
  notice: string;
  options: StockOptions;
  onAddItem: () => void;
  onChangeForm: (key: keyof FormState, value: string) => void;
  onChangeItem: React.Dispatch<React.SetStateAction<DraftItem>>;
  onRemoveItem: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPrintLast: () => void;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <span className={styles.eyebrow}>Novo movimento</span>
          <h2>Dados da retirada</h2>
        </div>
        <span className={styles.notice}>{notice}</span>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <label>
          Cliente ou destino
          <input list="clientes" value={form.cliente} onChange={(event) => onChangeForm("cliente", event.target.value)} required />
        </label>

        <label>
          Ambiente
          <input list="ambientes" value={form.ambiente} onChange={(event) => onChangeForm("ambiente", event.target.value)} required />
        </label>

        <label>
          Tipo de saida
          <select value={form.destino} onChange={(event) => onChangeForm("destino", event.target.value)} required>
            <option value="">Selecione</option>
            <option value="CLIENTE">Cliente</option>
            <option value="FABRICA">Fabrica</option>
            <option value="ESCRITORIO">Escritorio</option>
            <option value="LOJA">Loja</option>
          </select>
        </label>

        <label>
          Funcionario retirando
          <input list="funcionarios" value={form.retiradoPor} onChange={(event) => onChangeForm("retiradoPor", event.target.value)} required />
        </label>

        <label>
          Responsavel do estoque
          <input value={form.responsavelEstoque} onChange={(event) => onChangeForm("responsavelEstoque", event.target.value)} required />
        </label>

        <label className={styles.full}>
          Justificativa da saida
          <textarea value={form.justificativa} onChange={(event) => onChangeForm("justificativa", event.target.value)} required />
        </label>

        <div className={styles.itemBuilder}>
          <label>
            Material
            <input
              list="materiais"
              value={item.descricao}
              onChange={(event) => onChangeItem((current) => ({ ...current, descricao: upper(event.target.value) }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddItem();
                }
              }}
            />
          </label>
          <label>
            Qtd.
            <input value={item.quantidade} onChange={(event) => onChangeItem((current) => ({ ...current, quantidade: event.target.value }))} />
          </label>
          <label>
            Un.
            <input value={item.unidade} onChange={(event) => onChangeItem((current) => ({ ...current, unidade: upper(event.target.value) }))} />
          </label>
          <button className={styles.addButton} type="button" onClick={onAddItem}>
            <PackagePlus size={18} />
            Adicionar
          </button>
        </div>

        <RowsTable items={items} onRemoveItem={onRemoveItem} />

        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={onPrintLast}>
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
  );
}

function RowsTable({ items, onRemoveItem }: { items: DraftItem[]; onRemoveItem: (id: string) => void }) {
  return (
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
                  <button className={styles.iconButton} type="button" onClick={() => onRemoveItem(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistoryPanel({
  filteredRequests,
  search,
  selected,
  setSearch,
  onSelect,
  wide,
}: {
  filteredRequests: StockRequest[];
  search: string;
  selected: StockRequest | null;
  setSearch: (value: string) => void;
  onSelect: (request: StockRequest) => void;
  wide?: boolean;
}) {
  return (
    <section className={styles.panel}>
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
      <div className={wide ? styles.historyWide : styles.history}>
        {filteredRequests.length === 0 ? (
          <div className={styles.emptyCard}>Nenhum registro encontrado.</div>
        ) : (
          filteredRequests.map((request) => (
            <button
              className={selected?.id === request.id ? styles.historyActive : styles.historyCard}
              key={request.id}
              type="button"
              onClick={() => onSelect(request)}
            >
              <strong>{request.numero}</strong>
              <span>{request.cliente} / {request.ambiente}</span>
              <small>{request.data} {request.hora} - {request.items.length} item(ns)</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function RegistersPanel({
  options,
  onOptionsChange,
}: {
  options: StockOptions;
  onOptionsChange: (options: StockOptions) => void;
}) {
  const [active, setActive] = useState<RegisterKey>("funcionarios");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Cadastros usados na saida, entrada e consultas.");

  async function save(action: "add" | "remove", target = value) {
    if (!target.trim() || busy) return;
    setBusy(true);
    const response = await fetch("/api/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: active, value: target, action }),
    });
    const payload = (await response.json()) as { ok: boolean; options?: StockOptions; error?: string };
    setBusy(false);
    if (!payload.ok || !payload.options) {
      setMessage(payload.error ?? "Nao foi possivel salvar cadastro.");
      return;
    }
    onOptionsChange(payload.options);
    setValue("");
    setMessage(action === "add" ? "Cadastro salvo." : "Cadastro removido.");
  }

  return (
    <div className={`${styles.singleWorkspace} ${styles.noPrint}`}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Base comum</span>
            <h2>Cadastros</h2>
          </div>
          <span className={styles.notice}>{message}</span>
        </div>

        <div className={styles.tabs}>
          {(Object.keys(registerLabels) as RegisterKey[]).map((key) => (
            <button className={active === key ? styles.tabActive : ""} type="button" key={key} onClick={() => setActive(key)}>
              {registerLabels[key]}
            </button>
          ))}
        </div>

        <div className={styles.registerForm}>
          <label>
            Novo {registerLabels[active].toLowerCase()}
            <input value={value} onChange={(event) => setValue(upper(event.target.value))} onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save("add");
              }
            }} />
          </label>
          <button className={styles.primary} type="button" disabled={busy} onClick={() => void save("add")}>
            <ListPlus size={17} />
            Salvar cadastro
          </button>
        </div>

        <div className={styles.registryGrid}>
          {options[active].length === 0 ? (
            <div className={styles.emptyCard}>Nenhum cadastro nesta aba.</div>
          ) : (
            options[active].map((row) => (
              <div className={styles.registryRow} key={row}>
                <span>{row}</span>
                <button className={styles.iconButton} type="button" onClick={() => void save("remove", row)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function InventoryPanel({
  balances,
  movements,
  options,
  onInventoryChange,
  onOptionsChange,
}: {
  balances: StockBalance[];
  movements: StockMovement[];
  options: StockOptions;
  onInventoryChange: (balances: StockBalance[], movements: StockMovement[]) => void;
  onOptionsChange: (options: StockOptions) => void;
}) {
  const [tab, setTab] = useState<"saldo" | "entrada">("saldo");
  const [entry, setEntry] = useState({ item: "", quantidade: "", unidade: "UN", observacao: "" });
  const [message, setMessage] = useState("Saidas baixam automaticamente quando a requisicao e salva.");
  const [busy, setBusy] = useState(false);

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      balances?: StockBalance[];
      movements?: StockMovement[];
      error?: string;
    };
    setBusy(false);
    if (!payload.ok || !payload.balances || !payload.movements) {
      setMessage(payload.error ?? "Nao foi possivel salvar entrada.");
      return;
    }
    onInventoryChange(payload.balances, payload.movements);
    onOptionsChange({ ...options, materiais: Array.from(new Set([...options.materiais, upper(entry.item)])).sort() });
    setEntry({ item: "", quantidade: "", unidade: "UN", observacao: "" });
    setMessage("Entrada registrada e saldo atualizado.");
    setTab("saldo");
  }

  return (
    <div className={`${styles.singleWorkspace} ${styles.noPrint}`}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Controle fisico</span>
            <h2>Saldo estoque</h2>
          </div>
          <span className={styles.notice}>{message}</span>
        </div>

        <div className={styles.tabs}>
          <button className={tab === "saldo" ? styles.tabActive : ""} type="button" onClick={() => setTab("saldo")}>Saldo atual</button>
          <button className={tab === "entrada" ? styles.tabActive : ""} type="button" onClick={() => setTab("entrada")}>Informar entrada</button>
        </div>

        {tab === "entrada" && (
          <form className={styles.registerForm} onSubmit={saveEntry}>
            <label>
              Item
              <input list="materiais" value={entry.item} onChange={(event) => setEntry((current) => ({ ...current, item: upper(event.target.value) }))} required />
            </label>
            <label>
              Quantidade
              <input value={entry.quantidade} onChange={(event) => setEntry((current) => ({ ...current, quantidade: event.target.value }))} required />
            </label>
            <label>
              Unidade
              <input value={entry.unidade} onChange={(event) => setEntry((current) => ({ ...current, unidade: upper(event.target.value) }))} required />
            </label>
            <label>
              Observacao
              <input value={entry.observacao} onChange={(event) => setEntry((current) => ({ ...current, observacao: event.target.value }))} />
            </label>
            <button className={styles.primary} type="submit" disabled={busy}>
              <Save size={17} />
              Salvar entrada
            </button>
          </form>
        )}

        <div className={styles.inventoryGrid}>
          <div className={styles.itemsBox}>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Saldo</th>
                  <th>Un.</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr><td colSpan={4} className={styles.empty}>Nenhum saldo cadastrado.</td></tr>
                ) : (
                  balances.map((row) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td className={row.quantidade < 0 ? styles.negative : ""}>{formatQuantity(row.quantidade)}</td>
                      <td>{row.unidade}</td>
                      <td>{new Date(row.updatedAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.movements}>
            <h3>Movimentos recentes</h3>
            {movements.slice(0, 20).map((row) => (
              <div className={styles.movementRow} key={row.id}>
                <strong>{row.tipo} - {row.item}</strong>
                <span>{formatQuantity(row.quantidade)} {row.unidade} / {row.origem}</span>
                <small>{row.data} {row.hora}</small>
              </div>
            ))}
            {movements.length === 0 && <div className={styles.emptyCard}>Nenhum movimento registrado.</div>}
          </div>
        </div>
      </section>
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
