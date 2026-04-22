export const EDUCATION = {
  syncVsAsync: {
    eyebrow: 'Base conceptual',
    title: 'API síncrona vs API asíncrona',
    description:
      'La Home ha d\'explicar el perquè del portal abans d\'ensenyar dades. Aquest resum situa l\'usuari en el model mental correcte.',
    items: [
      {
        title: 'API síncrona',
        accent: '#3b82f6',
        summary:
          'El client espera una resposta immediata i el flux queda bloquejat fins que el servidor respon.',
        bullets: [
          'Ideal per consultes curtes i interaccions directes.',
          'El temps de resposta impacta directament la UX.',
          'Escala pitjor quan hi ha molts processos llargs o desacoblats.',
        ],
      },
      {
        title: 'API asíncrona',
        accent: '#22c55e',
        summary:
          'El productor publica un missatge i el processament continua en paral·lel sense esperar una resposta immediata.',
        bullets: [
          'Permet desacoblar serveis i repartir càrrega.',
          'La latència i el throughput depenen del broker, el protocol i l\'arquitectura.',
          'És el model que comparem en aquest portal per veure quina combinació rendeix millor.',
        ],
      },
    ],
  },
  asyncFlow: {
    eyebrow: 'Com es construeix un escenari',
    title: 'De la definició al resultat',
    description:
      'Cada execució combina decisions tècniques diferents. El portal serveix per provar-les en AKS i comparar-ne el comportament.',
    steps: [
      {
        label: 'Arquitectura',
        accent: '#2563eb',
        description:
          'Defineix el patró de comunicació: EDA, QBA, LCA, EMA o SEA. Marca com circulen els esdeveniments.',
      },
      {
        label: 'Protocol',
        accent: '#8b5cf6',
        description:
          'Defineix el llenguatge de transport: Kafka, AMQP, MQTT, gRPC o NATS. Afecta latència, compatibilitat i model de lliurament.',
      },
      {
        label: 'Plataforma',
        accent: '#f59e0b',
        description:
          'És el broker o implementació real: RabbitMQ, NATS Server, Kafka o Confluent. Aquí es veu el comportament real al clúster.',
      },
      {
        label: 'Telemetria',
        accent: '#06b6d4',
        description:
          'El load-generator envia punts periòdics amb latència, throughput, errors i percentils. Aquestes són les mesures que veus als resultats.',
      },
      {
        label: 'Comparativa',
        accent: '#22c55e',
        description:
          'L\'historial agrega les execucions visibles i calcula una puntuació relativa segons el format de dades i el pes de cada mètrica.',
      },
    ],
  },
  concepts: {
    eyebrow: 'Llenguatge del portal',
    title: 'Què vol dir cada concepte',
    description:
      'Aquests termes es repeteixen a Catàleg, Escenaris, Execucions i Resultats. Cal que tinguin el mateix significat a tota l\'app.',
    items: [
      {
        title: 'Arquitectura',
        accent: '#2563eb',
        description:
          'Patró de disseny amb què es distribueixen els missatges entre productors i consumidors. No és el broker, sinó la forma de treballar.',
      },
      {
        title: 'Protocol',
        accent: '#8b5cf6',
        description:
          'Regles de comunicació entre serveis i broker. Determina com es publiquen, es consumeixen i es confirmen els missatges.',
      },
      {
        title: 'Telemetria',
        accent: '#06b6d4',
        description:
          'Conjunt de mètriques recollides durant l\'execució. S\'obtenen des del load-generator i es persisteixen perquè es puguin comparar.',
      },
      {
        title: 'Mesura',
        accent: '#22c55e',
        description:
          'Punt de telemetria guardat cada pocs segons. Una mesura no és un missatge individual: és un resum temporal del comportament del run.',
      },
    ],
  },
  resultsGuide: {
    title: 'Guia de mesures, mètriques i puntuació',
    intro:
      'A Resultats conviuen dues unitats diferents: missatges i mesures. Separar-les bé evita la confusió més habitual durant una demo.',
    terminology: [
      {
        title: 'Missatges',
        accent: '#3b82f6',
        description:
          'Unitat de càrrega del benchmark. Es mostren a En directe perquè representen el volum processat dins del run actual.',
      },
      {
        title: 'Mesures',
        accent: '#22c55e',
        description:
          'Punts de telemetria persistits periòdicament. Són la base de l\'historial i de les comparatives perquè resumeixen el comportament del run.',
      },
      {
        title: 'Execució',
        accent: '#f59e0b',
        description:
          'Un run concret d\'un escenari. Quan tornes a executar-lo, els comptadors en directe tornen a zero perquè comença un run nou.',
      },
      {
        title: 'Historial',
        accent: '#8b5cf6',
        description:
          'Vista acumulada només d\'escenaris executats. Agrega les mesures de les execucions visibles segons els filtres actuals.',
      },
    ],
    metricDefinitions: [
      {
        title: 'Latència mitjana (ms)',
        accent: '#f59e0b',
        description:
          'Temps mitjà entre l\'enviament i la recepció. Com més baixa sigui, més ràpida és la plataforma.',
      },
      {
        title: 'P50',
        accent: '#3b82f6',
        description:
          'La mediana. El 50% de les mesures queden per sota d\'aquest valor i representa el comportament més habitual.',
      },
      {
        title: 'P95',
        accent: '#8b5cf6',
        description:
          'Mostra la zona de degradació abans d\'arribar als pitjors casos. És útil per detectar pics intermitents.',
      },
      {
        title: 'P99',
        accent: '#7c3aed',
        description:
          'Mesura la cua llarga. Indica quin és el pitjor comportament pràctic en el 99% dels casos.',
      },
      {
        title: 'Throughput (msg/s)',
        accent: '#22c55e',
        description:
          'Missatges processats per segon. És especialment rellevant en formats de dades grans o d\'alta freqüència.',
      },
      {
        title: 'Taxa d\'error (%)',
        accent: '#ef4444',
        description:
          'Percentatge de missatges fallits o perduts. Pot penalitzar fortament la puntuació encara que la latència sigui bona.',
      },
    ],
    scoringPrinciples: [
      'La puntuació sempre és relativa als escenaris visibles amb els filtres actuals.',
      'Cada format de dades aplica pesos diferents perquè un cas financer no prioritza el mateix que un cas de vídeo o IoT.',
      'Si la taxa d\'error supera el llindar del format, s\'aplica una penalització encara que la resta de mètriques siguin bones.',
    ],
    thresholds:
      'Llindars de penalització: Financer > 0.1% · Vídeo > 2% · IoT > 0.5% · Per defecte > 1%.',
  },
} as const;
