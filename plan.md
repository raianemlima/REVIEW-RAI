# Continuidade aprovada — metacognição

## Escopo

Restaurar e melhorar a metacognição na branch de continuidade `manus/restaurar-metacognicao`, baseada em `claude/dpe-spaced-review-app-1h0ks9` (`77a7af9`). Preservar o visual atual, HTML/CSS/JavaScript, o motor FSRS-4.5, o conteúdo cifrado, o esquema dos registros de revisão, o backup e as integrações existentes. Sem redesign, migração de serviços, merge em `main` ou publicação.

## Implementação

Recuperar `arquivos/metacognicao.js` do histórico e corrigir sua integração com o aplicativo, publicação e cache offline. A publicação deve falhar claramente se uma dependência obrigatória estiver ausente.

A sessão terá planejamento opcional, monitoramento por confiança versus resultado e reflexão opcional ao terminar. O estudante poderá pular ou desativar o planejamento e reativá-lo nas estatísticas. Modos cronometrados não terão uma etapa inicial que consuma seu tempo. Planos e reflexões continuarão salvos em `S.ajustes`, com limites de histórico e merge entre aparelhos.

Usar linguagem didática e proporcional à evidência. Um acerto com confiança não será chamado de domínio consolidado. Remover o percentual simplificado chamado de calibração científica; apresentar contagens, origem do resultado e limites da amostra. Separar correção com gabarito (múltipla escolha/certo ou errado) de autoavaliação (cartões abertos e lacunas de correção aproximada). Manter os registros antigos legíveis e o formato de histórico `calib` compatível.

O motor FSRS seguirá usando as notas de revisão já existentes; confiança não substituirá a nota ou comandará mudanças de algoritmo nesta etapa. Informações metacognitivas não serão usadas para prometer aprovação, diagnosticar capacidade ou estabelecer domínio por uma tentativa isolada.

## Estrutura

- `index.html`: lógica e interface existentes; integração pontual e explicação do histórico de confiança.
- `arquivos/metacognicao.js`: ciclo Antes/Durante/Depois, objetivos, resultados e reflexões.
- `sw.js`: versão e arquivos obrigatórios offline.
- `ferramentas/ci/`: validação da pasta publicada e integração dos módulos.
- `tests/`: testes com dados fictícios e nenhuma chamada a serviços de produção.
- `package.json`: ferramentas de teste de desenvolvimento; não muda a execução estática do aplicativo.
- `docs/METACOGNICAO.md`: uso, limites dos indicadores e instruções para executar os testes.

## Design

Reutilizar integralmente cores, tipografia, componentes e identidade do aplicativo atual. Os painéis metacognitivos usarão as variáveis CSS existentes, serão responsivos e terão campos rotulados, estados acessíveis e textos curtos. Não serão adicionadas imagens ou ilustrações decorativas.

## Restrições operacionais

O repositório é externo e não está vinculado a um projeto gerenciado do Manus. Os diagnósticos gerenciados não estão disponíveis nesta sessão; usar verificações nativas de JavaScript e testes automatizados antes da entrega, sem migrar o projeto apenas para ativar infraestrutura. Testes usarão conteúdo fictício, sem senha do baralho, sem login de estudantes e sem gravar em produção. As pesquisas fornecidas orientam o produto, mas seus resultados quantitativos não foram validados independentemente.
