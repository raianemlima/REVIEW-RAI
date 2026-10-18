"""Questões reais da FCC em provas de Defensoria → provas de concurso do app (Estudar › Provas de concurso).

    python ferramentas/conteudo/questoes_fcc.py <arquivo-de-origem.json>
    python ferramentas/ajustes/aba_provas.py index.html      # (ou só troque a linha PROVAS_PUBLICO)

Gera dados/simulados/fcc-defensorias.json com enunciado, alternativas, gabarito, matéria e origem (órgão, ano, cargo).
Só entra o texto público das provas: comentários de terceiros que venham no arquivo de origem são descartados.
"""
import json, sys, re
from pathlib import Path

SAIDA = Path(__file__).resolve().parent / "dados" / "simulados" / "fcc-defensorias.json"
MATERIA = {"Processo Civil": "Direito Processual Civil", "Execução Penal": "Direito da Execução Penal",
           "Legislação Estadual": "Legislação estadual e institucional", "Princípios E Atribuições Institucionais Da Defensoria Pública": "Princípios Institucionais da Defensoria Pública",
           "Direitos Transindividuais": "Direitos Difusos e Coletivos", "Direito Coletivo": "Direitos Difusos e Coletivos", "Direito Processual Coletivo": "Direitos Difusos e Coletivos",
           "Peças Cíveis": "Direito Processual Civil", "Registro Civil das Pessoas Jurídicas (RCPJ)": "Direito Civil"}
limpa = lambda t: re.sub(r"[ \t]+\n", "\n", re.sub(r"\n{3,}", "\n\n", str(t or "").replace("\r", ""))).strip()

def converter(origem):
    itens = json.loads(Path(origem).read_text(encoding="utf-8-sig"))
    qs, vistos = [], set()
    for x in itens:
        alts = {a["letra"].strip().upper(): limpa(a["texto"]) for a in x.get("alternativas", []) if a.get("letra") and limpa(a.get("texto"))}
        gab = str(x.get("gabarito", "")).strip().upper()
        enun = limpa(x.get("enunciado"))
        if len(alts) < 2 or gab not in alts or not enun or str(x.get("desatualizada", "0")) not in ("0", "False", "false", ""): continue
        chave = re.sub(r"\W", "", enun.lower())[:200]
        if chave in vistos: continue
        vistos.add(chave)
        apoio = limpa(x.get("texto_apoio"))
        m0 = re.sub(r"\s+", " ", x.get("materia", "")).strip(); mat = MATERIA.get(m0, m0 or "Outras")
        qs.append({"materia": mat, "assunto": x.get("assunto", "").strip(), "fonte": f'{x.get("instituicao", "").strip()} {x.get("ano", "")} · {x.get("cargo", "").strip()}',
                   "ano": int(x.get("ano") or 0), "enunciado": (apoio + "\n\n" + enun) if apoio else enun, "alternativas": dict(sorted(alts.items())), "gabarito": gab})
    qs.sort(key=lambda q: (q["materia"], -q["ano"], q["fonte"]))
    for i, q in enumerate(qs, 1): q["n"] = i; q.pop("ano")
    prova = {"id": "fcc-defensorias", "nome": "FCC · Defensorias", "cargo": "Questões reais da FCC em concursos de Defensoria (DPE-SP, AM, MT, BA e outras)",
             "banca": "FCC", "gabarito": "oficial", "questoes": [{k: q[k] for k in ("n", "materia", "assunto", "fonte", "enunciado", "alternativas", "gabarito")} for q in qs]}
    SAIDA.write_text(json.dumps(prova, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(qs)} questões ({len(itens) - len(qs)} descartadas) → {SAIDA}")

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    converter(sys.argv[1])
