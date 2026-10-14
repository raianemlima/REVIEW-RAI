"""Aplica no fonte.html todas as alterações feitas direto no index.html publicado, de uma vez.

    python ferramentas/ajustes/preparar_fonte.py C:\\caminho\\fonte.html

Atualize o repositório (git pull) e rode antes de cada `node build.mjs`. Deixe o chave-arquivos.json (chaves dos PDFs protegidos) na mesma pasta do fonte.html. Pode rodar quantas vezes quiser: o que já foi aplicado não muda.
"""
import subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
AJ, DADOS = RAIZ / "ferramentas" / "ajustes", RAIZ / "ferramentas" / "conteudo" / "dados"
PASSOS = [
    ("código do site publicado", [AJ / "sincronizar_fonte.py"]),   # primeiro: menu, abas e estilo feitos direto no index.html
    ("lista de Defensorias", [AJ / "defensorias.py"]),
    ("aba Defensoria", [AJ / "aba_defensoria.py", "{fonte}", DADOS / "defensoria.json", "--publico"]),
    ("aba Teses", [AJ / "aba_teses.py", "{fonte}", DADOS / "teses.json"]),
    ("provas de concurso (simulados)", [AJ / "aba_provas.py"]),
    ("arquivos protegidos (PDFs)", [AJ / "arquivos_protegidos.py", "{fonte}", "{chaves}"]),
    ("novidades embutidas", [AJ / "novidades_publicas.py", "{fonte}", *sorted(DADOS.glob("novidades-*.json"))]),
    ("Novidades em duas seções", [AJ / "novidades_secoes.py"]),
]

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    fonte = str(Path(sys.argv[1]).resolve())
    for nome, cmd in PASSOS:
        chaves = Path(fonte).parent / "chave-arquivos.json"   # chaves dos PDFs protegidos: ficam junto do fonte, nunca no GitHub
        args = [str(a).replace("{fonte}", fonte) for a in cmd if str(a) != "{chaves}" or chaves.exists()]
        args = [str(chaves) if a == "{chaves}" else a for a in args]
        if "{fonte}" not in [str(a) for a in cmd]: args.append(fonte)
        print(f"- {nome}: ", end="", flush=True)
        r = subprocess.run([sys.executable, *args])
        if r.returncode: sys.exit(f"parou em '{nome}': nada depois disso foi aplicado.")
    if not (Path(fonte).parent / "chave-arquivos.json").exists():
        print("Aviso: chave-arquivos.json não está na pasta do fonte.html; os PDFs protegidos não vão aparecer no app.")
    print("Pronto. Agora gere o app com a senha (node build.mjs) e suba a versão do CACHE no sw.js.")
