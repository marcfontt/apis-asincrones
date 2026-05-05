# STYLE.md — Guia de veu i to per a la memòria

> Llegir abans d'escriure qualsevol apartat. La referència de qualitat és el
> TFG d'Iker Ruiz Kerclova.

---

## 1. Què volem que soni el text

Volem que sembli **un estudiant que entén molt bé el tema, no un manual
tècnic**. Frases d'algú que ho ha fet amb les seves mans, amb opinions
matisades. No "informe corporatiu", no "Wikipedia traduïda".

Comparació ràpida:

|  | Evita (sona a IA / a manual) | Prefereix (sona a estudiant savi) |
|---|---|---|
| Obrir un apartat | "En aquest apartat es presenten els..." | "Abans d'entrar en el detall del sistema, val la pena..." |
| Justificar | "S'ha utilitzat X per la seva..." | "S'ha triat X perquè, en el nostre cas, era el que..." |
| Comparar | "Tots dos ofereixen avantatges similars" | "Tots dos serveixen, però en el context del projecte X tira més" |
| Conclusió | "En definitiva, es pot afirmar que..." | "El resultat és que..." / "A la pràctica, això es tradueix en..." |

## 2. Regles dures (no negociables)

1. **Sempre en català**, registre formal però no encarcarat. Es permet la
   primera persona del plural ("hem decidit", "vam descartar") i la primera
   del singular puntualment ("a títol personal..."). Evita el "se'n pot dir
   que..." impersonal generalitzat.
2. **Frases curtes a mitges**. Si una frase passa de tres línies, partir-la.
3. **Cap llista de més de 6 ítems** sense desglossar-la. Si la guia obliga
   (RF1-RF11), agrupar-les visualment.
4. **Zero llistes de bullets dins d'un paràgraf descriptiu** — només quan
   realment és una enumeració paral·lela (requisits, fases, alternatives).
5. **Cap superlatiu sense dades**: res de "molt important", "extremadament
   eficient", "altament escalable" si no ho pots quantificar.
6. **Tractament dels noms propis**: NTT Data en cursiva la primera vegada,
   després rodona. Productes (Backstage, Kafka, Elasticsearch, AKS) sempre
   en rodona, sense cursiva.

## 3. Llista negra de paraules i expressions

No fer servir mai (el tribunal ho llegeix com a "AI slop"):

- "genuinely", "honestly", "actually" en versió catalana ("sincerament",
  "honestament", "realment" obrint frase).
- "navegar pel món de", "endinsar-se en", "explorar el fascinant univers".
- "robusta", "potent", "innovador", "revolucionari" → si vols dir que va bé,
  digues per què.
- "en el panorama actual", "en l'era digital", "avui en dia" → ja sabem que
  estem el 2026.
- "no és menys cert que", "convé destacar que", "cal posar en valor".
- "una solució integral", "una eina poderosa".
- "que dóna molt joc" — espera, **aquesta sí**: és d'Iker i va bé un cop al
  document. No abusar.

## 4. Patrons d'Iker que volem imitar

- Reconèixer **errors o canvis de plans** sense disfressar-los. Iker explica
  obertament què va provar i no va anar bé. Això dona credibilitat.
- Tancar paràgrafs amb una **frase d'opinió breu** que sintetitza:
  "*El resultat va ser que XGBoost dona prou bons resultats sense haver de
  tocar gairebé hiperparàmetres*".
- Quan pinta una decisió tècnica, sempre la **contrasta amb una alternativa**
  i diu per què la descarta.
- Fa servir **xifres concretes** (no "moltes mostres", sinó "47.382 partits
  des del 2010").

## 5. Estructura típica d'un apartat (patró)

```
1. Frase d'enquadrament (1 línia): per què aquest apartat existeix.
2. Context o problema (1 paràgraf): què teníem davant.
3. Anàlisi o decisió (2-4 paràgrafs): què hem fet i per què, amb dades.
4. Conseqüències o tradeoffs (1 paràgraf): què guanyem, què perdem.
5. Tancament (1 frase): on ens deixa això per al següent apartat.
```

No és obligatori — només és una xarxa de seguretat quan no surt res.

## 6. Figures i taules

- **Cada figura té un peu autosuficient**: ha de poder-se llegir sense el
  text del cos. Ex: *"Figura 7. Flux de l'arquitectura EDA. Els productors
  publiquen al broker, que distribueix els esdeveniments als consumidors
  subscrits."*
- **Cap figura sense referència explícita** des del cos del text. Si no la
  cites, fora.
- **Taules: regla de tres columnes**. Si en cal una quarta, normalment
  s'està posant massa informació.

## 7. Citacions i bibliografia

- Citacions a la primera vegada que es menciona una tecnologia o estàndard.
- Format: `\cite{spec-rfc6455}` o `\cite{doc-kafka}` (vegeu `references.bib`).
- Quan citem versions concretes, posar la data de consulta (`urldate`).
- No citar Wikipedia mai.

## 8. Manera de dir certes coses concretes

| Concepte | Com dir-ho |
|---|---|
| Multi-cloud descartat | "Es va plantejar inicialment, però..." (mai "no es va poder fer") |
| Eines d'IA | "Suport puntual de ChatGPT durant la implementació" |
| Mètriques | "latència mitjana, P50, P95 i P99, throughput i taxa d'error" |
| Decisions de l'empresa | "Per indicació de l'equip d'arquitectura, s'ha optat per..." |
| Errors propis | "Una primera versió funcionava amb X, però en provar-ho amb càrregues més altes vam veure que..." |

## 9. Última passada abans de tancar un apartat

Llegir el text en veu alta. Si una frase fa entropir la llengua, partir-la.
Si una frase es podria treure i el paràgraf no perd res, treure-la.
