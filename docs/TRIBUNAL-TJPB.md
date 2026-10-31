# Tribunal de Justiça · TJPB 2026

Preparação para o Edital nº 01/2026 do TJPB (FGV), cargo de Analista Judiciário – Área Judiciária, prova em 24/01/2027.

## O que existe no app

- **Aba Tribunal** (menu e atalho em Hoje): cronograma pessoal de 12 semanas, 4 horas por dia, sem Língua Portuguesa por escolha da titular (as 10 questões continuam valendo). As caixas de cada bloco ficam em `S.ajustes.tjpb.feitos` e sincronizam como os demais ajustes. Em cada bloco de assunto, **No app para este bloco** usa o motor do Cronograma para listar cartões, lei seca, súmulas/teses e questões ligados ao tema, com botões que abrem o conteúdo. Os blocos de súmulas e teses usam os assuntos jurídicos do mesmo dia.
- **Cronograma por assuntos**: o edital `tjpb-2026` (servidor, fora do relatório dos editais de Defensor) traz 10 rubricas e 84 tópicos do Anexo I, com a página do edital e as leis citadas em cada item. As 40 questões específicas não são divididas pelo edital; a sugestão de tempo divide igualmente (5,71 por matéria) e a nota do perfil explica isso.
- **Plano estratégico** (`plano-tjpb-2026.html`): página offline com raio-x do edital, leitura estratégica, mapa do que mais cai, perfil da FGV, rotina, cronograma (só leitura), discursiva e dia da prova. Abre pela aba Tribunal e pelo Cronograma.
- **Lei seca do curso**: o leitor de Lei seca mostra, quando a lei tem esses campos, os grifos por cor (pegadinha, ponto cobrado, caiu dos dois jeitos, literal), o número de questões por artigo, os concursos recentes, a jurisprudência correlata, os avisos do STF e as assertivas das bancas; ganha os filtros **muito cobrado (6+)** e **caiu na FGV**. A aba Tribunal lista os artigos mais cobrados de cada lei do curso.

## Manutenção

- Plano: edite `ferramentas/conteudo/dados/plano-tjpb-2026.json` e rode `python ferramentas/ajustes/aba_tribunal.py index.html app-src.txt plano-tjpb-2026.html`. O mesmo script recoloca a aba, o estilo e as mudanças do leitor de Lei seca sem duplicar nada. Suba `CACHE`/`APP_CACHE` (sw.js, gate.js e gate do index.html).
- Edital: `ferramentas/conteudo/tjpb/extrair_tjpb.py` (PDF do edital → JSON) e `inserir_tjpb.mjs` (JSON → catálogos).
- Testes: `tests/aba-tribunal.test.mjs` e `tests/aplicar-leiseca.test.mjs`.

## Lei seca do curso (Decorando a Lei Seca)

Os PDFs são material pago e trazem marca d'água com dados pessoais da compradora. Por isso só o **conteúdo extraído e cifrado** entra no repositório, nunca o PDF nem o texto em claro.

1. Extrair (descarta a marca d'água e confere a saída): `python ferramentas/conteudo/leiseca_decodificada.py saida/ arquivo1.pdf arquivo2.pdf ...`
2. Cifrar: `LEISECA_CHAVE='<chave>' node ferramentas/ajustes/cifrar_leiseca.mjs saida/` → `leiseca-cifrada/<id>.bin`. Gere a chave uma vez com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. Guardar a mesma chave no segredo **LEISECA_CHAVE** do repositório (Settings › Secrets and variables › Actions). Para uma sessão do Claude na nuvem cifrar sem a chave passar pelo chat, guarde-a também como variável de ambiente `LEISECA_CHAVE` do ambiente da sessão.
4. Publicar (push na `main`): o passo "Lei seca do curso no baralho" decifra os `.bin` com `LEISECA_CHAVE`, abre o baralho com `APP_SENHA`, troca as leis `*-dls` e os cartões `ls-<id>…` e cifra de novo com o mesmo sal. Sem os segredos, o passo não faz nada. Se a chave ou os `.bin` mudarem depois de publicados, suba `CACHE`/`APP_CACHE` para os aparelhos baixarem o baralho novo.

Leis reconhecidas pelo extrator: CF, CPC, CPP, CP, CC, Lei 14.133/2021, Lei 8.429/1992, Lei 8.112/1990, Estatuto da Pessoa Idosa e Estatuto do Desarmamento.
