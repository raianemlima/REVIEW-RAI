# Visão limpa: por onde começar

O app tem muitos recursos. Para o aluno não se perder, as telas mostram primeiro o caminho e recolhem o resto. A organização fica em `arquivos/organizacao.js` e só reorganiza o que as outras partes já desenharam: os mesmos botões, as mesmas ações, nenhuma regra de estudo nova.

## Hoje: próximo passo e três passos

No topo: a direção do estudo (**Defensoria** ou **Tribunal · TJPB**, troca em um toque), os contadores com legenda (**🎯 N dias para a prova**, **🔥 N dias seguidos**) e o progresso do dia ("Hoje: 1 de 2 assuntos estudados · 4 de 10 cartões revisados").

Logo abaixo, o **Próximo passo**: um único botão para o que fazer agora.

- Assunto pendente hoje: o botão principal dele (normalmente **📖 Ler os trechos (N)**) e **✓ Já estudei: marcar**, que marca o assunto e passa ao próximo.
- Assuntos estudados: **Começar revisão** (ou **Retomar a revisão** com um bloco aberto).
- Tudo feito: **Praticar questões**.
- Sem cronograma, não aparece: o passo 1 já é o próximo passo.

Depois, o roteiro:

1. **Estude o(s) assunto(s) de hoje**: cada assunto do Cronograma é uma tarefa com botões diretos: **📖 Ler os trechos (N)** (abre o Aprofundamento no ponto do assunto), **⚖️ Lei seca** (só a lei da disciplina ou a citada no edital), **❓ Questões (N)** e **Marcar como estudado**. Quando não há nada ligado ao assunto, o botão é **🔎 Buscar o assunto no app**: nenhum assunto fica sem caminho. O resto (materiais, cartões, súmulas) fica em "Ver tudo sobre o assunto". Sem cronograma, o passo é **Monte seu cronograma**.
2. **Revise os cartões**: quantos cartões há no próximo bloco, o tempo e a meta; **Começar revisão** ou **Hoje, só 5 cartões**. Só entram cartões de assunto já estudado (veja [Revisão depois do estudo](REVISAO-APOS-ESTUDO.md)).
3. **Pratique com questões (opcional)**: abre Estudar.

O passo atual fica destacado e o concluído ganha ✓; quando os assuntos de hoje estão estudados, o conteúdo deles fica recolhido ("Ver o assunto de hoje") para o passo 2 aparecer. No celular, os passos usam a largura toda.

Todo o resto (ajuste da meta diária, sua semana, fila de revisão, reflexão, progresso, recursos, instalar no celular, explorar disciplinas) fica em **Mais**, recolhido. O aviso de backup continua à vista.

## Estudar

- **Ler e aprender** mostra Aprofundamento (com o conteúdo específico), Lei seca e Informativos; os demais materiais ficam em "Mais materiais de leitura". Tribunal aparece na direção Tribunal.
- Os modos ainda sem conteúdo ("Sem cartões ainda") ficam em "Modos que liberam conforme você estuda".
- Sem nenhum erro registrado, a seção "Consertar os erros" some.
- Sem cartões para revisar, o quadro "Próximo bloco" some: o caminho está em Hoje.

## Barra de navegação

Hoje · **Plano** (o Cronograma) · Estudar · Biblioteca · Lei seca · Progresso, e Tribunal na direção Tribunal. Informativos, Defensoria e Teses continuam em Estudar → Ler e aprender; abertos por lá, a barra marca Estudar.

## Atualização do app instalado

Na publicação, `ferramentas/ci/carimbar_cache.mjs` acrescenta ao nome do cache (`review-dpe-assuntos-vNN`) um carimbo tirado do conteúdo publicado. Antes, duas mudanças que subiam a versão para o mesmo número publicavam com o mesmo cache, e o aparelho que abriu o app entre as duas ficava na versão anterior. Agora qualquer mudança no que é publicado gera um nome novo, e o app instalado recebe a atualização.
