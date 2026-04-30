#!/usr/bin/env bash
# =============================================================================
#  Build script — PFG APIs Asíncrones
#  Genera dos artefactes des de la mateixa font (main.tex):
#     build/main.pdf   → versió oficial per a dipòsit
#     build/main.docx  → versió per al tutor (via pandoc)
#
#  Ús:  ./build.sh [pdf|docx|all]    (per defecte: all)
# =============================================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

TARGET="${1:-all}"
mkdir -p build

build_pdf () {
  echo ">> Compilant PDF amb pdflatex (2 passades per índex i refs creuades)…"
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build main.tex >/dev/null
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build main.tex >/dev/null
  echo "   -> build/main.pdf"
}

build_docx () {
  echo ">> Generant DOCX amb pandoc…"
  pandoc main.tex \
    --from=latex \
    --to=docx \
    --resource-path=.:assets \
    --number-sections \
    --output=build/main.docx
  echo "   -> build/main.docx"
}

case "$TARGET" in
  pdf)  build_pdf  ;;
  docx) build_docx ;;
  all)  build_pdf; build_docx ;;
  *)    echo "Ús: $0 [pdf|docx|all]"; exit 1 ;;
esac

echo "Fet."
