# `memoria/` — Memòria del TFG APIs Asíncrones

Aquest directori conté la memòria oficial del TFG en format LaTeX i els seus artefactes compilats.

## Estructura

```
memoria/
├── main.tex               # Font únic en LaTeX (capítols, seccions, taules)
├── main.docx             # Versió editable (generat per pandoc des de main.tex)
├── memoria_editable.docx # Còpia de seguretat editable (mantinguda manualment)
├── references.bib        # Bibliografia en BibTeX (citat a main.tex)
├── build.sh              # Script per compilar PDF i DOCX
├── assets/               # Imatges finals integrades a la memòria (PNG)
├── figures-src/          # Diagrama i figures fonts (actualment buit)
├── STYLE.md              # Guia d'estil LaTeX (format, nomenclatura)
└── README.md             # Aquest fitxer
```

## Com compilar

### Requisits
- `pdflatex` (TeXLive o MacTeX)
- `pandoc` (per generar DOCX)

### Compilar des de zero

```bash
cd memoria/
./build.sh all          # Genera PDF + DOCX (per defecte)
./build.sh pdf          # Només PDF
./build.sh docx         # Només DOCX
```

Artefactes generats:
- `build/main.pdf` — Versió oficial per a dipòsit
- `build/main.docx` — Versió per al tutor

## Seccions principals (main.tex)

La memòria segueix estructura estàndard TFG:
1. **Portada i metadata** — Títol, autor, data, tribunal
2. **Resum/Abstract** — Catalan i anglès
3. **Taula de continguts**
4. **Introducció** — Context dels APIs asíncrons
5. **Metodologia** — Enfocament de benchmarking
6. **Arquitectura** — Disseny de la plataforma, components
7. **Implementació** — Detalls tècnics per microserveis
8. **Avaluació** — Resultats de benchmarks, gràfiques
9. **Conclusions i treball futur**
10. **Apèndixs** — Configuracions, instruccions, codi rellevant
11. **Bibliografia** — Cites de `references.bib`

## Treballs amb figures

### Afegir una figura nova

1. Exporta/genera la imatge en **PNG** (per a documents digitals)
2. Copia-la a `assets/` amb nom descriptiu:
   ```
   assets/fig_arquitectura_plataforma.png
   ```
3. A `main.tex`, inclou-la:
   ```latex
   \begin{figure}[h]
     \centering
     \includegraphics[width=0.8\textwidth]{assets/fig_meva_figura.png}
     \caption{Descripció de la figura}
     \label{fig:meva_figura}
   \end{figure}
   ```
4. Recompila:
   ```bash
   ./build.sh all
   ```

### Gestionar font de figures

`figures-src/` està reservat per a fitxers font originals (Excel, Figma, Visio).
Actualment és buit; si necessites, crea subcarpetes per tipus.

## Estil i nomenclatura

Consulta `STYLE.md` per a:
- Convencions de noms (variables, comandos LaTeX)
- Format de taules i llistes
- Estàndards de citació (BibTeX)
- Marges, fonts, espaiament

## Notes importants

- **main.docx és temporal**: Es regenera cada cop que executes `./build.sh docx`.
  Edita sempre el LaTeX original (`main.tex`), no DOCX.
- **memoria_editable.docx**: Còpia estàtica per a compartir amb tutors sense recompilar.
- **Build regenerable**: Tot a `build/` es regenera; no facis canvis allà.

## Veure la compilació

```bash
# En local
open build/main.pdf          # macOS
xdg-open build/main.pdf      # Linux
start build/main.pdf         # Windows

# Convertir sense recompilar
pandoc build/main.pdf -t latex -o main_from_pdf.tex  # Si necessites l'invers
```
