# NX Estoque - Saida de Materiais

Sistema Nexora para registrar requisicoes de saida de materiais, gerar historico e imprimir duas vias para assinatura.

## Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000/estoque`.

## Producao

O app usa Next.js com `output: "standalone"` e salva registros em `data/stock-requests.json`.

### Docker

```bash
docker compose -f compose.production.yml up -d --build
```

Porta padrao do container: `3017`.
