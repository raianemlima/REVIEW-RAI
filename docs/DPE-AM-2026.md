# DPE/AM 2026 · Analista Jurídico de Defensoria (servidor)

O que o app tem do **Edital nº 01/2026 da Defensoria Pública do Estado do Amazonas** (VI Concurso de servidores, banca Fundação Carlos Chagas) e como cada parte foi obtida. O recorte é o **cargo R, Analista Jurídico de Defensoria – Ciência Jurídica**; os demais cargos (A a Q) não foram incluídos.

## No app

| Onde | O quê | Fonte |
|---|---|---|
| **Cronograma** › "DPE/AM · Analista Jurídico (servidor) · Edital 1/2026" (`am-2026-servidor`) | 11 rubricas e 173 assuntos: 3 de Conhecimentos Gerais e 8 dos Específicos do cargo R, cada assunto com o texto do edital e a página do PDF | Anexo II do edital (PDF, páginas 30 e 43 a 47) |
| **Cronograma** › sugestão de percentuais | Perfil por questões: 20 Gerais e 40 Específicas | Item 7.1 do edital |
| **Plano estratégico** (`plano-dpeam-2026.html`) | Regras do edital e consequências, simulador da nota, mapa do programa, fases datadas até 07/03/2027, piloto de 4 semanas, diagnóstico por disciplina, checklist de datas | Itens 4, 7 a 13 e Anexos II a IV |

O programa tem `cargo: "servidor"`, então fica **fora do relatório de frequência dos editais de Defensor** (aba Progresso). Os cartões e a revisão espaçada seguem a regra geral: um cartão novo só entra depois de marcar "Estudei este assunto" no Cronograma.

## A regra da nota

O item 9.2 define a nota como a média ponderada das notas de Conhecimentos Gerais (peso 1) e de Específicos (peso 2), cada uma de 0 a 10. Como cada nota é medida sobre o próprio número de questões (20 e 40), a conta se reduz a `(acertos Gerais + acertos Específicos) ÷ 6`: **toda questão vale o mesmo**, e os Específicos respondem por 40/60 da nota, não por 80%.

Por isso o perfil de pesos usa `tipo: "questoes"` (como o TJPB) e não "pontos" (como a DPDF), em que o valor é questões × peso. Nota mínima de 6,00 (item 9.3) equivale a **36 acertos em 60**, supondo conversão linear para a escala 0 a 10; o edital não detalha a fórmula. Os testes fixam essa aritmética em `tests/plano-dpeam-2026.test.mjs` e `tests/cronograma-percentuais.test.mjs`.

O edital não divide as 20 questões gerais entre as três rubricas nem as 40 específicas entre as oito. A divisão igual (6,67 e 5 questões) é **hipótese de tempo, não peso oficial**, e está dita assim na `nota` do perfil.

## Limites conhecidos

- **Blocos sem numeração.** Os Conhecimentos Gerais e o bloco de Criança e Adolescente, Idoso, Pessoa com Deficiência e Mulher não têm itens numerados. Cada tópico de Conhecimentos Gerais é uma frase do edital, e o último bloco segue as quatro seções rotuladas pelo próprio edital. O texto é o do edital; a divisão em tópicos é editorial.
- **Numeração anômala em Direito Processual Civil.** O item 6 aparece duas vezes e a sequência pula do 12 para o 14. O texto mantém a numeração impressa.
- **Direito Penal, item 9 desdobrado.** O item reúne teoria da pena, crimes em espécie e legislação penal especial. Foi dividido em três tópicos com o texto literal, para caber em blocos de estudo.
- **Números de lei que parecem errados no edital.** A Lei de Drogas aparece como "Lei nº 15.343/06" e o abuso de autoridade como "Lei nº 16.869/2019"; as normas com esses nomes são a Lei nº 11.343/2006 e a Lei nº 13.869/2019. O catálogo preserva o texto impresso e registra o aviso em `lacunas`. Confirme em eventual retificação.
- **Marco temporal.** Vale a legislação e a jurisprudência vigentes até a publicação do edital (item 13.2). A data exata de publicação não consta do texto recebido (arquivo revisado em 30/10/2026; impugnação em 03 e 04/11/2026).
- **Cronograma sujeito a alteração.** As datas do plano vêm do Anexo III e podem mudar; confira o site da banca. O plano exibe as datas como "previstas".
- **Localizador de página.** O número impresso no rodapé do Anexo II reinicia na página 1, então o localizador é a página do arquivo PDF (`Edital nº 01/2026 – DPE/AM, Anexo II, PDF p. N`).
- **Vagas.** O cargo R tem 1 vaga imediata em Itacoatiara e cadastro de reserva nos 12 polos; o corte de classificação é a 30ª posição por polo (40ª nas cotas).
- **Resumos por matéria.** O botão **Ler o resumo** do Cronograma depende do campo `editais` de cada e-book selado (veja [Resumos por matéria](RESUMOS-POR-MATERIA.md)), e este edital não está nesse mapa. Nos assuntos dele o botão e o aviso "sem resumo" não aparecem, sem erro. Os e-books continuam abrindo normalmente pela Biblioteca. Ligar os assuntos exige regenerar os e-books com o material pessoal do Drive (`ferramentas/conteudo/drive/`), que não faz parte do repositório.
- **Fora do escopo.** Programas dos cargos A a Q.

## Atualizar

Com o PDF do edital (ou de uma retificação):

```bash
python3 -I ferramentas/conteudo/dpeam/extrair_dpeam.py edital.pdf saida/dpeam.json
node ferramentas/conteudo/dpeam/inserir_dpeam.mjs . saida/dpeam.json
```

O extrator exige `pdftotext` (poppler) e usa `-layout`: sem isso o poppler apaga o hífen no fim da linha ("DPE-" + "AM" virava "DPEAM"). Se o edital for retificado, `inserir_dpeam.mjs` recusa inserir por cima; remova antes o programa `am-2026-servidor` de `arquivos/cronograma-conteudo.js` e de `arquivos/cronograma-pesos.js`. Depois aumente a versão do cache em `sw.js`, `gate.js` e `index.html` (`CACHE` e `APP_CACHE`) e rode `npm test`.
