# Central de clientes

Cadastro interno das lojas. Esta pasta é um repositório separado do ERP.

Banco, SMTP e tokens Focus já preenchidos no `.env` de cada loja são lidos para a ficha. O arquivo `src/private-env.ts` fica de fora do git.

| Loja | Pasta | Status inicial |
|---|---|---|
| Mix Parfum | `ERPOnlyPy-Demo` | Homologação |
| Hara Perfumes | `ERPOnlyPy` | Em produção |
| Tabacaju | `ERPOnlyPy-ylcfqm` | Em andamento |
| ELO | `ERPOnlyPy-Elo` | Não iniciado |

Senhas, tokens Focus e o arquivo do certificado não são copiados para cá. O status fica no navegador (`localStorage`) até existir o projeto Supabase da Central.

```powershell
npm install
npx playwright install chromium
npm run dev
```

Em outro terminal, na mesma pasta, deixe o gerador ligado. Ele só escuta neste computador:

```powershell
python scripts/bridge.py
```

Abra http://127.0.0.1:5173. Novo cliente grava a ficha e a pasta `C:\Users\Thnet\Desktop\SaaSProjects\clientes\<nome>`. O zip e o executável saem depois que host, usuário, senha, porta e nome do banco estão na ficha. Lojas que já existem usam Empacotar, sem migração. Conferir o app é Abrir app, na pasta da loja, sem rodar o instalador.

Testes: `npm run test:e2e`
