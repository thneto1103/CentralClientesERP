# Central de clientes

Cadastro interno das lojas. Esta pasta é um repositório separado do ERP.

Banco, SMTP e tokens Focus já preenchidos no `.env` de cada loja são lidos para a ficha neste computador. O arquivo `src/private-env.ts` fica de fora do git, então a build da Vercel sobe sem essas senhas.

| Loja | Pasta | Status inicial |
|---|---|---|
| Mix Parfum | `ERPOnlyPy-Demo` | Homologação |
| Hara Perfumes | `ERPOnlyPy` | Em produção |
| Tabacaju | `ERPOnlyPy-ylcfqm` | Em andamento |
| ELO | `ERPOnlyPy-Elo` | Não iniciado |

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, a ficha fica neste navegador. Com as duas variáveis, cada pessoa entra com e-mail e senha. A chave `service_role` não entra no site.

No projeto Supabase novo da Central (não no banco de uma loja), rode no SQL Editor, nesta ordem:

1. `supabase/migrations/20261016000000_clients.sql`
2. `supabase/migrations/20261027000000_access.sql`

O segundo script marca `thneto1103@gmail.com` como sócio. Essa conta já precisa existir em Authentication. Desligue o cadastro público. Em Vercel, grave as duas variáveis em Production e faça um Redeploy.

Sócio vê todas as lojas, cria usuários e concede ou retira lojas de um vendedor. Vendedor vê e edita só as lojas autorizadas, inclusive senha do banco e tokens, e a loja que ele cria já fica autorizada. Ninguém altera o próprio nível, e sempre resta um sócio.

Para criar usuário pela aba Usuários, publique a função com a CLI do Supabase, no projeto da Central:

```powershell
supabase functions deploy create-user
supabase functions deploy reminders
```

O aviso de pagamento, entrega e certificado sai no dia anterior, para quem pode ver a loja. Ele fica desligado até a função `reminders` ter os segredos `RESEND_API_KEY` e `REMINDER_FROM`. No painel, agende essa função todo dia às 11:00 UTC. Sem esses segredos, o resto da Central continua igual.

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
