"""Concurso: troca a escolha fixa da DPE/RN por qualquer Defensoria do Brasil (27 estaduais + DPU).

Aplica as mesmas trocas no index.html publicado e no fonte.html (o arquivo-fonte que fica fora do repositório),
para a mudança não se perder no próximo `node build.mjs`. Rodar de novo não faz nada (é idempotente).

    python ferramentas/ajustes/defensorias.py index.html
    python ferramentas/ajustes/defensorias.py caminho/fonte.html
"""
import sys

ESTADOS = (
    ("DPU", "DPU", "Defensoria Pública da União"), ("AC", "DPE/AC", "Acre"), ("AL", "DPE/AL", "Alagoas"), ("AP", "DPE/AP", "Amapá"),
    ("AM", "DPE/AM", "Amazonas"), ("BA", "DPE/BA", "Bahia"), ("CE", "DPE/CE", "Ceará"), ("DF", "DPDF", "Distrito Federal"),
    ("ES", "DPE/ES", "Espírito Santo"), ("GO", "DPE/GO", "Goiás"), ("MA", "DPE/MA", "Maranhão"), ("MT", "DPE/MT", "Mato Grosso"),
    ("MS", "DPE/MS", "Mato Grosso do Sul"), ("MG", "DPE/MG", "Minas Gerais"), ("PA", "DPE/PA", "Pará"), ("PB", "DPE/PB", "Paraíba"),
    ("PR", "DPE/PR", "Paraná"), ("PE", "DPE/PE", "Pernambuco"), ("PI", "DPE/PI", "Piauí"), ("RJ", "DPE/RJ", "Rio de Janeiro"),
    ("RN", "DPE/RN", "Rio Grande do Norte"), ("RS", "DPE/RS", "Rio Grande do Sul"), ("RO", "DPE/RO", "Rondônia"), ("RR", "DPE/RR", "Roraima"),
    ("SC", "DPE/SC", "Santa Catarina"), ("SP", "DPE/SP", "São Paulo"), ("SE", "DPE/SE", "Sergipe"), ("TO", "DPE/TO", "Tocantins"),
)
js_siglas = ", ".join(f'{k}: "{s}"' for k, s, _ in ESTADOS)
js_nomes = ", ".join(f'{k}: "{n}"' for k, _, n in ESTADOS)

TROCAS = [
    # lista de Defensorias + dica de quantos cartões específicos existem para cada uma
    ('const ESTADOS = { RN: "DPE/RN" };',
     f'const ESTADOS = {{ {js_siglas} }};\n'
     f'const ESTADO_NOME = {{ {js_nomes} }};\n'
     'const opcoesEstado = atual => Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === atual ? "selected" : ""}>${v} · ${ESTADO_NOME[k]}</option>`).join("");\n'
     'function dicaEstado(k) {   // núcleo comum vale para todas; o módulo específico só existe para algumas\n'
     '  const n = DECK.cartoes.filter(c => c.abr === k).length;\n'
     '  return n ? `Entram os cartões do núcleo comum e ${n} ${n === 1 ? "cartão específico" : "cartões específicos"} da ${ESTADOS[k] || k}.`\n'
     '    : `Entram os cartões do núcleo comum, que valem para qualquer Defensoria. O módulo específico da ${ESTADOS[k] || k} ainda não foi publicado.`;\n'
     '}'),
    # Ajustes
    ('<label for="a-estado">Concurso</label>\n        <select id="a-estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === a.estado ? "selected" : ""}>${v} · III Concurso</option>`).join("")}</select>\n        <span class="hint">Define quais cartões do módulo estadual entram. Outros estados chegam com os próximos perfis.</span>',
     '<label for="a-estado">Defensoria do seu concurso</label>\n        <select id="a-estado">${opcoesEstado(a.estado)}</select>\n        <span class="hint" id="a-estado-h">${esc(dicaEstado(a.estado))}</span>'),
    ('Na DPE/RN, cada disciplina pesa o mesmo até o edital dividir os grupos.',
     'Cada disciplina pesa o mesmo até o edital da sua Defensoria definir os pesos.'),
    ('Edital da DPE/RN ainda não publicado. Com a data,',
     'Use a data do edital da sua Defensoria. Com a data,'),
    ('  $("#aj").onsubmit = e => {',
     '  $("#a-estado").onchange = e => { $("#a-estado-h").textContent = dicaEstado(e.target.value); };\n  $("#aj").onsubmit = e => {'),
    # primeiro acesso: escolher a Defensoria junto com a data da prova
    ('<h2>Vamos combinar a meta</h2><p>Se já souber a data da prova, informe. O app ajusta as fases do estudo até lá.</p><div class="form" style="text-align:left;gap:10px;box-shadow:none"><div class="field">',
     '<h2>Vamos combinar a meta</h2><p>Escolha a sua Defensoria e, se já souber, a data da prova. O app ajusta as fases do estudo até lá.</p><div class="form" style="text-align:left;gap:10px;box-shadow:none"><div class="field"><label for="o-estado">Defensoria</label><select id="o-estado">${opcoesEstado(S.ajustes.estado)}</select></div><div class="field">'),
    ('if ($("#o-prova")) { S.ajustes.prova = $("#o-prova").value;',
     'if ($("#o-prova")) { if ($("#o-estado")) S.ajustes.estado = $("#o-estado").value; S.ajustes.prova = $("#o-prova").value;'),
    # texto de compartilhar: não existe mais senha de acesso
    ('App de revisão espaçada para a Defensoria Pública. O acesso é por senha, que você recebe de quem enviou o link.',
     'App de revisão espaçada para concursos da Defensoria Pública, com conteúdo para todas as Defensorias do Brasil.'),
]

def aplicar(caminho):
    html = open(caminho, encoding="utf-8").read()
    feitas = 0
    for antes, depois in TROCAS:
        if depois in html:
            continue                      # já aplicada
        if html.count(antes) != 1:
            sys.exit(f"{caminho}: trecho não encontrado (ou repetido), nada foi gravado:\n  {antes[:90]}")
        html = html.replace(antes, depois); feitas += 1
    open(caminho, "w", encoding="utf-8").write(html)
    print(f"{caminho}: {feitas} de {len(TROCAS)} trocas aplicadas" + (" (já estava atualizado)" if not feitas else ""))

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    for p in sys.argv[1:]: aplicar(p)
