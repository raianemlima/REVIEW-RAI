# Sincronizar o progresso entre notebook e celular

O app guarda o progresso no aparelho. Para ver o **mesmo progresso nos dois**, ligue a sincronização: os dados vão para um **repositório privado seu no GitHub** (sem servidor de terceiros e sem custo).

## Configurar (uma vez só)
**No notebook**
1. No GitHub, crie um repositório **privado** e vazio, por exemplo `revisao-dpe-dados`.
2. **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.**
   - Em *Repository access*, escolha **Only select repositories** e marque só `revisao-dpe-dados`.
   - Em *Permissions → Repository permissions*, deixe **Contents: Read and write**.
   - Gere e copie o token (começa com `github_pat_`).
3. No app: **Ajustes → Sincronizar entre aparelhos**. Digite `seu-usuario/revisao-dpe-dados`, cole o token e toque em **Conectar e sincronizar**.
4. Toque em **Copiar código para outro aparelho**.

**No celular**
5. Abra o app, vá em **Ajustes → Sincronizar entre aparelhos**, cole o código no campo "Ou cole o código de conexão" e toque em **Usar o código**.

Pronto: o celular recebe tudo o que está no notebook.

## Como funciona no dia a dia
- A sincronização roda **sozinha** ao abrir o app, ao terminar uma sessão, ao sair do app e quando a internet volta. Também há o botão **Sincronizar agora**.
- O progresso é **mesclado**: o que você estudou em um aparelho nunca é apagado pelo outro.
  - **Cartões:** vale a revisão mais recente de cada cartão.
  - **Histórico de respostas, conquistas, caderno de erros, desafios e leituras de novidades:** os dois lados são somados.
  - **Anotações e cartões próprios:** os dois lados são somados.
  - **Preferências de estudo** (data da prova, minutos por dia): vale a que foi alterada por último.
  - **Não sincronizam** (cada aparelho tem a sua): sons, vibração, lembrete diário e o aviso de instalação.
- Sem internet, o app funciona normalmente e sincroniza quando a conexão volta.

## Segurança
- O repositório **precisa ser privado**. O app recusa conectar se ele for público.
- O **token fica só no aparelho** e dá acesso apenas a esse repositório. Ele **não** vai no backup nem no arquivo sincronizado.
- O **código de conexão contém o token**: envie só para você mesma e não compartilhe. Se vazar, apague o token no GitHub e gere outro.
- No GitHub, o arquivo `progresso.json` guarda apenas dados de estudo (ids dos cartões, datas e suas anotações). O conteúdo do baralho **não** vai para lá.

## Limites
- **Apagar um cartão próprio** em um aparelho não o apaga no outro (ele pode voltar na próxima sincronização).
- Se você **restaurar um backup antigo** com a sincronização ligada, os dois lados são mesclados, e o progresso novo não some.
- O token pode ter prazo de validade. Se aparecer "Token inválido ou expirado", gere outro e conecte de novo.
- Para trocar de conta ou repositório, use **Desconectar** e conecte outra vez.
