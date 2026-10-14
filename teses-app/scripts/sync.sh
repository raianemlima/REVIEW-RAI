#!/usr/bin/env bash
# Regenera os dados a partir do PDF e sincroniza com o GitHub.
# Uso: scripts/sync.sh caminho/teses.pdf "mensagem do commit"
set -euo pipefail
PDF="${1:?informe o PDF}"; MSG="${2:-Atualiza teses}"
python3 -I scripts/parse_teses.py "$PDF" data
cp data/teses.json docs/teses.json
git add -A data docs scripts
git diff --cached --quiet && { echo "Sem alterações."; exit 0; }
git commit -m "$MSG"
git push origin HEAD
