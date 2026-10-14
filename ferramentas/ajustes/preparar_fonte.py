"""Aplica no fonte.html todas as alterações feitas direto no index.html publicado, de uma vez.

    python ferramentas/ajustes/preparar_fonte.py C:\\caminho\\fonte.html

Rode antes de cada `node build.mjs`. Pode rodar quantas vezes quiser: o que já foi aplicado não muda.
"""
import subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
AJ, DADOS = RAIZ / "ferramentas" / "ajustes", RAIZ / "ferramentas" / "conteudo" / "dados"
PASSOS = [
    ("lista de Defensorias", [AJ / "defensorias.py"]),
    ("aba Defensoria", [AJ / "aba_defensoria.py", "{fonte}", DADOS / "defensoria.json", "--publico"]),
    ("aba Teses", [AJ / "aba_teses.py", "{fonte}", DADOS / "teses.json"]),
    ("novidades embutidas", [AJ / "novidades_publicas.py", "{fonte}", *sorted(DADOS.glob("novidades-*.json"))]),
    ("Novidades em duas seções", [AJ / "novidades_secoes.py"]),
]

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    fonte = str(Path(sys.argv[1]).resolve())
    for nome, cmd in PASSOS:
        args = [str(a).replace("{fonte}", fonte) for a in cmd]
        if "{fonte}" not in [str(a) for a in cmd]: args.append(fonte)
        print(f"- {nome}: ", end="", flush=True)
        r = subprocess.run([sys.executable, *args])
        if r.returncode: sys.exit(f"parou em '{nome}': nada depois disso foi aplicado.")
    print("Pronto. Agora gere o app com a senha (node build.mjs) e suba a versão do CACHE no sw.js.")
