# Visão limpa: por onde começar

O app tem muitos recursos. Para o aluno não se perder, as telas mostram primeiro o caminho e recolhem o resto. A organização fica em `arquivos/organizacao.js` e só reorganiza o que as outras partes já desenharam: os mesmos botões, as mesmas ações, nenhuma regra de estudo nova.

## Hoje: três passos

1. **Estude o assunto de hoje**: o assunto do Cronograma, com "Estudar os trechos doutrinários", lei seca, materiais e **Estudei este assunto**. Sem cronograma, o passo é **Monte seu cronograma**.
2. **Revise os cartões**: quantos cartões há no próximo bloco, o tempo e a meta; **Começar revisão** ou **Hoje, só 5 cartões**. Só entram cartões de assunto já estudado (veja [Revisão depois do estudo](REVISAO-APOS-ESTUDO.md)).
3. **Pratique com questões (opcional)**: abre Estudar.

O passo atual fica destacado e o concluído ganha ✓; quando o assunto de hoje está estudado, o conteúdo dele fica recolhido ("Ver o assunto de hoje") para o passo 2 aparecer. No topo, a direção do estudo troca em um toque: **Defensoria** ou **Tribunal · TJPB**.

Todo o resto (ajuste da meta diária, sua semana, fila de revisão, reflexão, progresso, recursos, instalar no celular, explorar disciplinas) fica em **Mais**, recolhido. O aviso de backup continua à vista.

## Estudar

- **Ler e aprender** mostra Aprofundamento (com o conteúdo específico), Lei seca e Informativos; os demais materiais ficam em "Mais materiais de leitura". Tribunal aparece na direção Tribunal.
- Os modos ainda sem conteúdo ("Sem cartões ainda") ficam em "Modos que liberam conforme você estuda".
- Sem nenhum erro registrado, a seção "Consertar os erros" some.
- Sem cartões para revisar, o quadro "Próximo bloco" some: o caminho está em Hoje.

## Barra de navegação

Hoje · Estudar · Biblioteca · Lei seca · Progresso, e Tribunal na direção Tribunal. Informativos, Defensoria e Teses continuam em Estudar → Ler e aprender; abertos por lá, a barra marca Estudar.

## Atualização do app instalado

Na publicação, `ferramentas/ci/carimbar_cache.mjs` acrescenta ao nome do cache (`review-dpe-assuntos-vNN`) um carimbo tirado do conteúdo publicado. Antes, duas mudanças que subiam a versão para o mesmo número publicavam com o mesmo cache, e o aparelho que abriu o app entre as duas ficava na versão anterior. Agora qualquer mudança no que é publicado gera um nome novo, e o app instalado recebe a atualização.
