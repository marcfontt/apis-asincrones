export const EDUCATION = {
  syncVsAsync: {
    eyebrow: 'Base conceptual',
    title: 'API síncrona vs API asíncrona',
    description:
      'Una API defineix com dos sistemes es comuniquen. En una API síncrona el client espera la resposta; en una API asíncrona el productor deixa un missatge i el processament continua per un altre camí.',
    items: [
      {
        title: 'API síncrona',
        accent: '#3b82f6',
        summary:
          'El client envia una petició i queda esperant fins que el servidor retorna una resposta.',
        bullets: [
          'Funciona bé per consultes curtes i operacions directes.',
          "El temps de resposta impacta immediatament l'usuari o el servei client.",
          'Escala pitjor quan la feina és llarga o quan cal desacoblar productors i consumidors.',
        ],
      },
      {
        title: 'API asíncrona',
        accent: '#22c55e',
        summary:
          'El productor publica un missatge en un broker i pot continuar sense esperar que el consumidor acabi la feina.',
        bullets: [
          'Desacobla serveis i absorbeix pics de càrrega.',
          "El rendiment depèn del broker, del protocol, de l'arquitectura i del format de dades.",
          'És el model que comparem en aquest portal amb benchmarks reals sobre AKS.',
        ],
      },
    ],
  },
  asyncFlow: {
    eyebrow: 'Flux del benchmark',
    title: 'Del productor al consumidor',
    description:
      "Cada escenari executa el mateix flux lògic: un productor envia missatges, el broker els distribueix i un consumidor els rep. Les mètriques indiquen com s'ha comportat aquesta cadena sota càrrega.",
    steps: [
      {
        label: 'Productor',
        accent: '#2563eb',
        description:
          'Genera missatges amb un format, payload i ràtio concrets. La configuració es defineix a Escenaris.',
      },
      {
        label: 'Broker o plataforma',
        accent: '#f59e0b',
        description:
          'Kafka, Confluent, RabbitMQ o NATS Server reben i distribueixen els missatges dins del clúster AKS.',
      },
      {
        label: 'Protocol',
        accent: '#8b5cf6',
        description:
          'Defineix com circula el missatge: Kafka, AMQP, MQTT, gRPC, WS o NATS.',
      },
      {
        label: 'Consumidor',
        accent: '#22c55e',
        description:
          'Rep els missatges i permet calcular latència end-to-end, throughput i errors.',
      },
      {
        label: 'Mesures',
        accent: '#06b6d4',
        description:
          'Cada pocs segons es persisteix un punt de telemetria del run. Una mesura no és un missatge individual.',
      },
    ],
  },
  concepts: {
    eyebrow: 'Llenguatge del portal',
    title: "Conceptes que es fan servir a tota l'app",
    description:
      "Aquests termes tenen el mateix significat a Home, Catàleg, Escenaris, Execucions i Resultats.",
    items: [
      {
        title: 'Arquitectura',
        accent: '#2563eb',
        description:
          "Patró de disseny que explica com s'organitzen productors, brokers i consumidors. No és el broker, sinó la forma de treballar.",
      },
      {
        title: 'Protocol',
        accent: '#8b5cf6',
        description:
          'Regles de transport i lliurament del missatge. Afecta compatibilitat, confirmacions, latència i model de consum.',
      },
      {
        title: 'Broker',
        accent: '#f59e0b',
        description:
          'Plataforma de missatgeria que rep, emmagatzema o distribueix missatges. En aquest portal comparem Kafka, Confluent, RabbitMQ i NATS Server.',
      },
      {
        title: 'Missatge',
        accent: '#3b82f6',
        description:
          'Unitat de càrrega enviada pel productor i rebuda pel consumidor. Pot tenir payload petit, JSON financer, telemetria IoT o dades de vídeo.',
      },
      {
        title: 'Mesura',
        accent: '#22c55e',
        description:
          "Punt de telemetria guardat periòdicament durant un run. Resumeix molts missatges i serveix per construir l'historial.",
      },
      {
        title: 'Reproducibilitat',
        accent: '#06b6d4',
        description:
          'Capacitat de repetir una prova amb les mateixes versions, configuració AKS, escenari, durada, ràtio i payload per comparar resultats defensables.',
      },
    ],
  },
  resultsGuide: {
    title: 'Guia de mesures, mètriques i puntuació',
    intro:
      'A Resultats conviuen missatges i mesures. Separar-los evita la confusió principal: els missatges són la càrrega processada; les mesures són els punts de telemetria que resumeixen el run.',
    terminology: [
      {
        title: 'Missatges',
        accent: '#3b82f6',
        description:
          "Unitat real de càrrega del benchmark. El comptador indica quants missatges han estat enviats o rebuts durant una execució.",
      },
      {
        title: 'Mesures',
        accent: '#22c55e',
        description:
          "Snapshots persistits cada pocs segons amb latència, throughput, errors i percentils. L'historial agrega aquestes mesures.",
      },
      {
        title: 'Execució',
        accent: '#f59e0b',
        description:
          "Un run concret d'un escenari. Quan es repeteix, la vista en directe comença de zero perquè és un runId nou.",
      },
      {
        title: 'Historial',
        accent: '#8b5cf6',
        description:
          "Vista acumulada de les execucions finalitzades. Si un escenari s'executa diverses vegades, l'agregat suma mesures i missatges i pondera les mètriques.",
      },
    ],
    metricDefinitions: [
      {
        title: 'Latència mitjana (ms)',
        accent: '#f59e0b',
        description:
          'Temps mitjà entre publicar i rebre un missatge. Com més baixa sigui, més ràpida és la combinació.',
      },
      {
        title: 'P50',
        accent: '#3b82f6',
        description:
          "La mediana. El 50% de les mostres queden per sota d'aquest valor i representa el comportament habitual.",
      },
      {
        title: 'P95',
        accent: '#8b5cf6',
        description:
          'Mostra la zona de degradació abans dels pitjors casos. És útil per detectar pics intermitents.',
      },
      {
        title: 'P99',
        accent: '#7c3aed',
        description:
          'Mesura la cua llarga. Indica el pitjor comportament practic en el 99% dels casos.',
      },
      {
        title: 'Throughput (msg/s)',
        accent: '#22c55e',
        description:
          'Missatges processats per segon. És la mètrica clau quan el format de dades exigeix volum sostingut.',
      },
      {
        title: "Taxa d'error (%)",
        accent: '#ef4444',
        description:
          'Percentatge de missatges fallits o perduts. Pot reduir molt la puntuació encara que la latència sigui bona.',
      },
    ],
    scoringPrinciples: [
      'La puntuació sempre és relativa als escenaris visibles amb els filtres actuals.',
      'Cada format aplica pesos diferents: financer prioritza errors, vídeo prioritza throughput i IoT prioritza volum amb payload petit.',
      "Si la taxa d'error supera el llindar del format, s'aplica un descompte encara que la resta de mètriques siguin bones.",
    ],
    thresholds:
      'Llindars de descompte: financer > 0,1%, vídeo > 2%, IoT > 0,5%, per defecte > 1%.',
  },
} as const;
