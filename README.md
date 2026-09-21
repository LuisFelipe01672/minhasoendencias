# Minhas Pendências

App pessoal de calendário, pendências e notas — PWA (instalável no
celular, sem loja de aplicativo), pra um único usuário. Projeto
**standalone**: sem nenhuma ligação com o InsightERP/Grupo GS (domínio,
backend, marca — nada é compartilhado), feito pra ser usado por alguém
fora da empresa.

Mesmo conceito do app interno equivalente do grupo, só que simplificado:
sem sincronização com Outlook, sem múltiplos usuários/admin — e **100%
client-side**: sem servidor, sem VPS, sem custo de hospedagem nenhum.

## Stack

HTML/CSS/JS puro (vanilla, ES modules nativos), **sem backend, sem build,
sem dependência nenhuma**. Os dados ficam guardados no próprio navegador
da pessoa, via IndexedDB — nada é enviado pra lugar nenhum.

Essa é a segunda versão deste projeto: a primeira era FastAPI + SQLite,
rodando num container Docker; foi reescrita pra 100% client-side porque o
app é uso de uma pessoa só, e manter um servidor/VPS rodando só pra isso
não valia a pena.

## Rodando localmente

Não precisa de servidor de verdade — qualquer servidor estático serve.
Exemplo simples (Python já vem com um embutido):

```powershell
cd C:\projetos\minhas-pendencias
python -m http.server 8000
```

Abra `http://localhost:8000/`. Na primeira vez, o app pede pra você criar
uma senha (fica salva só nesse navegador).

**Não pode abrir `index.html` direto como arquivo (`file://`)** — Service
Worker e alguns recursos do PWA não funcionam nesse esquema; precisa ser
servido por HTTP, mesmo que localhost.

## Como os dados são guardados

Tudo fica no **IndexedDB do navegador** (`js/db.js`), duas coleções:
`pendencias` e `notas` — equivalente às duas tabelas do banco da versão
anterior, só que vivendo inteiramente no aparelho da pessoa.

**Isso tem um trade-off importante, aceito de propósito**: não existe
nenhum backup automático. Se a pessoa limpar os dados do navegador, trocar
de celular ou desinstalar o app, os dados somem — sem jeito de recuperar.
Mitigação: a aba **💾 Backup** no cabeçalho exporta um arquivo `.json` com
tudo (pendências + notas), que pode ser reimportado depois (inclusive num
navegador/celular diferente). Vale exportar de vez em quando e guardar
esse arquivo em algum lugar (e-mail pra si mesmo, Google Drive, etc.) —
isso não é feito automaticamente, é uma ação manual.

## Senha — leia isto antes de confiar nela

A tela de senha (`js/auth.js`) é só um **freio local**, não segurança de
verdade: como o app inteiro roda no navegador da própria pessoa, sem
nenhum servidor validando nada, qualquer um com acesso ao DevTools
contorna isso facilmente (é só apagar uma chave do `localStorage`). Serve
pra evitar abrir o app sem querer, não pra proteger dados sensíveis de
alguém com acesso físico ao aparelho.

## PWA — instalando no celular

`manifest.json` + `sw.js` tornam o app instalável, e agora **funciona
100% offline** depois da primeira visita (o app inteiro é cacheado pelo
service worker — antes só os arquivos estáticos eram cacheados, porque as
páginas vinham de um servidor; agora não tem servidor nenhum, então dá pra
cachear tudo).

Pra instalar de verdade, o navegador exige **HTTPS num domínio público**
(não funciona só com `localhost` fora de testes) — ver "Deploy" abaixo.
No Chrome/Android, depois de aberto no domínio final, aparece um prompt
"Instalar app" (ou menu → "Adicionar à tela inicial").

## Deploy — GitHub Pages (conta pessoal do usuário)

Decidido: hospedar de graça no GitHub Pages, **na conta pessoal do
usuário**, não a do Grupo GS — por isso **eu (Claude Code) não posso
fazer o deploy sozinho**: não tenho (nem devo usar) credenciais da conta
pessoal dele; as credenciais Git configuradas neste ambiente são da
organização do Grupo GS, de propósito não usadas aqui.

Passos (o usuário faz, ou me dá acesso explícito pra fazer em nome dele):

1. Criar um repositório novo (pode ser público — só tem código do app
   aqui, nenhum dado pessoal; os dados ficam só no navegador de quem usa)
   na conta pessoal do GitHub.
2. Subir o conteúdo desta pasta pra esse repositório:
   ```powershell
   git init
   git add .
   git commit -m "Primeira versão"
   git remote add origin <URL do repositório pessoal>
   git push -u origin main
   ```
3. No GitHub, ir em **Settings → Pages** do repositório e escolher a
   branch (`main`) como fonte do Pages.
4. O app fica disponível em `https://<usuario>.github.io/<repositorio>/`
   (HTTPS automático, sem custo, sem manutenção de servidor nenhuma).

Se o schema do `manifest.json`/caminhos relativos (`./css/...`,
`./js/...`) estiverem certos, funciona tanto na raiz de um domínio quanto
num subcaminho de projeto do GitHub Pages sem ajuste nenhum.
