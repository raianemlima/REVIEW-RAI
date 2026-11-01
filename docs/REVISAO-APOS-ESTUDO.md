# Revisão depois do estudo

Os cartões são de **revisão**. Um cartão novo só entra na revisão diária (Hoje, bloco de foco, sessão relâmpago e intercalada) depois que o assunto dele foi estudado.

## Como funciona

1. Em **Ajustes → Direcionamento do estudo**, escolha **Defensoria (DPE)** ou **Tribunal (TJPB)**. O padrão é Defensoria.
2. No **Cronograma**, depois de estudar um assunto, marque **Estudei este assunto**. A caixa aparece no card "assuntos de hoje" em Hoje e em cada bloco da semana do ciclo, para registrar também o que você já estudou antes.
3. Os cartões ligados àquele assunto passam a entrar na revisão, respeitando a meta diária, o tempo e o teto de cartões novos de Ajustes. O app avisa quantos entraram.

Cada bloco do Cronograma mostra quantos cartões o assunto libera ("Ao marcar, N cartões novos entram na revisão") ou quantos já estão na revisão.

## Direção

- **Tribunal (TJPB):** valem os assuntos marcados no edital do TJPB 2026.
- **Defensoria (DPE):** valem os assuntos marcados nos editais de Defensoria do Cronograma (DPE/RN, DPDF e os demais).

Um assunto marcado no edital da outra direção fica registrado. Ele libera cartões quando você troca a direção em Ajustes.

## O que não muda

- Cartões que já estavam na revisão seguem o FSRS nas datas marcadas, em qualquer direção.
- Meus cartões (criados por você) sempre entram.
- Escolhas explícitas continuam livres: estudar uma lei na Lei seca, sessão por tema, jurisprudência, provas, simulado e treino de 2ª fase.
- Desmarcar "Estudei este assunto" tira da revisão só os cartões ainda não vistos daquele assunto.

## Ligação assunto → cartões

É a mesma correspondência automática que o Cronograma usa em "No app para este assunto": tema e texto do cartão contra o título e o texto do item do edital, dentro da disciplina, e a lei citada no item. Como é uma correspondência e não uma curadoria, um assunto pode liberar poucos cartões ou nenhum. A contagem no bloco mostra isso antes de marcar.

Código: `cartoesDoAssunto` em `arquivos/cronograma-motor.js`; `DPE_CARTOES_LIBERADOS` e "Estudei este assunto" em `arquivos/cronograma.js`; o filtro dos cartões novos em `plan()` no `app-src.txt`. Testes: `tests/revisao-apos-estudo.test.mjs`.
