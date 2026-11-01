# DPE/RN · III Concurso de Defensor Público

O que o app tem da DPE/RN e de onde veio cada parte.

## No app

| Onde | O quê | Fonte |
|---|---|---|
| **Cronograma** › edital "DPE/RN · III Concurso · Regulamento (Res. 344/2025)" (`rn-2025`) | 12 matérias do regulamento, 206 itens do Anexo I e o quadro da prova objetiva (4 grupos de 25 questões) | Resolução nº 344/2025 do CSDPE/RN, DOE nº 15.871 (15/03/2025) |
| **Provas** › Resolver no app › "DPE-RN 2015" | 100 questões com o gabarito definitivo; as anuladas (14, 35, 37 e 97) ficam fora do placar | Prova objetiva e gabarito definitivo do Cespe/Cebraspe (aplicação em 13/12/2015) |
| **Provas** › Provas anteriores | Regulamento atual, edital de abertura de 2015, prova e gabarito, em PDF | `documentos/dpe-rn/` (cópias sem metadados) |

## Limites conhecidos

- **O PDF do DOE perde texto em toda virada de página.** A diagramação cortou o fim de cada página, e esse texto não existe no arquivo, nem como texto nem como imagem. O programa no Cronograma traz só o que está no PDF. Os itens cortados levam a marca `[início ausente no PDF do DOE]` ou `[final ausente no PDF do DOE]`, e as lacunas do edital `rn-2025` listam o que falta em cada matéria. Nas regras do regulamento também há cortes: faltam, no todo ou em parte, os arts. 6º a 8º, 14 a 16, 24 a 29, 37 a 42 (inclusive o caput do artigo que traz o quadro da prova objetiva), 48 a 52 e 61 a 64.
- **Conferido em 01/11/2026:** a segunda cópia enviada da Res. nº 344/2025 é o mesmo arquivo, e o serviço público de autenticidade do DOE (`deirn.sdoe.com.br/diariooficial/public/verificarAutenticidade`, com o código impresso no PDF) devolve a publicação oficial com os mesmos cortes. O defeito está na própria edição do DOE, então o texto integral não sai de lá. Também não foi encontrada cópia completa na internet. Para completar: o texto da DPE/RN (site ou Comissão do Concurso), a Res. nº 365/2026 se ela republicou o regulamento, ou o edital do Cebraspe.
- Estão completos no PDF: Princípios Institucionais da Defensoria Pública (13 itens), Direito Processual Penal (30) e Direito do Consumidor (8). Os piores casos são Direito da Criança e do Adolescente (só os itens 19 a 23), Direito Penal (faltam os itens 2 a 14) e Direito Processual Civil (faltam os itens 1 a 14).
- Regulamento não é edital. Segundo a imprensa especializada, o Cebraspe foi contratado em 2026 e a Res. nº 365/2026 alterou pontos do regulamento. A Res. nº 365/2026 não estava entre os arquivos recebidos.
- Por isso o `rn-2025` tem `relatorio: false`: entra no Cronograma, mas fica fora do relatório de frequência dos editais de Defensor até o programa ficar completo.
- Na prova de 2015, a matéria de cada questão segue a ordem do caderno e o tema do enunciado. O caderno separa só grupos, não matérias.

## Atualizar

Com o texto integral da Res. nº 344/2025 (ou a versão consolidada com a Res. nº 365/2026), ou com o edital do Cebraspe:

```bash
python ferramentas/conteudo/dpern/extrair_dpern.py resolucao-344.pdf saida/rn-2025.json
node ferramentas/conteudo/dpern/inserir_dpern.mjs . saida/rn-2025.json
```

O extrator foi escrito para o PDF do DOE nº 15.871. Um PDF de outra diagramação pode exigir ajuste nos cabeçalhos das matérias (`DISCIPLINAS`). O `inserir_dpern.mjs` troca o programa e o quadro que já estiverem no catálogo. Depois, ajuste os números fixados nos testes (`tests/cronograma-conteudo-schema.test.mjs` e `tests/dpern.test.mjs`) e suba `CACHE`/`APP_CACHE`.
