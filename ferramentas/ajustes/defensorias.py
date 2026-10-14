"""Concurso: a lista do campo "Concurso" (Ajustes) passa a ter todas as Defensorias do Brasil (27 + DPU).

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
    # só a lista do campo "Concurso" em Ajustes muda; o resto do app fica igual
    ('const ESTADOS = { RN: "DPE/RN" };',
     f'const ESTADOS = {{ {js_siglas} }};\n'
     f'const ESTADO_NOME = {{ {js_nomes} }};'),
    ('<option value="${k}" ${k === a.estado ? "selected" : ""}>${v} · III Concurso</option>',
     '<option value="${k}" ${k === a.estado ? "selected" : ""}>${v} · ${k === "RN" ? "III Concurso" : ESTADO_NOME[k]}</option>'),
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
