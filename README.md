# Central de clientes

Cadastro interno das lojas. Esta pasta é um repositório separado do ERP.

Banco, SMTP e tokens Focus já preenchidos no `.env` de cada loja são lidos para a ficha neste computador. O arquivo `src/private-env.ts` fica de fora do git, então a build da Vercel sobe sem essas senhas.

| Loja | Pasta | Status inicial |
|---|---|---|
| Mix Parfum | `ERPOnlyPy-Demo` | Homologação |
| Hara Perfumes | `ERPOnlyPy` | Em produção |
| Tabacaju | `ERPOnlyPy-ylcfqm` | Em andamento |
| ELO | `ERPOnlyPy-Elo` | Não iniciado |

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, a ficha fica neste navegador. Com as duas variáveis, os sócios entram com e-mail e senha e veem a mesma ficha. A chave `service_role` não entra no site.

No projeto Supabase novo da Central (não no banco de uma loja), rode `supabase/migrations/20261016000000_clients.sql` no SQL Editor. Em Authentication, deixe o e-mail ligado, desligue o cadastro público e crie os dois usuários. Em Vercel, grave as duas variáveis em Production e faça um Redeploy.

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
