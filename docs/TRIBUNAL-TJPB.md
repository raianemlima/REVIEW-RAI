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

## Lei seca pública (texto oficial)

Normas oficiais que o edital cita e que o baralho não tinha entram como lei seca a partir de `ferramentas/conteudo/dados/leiseca-publica/*.json`. Por serem texto público, ficam em claro no repositório e só precisam do segredo `APP_SENHA` (já usado na publicação) para irem ao baralho.

- Resoluções do CNJ 351/2020 (assédio e discriminação), 401/2021 (acessibilidade e inclusão de pessoas com deficiência), 400/2021 (sustentabilidade) e 363/2021 (LGPD nos tribunais), convertidas do texto compilado de atos.cnj.jus.br por `ferramentas/conteudo/tjpb/cnj_resolucoes.py`. O trecho tachado (revogado ou alterado) é descartado.
- A Res. CNJ 230/2016, citada no edital como "230/2021", está revogada pela Res. 401/2021; por isso a lei seca traz a 401.
- Leis federais do texto compilado vigente da Câmara, publicado no normas.leg.br:
  - LGPD, LINDB, Lei 9.784/1999 e Lei 12.846/2013;
  - legislação especial do edital do TJPB: 12.850/2013 (Orcrim), 9.807/1999, 13.431/2017, 14.344/2022 (Henry Borel), 9.613/1998, 8.072/1990, 9.455/1997, 13.869/2019, 9.296/1996, 7.716/1989, 9.605/1998, 9.099/1995, 10.259/2001, 8.009/1990, 8.245/1991, 12.965/2014, 4.717/1965, 7.347/1985 e 13.146/2015.
- A Lei 14.344/2022 não tem compilação na fonte. Entra o texto original do DOU, e a fonte da lei avisa para conferir alterações posteriores.
- As versões completas da Lei 9.099 e do Estatuto da Pessoa com Deficiência tomam o lugar das seleções antigas (`jec` e `epcd`).
- Gere ou atualize com `python ferramentas/conteudo/tjpb/normas_leg.py ferramentas/conteudo/dados/leiseca-publica [ids]`. Para outra lei, acrescente a URN dela em `LEIS`. O site do Planalto não é usado, porque fica fora da rede da sessão. Dispositivo revogado não entra; o artigo revogado aparece só como "Art. N. (Revogado.)".
- No leitor, a lei completa fica no lugar da seleção que substitui, e as leis novas entram em ordem alfabética depois das que já existiam.
- Pendentes: Res. TJPB 20/2025 e 21/2025. O site do TJPB recusa acesso automatizado, então elas precisam vir em PDF.

## Marcação colorida automática

Toda lei seca do app sem os grifos do curso recebe na publicação uma marcação por tipo de termo (`ferramentas/ci/grifos_auto.mjs`, chamado por `aplicar_leiseca.mjs`):
- **vermelho:** prazo, número, percentual ou quórum;
- **azul:** exceção, vedação ou restrição;
- **dourado:** dever, competência, nulidade ou "de ofício";
- **marinho:** definição legal.

As notas "(Redação dada pela Lei ...)" ficam sem marca. O leitor mostra a legenda própria ("marcação automática do app"), e a lei do curso continua com os grifos e a legenda do professor. A marcação não vem de estatística de questões: ela destaca os tipos de termo que as bancas mais exploram na literalidade.

## Lei seca do curso (Decorando a Lei Seca)

Os PDFs são material pago e trazem marca d'água com dados pessoais da compradora. Por isso só o **conteúdo extraído e cifrado** entra no repositório, nunca o PDF nem o texto em claro.

No leitor, a lei do curso aparece com o nome da lei ("CDC", "LEP" etc.). Quando ela cobre a mesma lei de uma seleção curta que o app já tinha (CDC, Estatuto da Pessoa Idosa, Maria da Penha e, quando vier, a CF), o campo `substitui` faz a publicação tirar a seleção antiga do leitor. Os cartões dessa seleção continuam no baralho.

1. Extrair (descarta a marca d'água e confere a saída): `python ferramentas/conteudo/leiseca_decodificada.py saida/ arquivo1.pdf arquivo2.pdf ...`
2. Selar: `node ferramentas/ajustes/cifrar_leiseca.mjs saida/` → `leiseca-cifrada/<id>.bin`. O script usa a chave **pública** de `leiseca-cifrada/chave-publica.txt` e não precisa de segredo nenhum: o `.bin` só abre com a senha do app (segredo `APP_SENHA`, que já existe). A chave pública sai da própria senha (`ferramentas/ci/leiseca_selada.mjs`: PBKDF2-SHA-256 com 600 mil iterações, como o `deck.enc`, e par X25519) e aparece no log de toda publicação, na linha "chave pública da lei seca do curso". Se a senha do app mudar, copie a chave nova do log para `chave-publica.txt` e sele de novo; até lá, a publicação avisa e deixa a lei seca do curso de fora, sem quebrar o resto.
3. Publicar (push na `main`): o passo "Lei seca extra no baralho" insere a lei seca pública, abre os `.bin` selados com `APP_SENHA`, abre o baralho com a mesma senha, troca as leis `*-dls` e os cartões `ls-<id>…` e cifra de novo com o mesmo sal. Sem `APP_SENHA`, o passo não faz nada. Se os `.bin` mudarem depois de publicados, suba `CACHE`/`APP_CACHE` para os aparelhos baixarem o baralho novo.

O modo antigo, com chave simétrica, continua aceito: com a variável `LEISECA_CHAVE` definida, o `cifrar_leiseca.mjs` usa essa chave, e a publicação abre esses `.bin` com o segredo `LEISECA_CHAVE`.

Leis reconhecidas pelo extrator: CF, CPC, CPP, CP, CC, CDC (Lei 8.078/1990), Lei 14.133/2021, Lei 8.429/1992, Lei 8.112/1990, LEP (Lei 7.210/1984), ECA (Lei 8.069/1990), Lei Maria da Penha (Lei 11.340/2006), Lei de Drogas (Lei 11.343/2006), Estatuto da Pessoa Idosa e Estatuto do Desarmamento. Os volumes que juntam mais de uma lei ("3 em 1") são reconhecidos pela capa. Na aba Tribunal, o painel "Artigos mais cobrados" segue a ordem de `TJ_LEIS_ORDEM` em `ferramentas/ajustes/aba_tribunal/aba.js`; lei sem posição na lista vai para o fim.
