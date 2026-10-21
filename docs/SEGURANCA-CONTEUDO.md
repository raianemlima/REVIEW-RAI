# Proteção do conteúdo e senha compartilhada do baralho (S2)

## O problema, sem rodeios
O baralho (`deck.enc`) é público e cifrado com **uma senha só**, entregue pelo Supabase (`chave_do_app`) a toda conta liberada. Quem assina recebe a senha no aparelho e pode, tecnicamente, repassá-la ou publicar o conteúdo decifrado.

**Não existe correção técnica que impeça isso no navegador.** Qualquer conteúdo que o app mostra ao assinante já está decifrado no aparelho dele. O que se controla é: quem recebe a chave, por quanto tempo, e se o abuso pode ser **detectado** e **respondido**.

Dois limites que a rotação de senha não resolve:
- O repositório é público: versões antigas do `deck.enc` ficam no histórico do Git e continuam abrindo com a senha antiga. Trocar a senha protege as versões **futuras**, não as já vazadas.
- Um assinante que já baixou o conteúdo continua com ele depois de cancelado.

## O que já existe
- Chave só para conta com e-mail confirmado e assinatura em dia (`chave_do_app`).
- Cadastro bloqueado para e-mails sem liberação (gatilho em `auth.users`).
- A chave guardada no aparelho vale 7 dias offline, fica presa ao UID da conta e é apagada se o Supabase nega o acesso.
- Os Termos de Uso (`termos.html`) proíbem compartilhar conta, senha e redistribuir o conteúdo.

## O que a parte 6 do `seguranca.sql` acrescenta
1. **Registro de entregas da chave** (`public.chave_acessos`): data, UID, IP e navegador de cada vez que a chave é entregue. A regra de quem recebe a chave **não muda** (há um teste que compara com a da parte 2). O registro nunca bloqueia a entrega: se falhar, a chave é entregue do mesmo jeito.
2. **Consulta de detecção** (comentada no arquivo): contas que pediram a chave de muitos IPs ou navegadores em 30 dias.
3. **Retenção** (comentada): apagar registros antigos.

### Como usar
1. Leia a seção "Privacidade" abaixo e atualize a Política de Privacidade **antes** de rodar.
2. No SQL Editor, rode o passo 6.1, depois o 6.2, e confira que o app ainda abre com uma conta liberada (entre numa conta de teste e veja se o baralho carrega).
3. De tempos em tempos, rode a consulta 6.3. Ela é um **indício**: quem usa dados móveis troca de IP. Olhe também a quantidade de entregas e o intervalo entre elas.
4. Caso confirmado: fale com o aluno e, se for o caso, corte o acesso: `update public.liberados set valido_ate = now() where email = 'aluno@exemplo.com';`. O app apaga a chave dele na próxima verificação.

### Se a rollback for necessária
Para voltar ao comportamento anterior sem perder o registro, recrie a função como na parte 2 do `seguranca.sql` (versão `language sql stable`). A tabela `chave_acessos` pode ficar.

## Rotação da senha do baralho
Faça quando houver suspeita de vazamento da senha, ou em intervalos que você definir.
1. Gere o baralho com a senha nova, a partir do arquivo-fonte (fora do repositório): `SENHA='nova-senha' node build.mjs caminho/fonte.html index.html`.
2. Atualize a senha em `public.chave_app` no Supabase **no mesmo momento** da publicação. Entre a troca no banco e a publicação do site, o app pode mostrar "a chave do app no servidor não confere".
3. Aumente `CACHE` em `sw.js` e `APP_CACHE` em `gate.js` (e no gate embutido em `index.html`).
4. Contas liberadas recebem a chave nova sozinhas ao abrir o app com internet.

## Privacidade (leia antes de rodar a parte 6)
O registro guarda **IP e navegador ligados à conta**, que são dados pessoais. Antes de ativar:
- `privacidade.html` (seção "Registro de acesso ao conteúdo") e o item 9 de `termos.html` já descrevem a coleta, a finalidade (segurança e detecção de compartilhamento de conta) e o prazo de retenção de 180 dias. **São textos-base, escritos por IA: revise com quem cuida da conformidade LGPD do projeto antes de ativar.** Se mudar o prazo, mude também o passo 6.4 e a política.
- O item 15 dos Termos promete avisar por e-mail ou no app **antes** de mudanças relevantes valerem. Avise os assinantes antes de ativar a parte 6.
- Combine o prazo do passo 6.4 com o que a política disser.

## Alternativas que **não** foram implementadas
- **Entrega do conteúdo por usuário, pelo servidor** (em vez de um `deck.enc` público): permitiria cortar o acesso de verdade para o futuro, mas muda a arquitetura (armazenamento autenticado, offline mais complexo) e ainda não impede cópia por quem já tem acesso.
- **Marca d'água com o e-mail** nos arquivos que o app gera (caderno em PDF e Word): identifica a origem de um vazamento, mas só cobre o que o app exporta, não os PDFs protegidos nem a tela.
- **Limite de aparelhos por conta:** exige identificar o aparelho com confiabilidade, o que o navegador não garante.
