// ── Detecció de mode indefinit ─────────────────────────────────────────────
// Considerem que un escenari es "indefinit" (corre fins que l'usuari l'atura)
// nomes en aquests casos:
//   - duration es null, undefined o cadena buida
//   - duration es 0
//
// Abans tambe considerava indefinit qualsevol valor >= 3600 segons. Aixo
// confonia perque 3600 es una durada legitima (1 hora). El frontend feia
// servir aquell valor com a "sentinel" pero portava a inconsistencies:
// escenaris que duraven hores quan el text de la UI deia "1h max", o runs
// que s'aturaven inesperadament. Ara tot es explicit:
//   - Vols 1h? Posa duration = 3600 (s'aturara als 60 minuts)
//   - Vols indefinit? Posa duration = 0 o null
export function isIndefiniteDuration(value: unknown): boolean {
  if (value == null || value === '') {
    return true;
  }

  const duration = Number(value);
  if (!Number.isFinite(duration)) {
    return false;
  }

  return duration === 0;
}

export function getMonitorMaxAttempts(
  durationSeconds: unknown,
  pollIntervalMs = 10_000,
  graceSeconds = 180,
): number | null {
  if (isIndefiniteDuration(durationSeconds)) {
    return null;
  }

  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration < 0) {
    return null;
  }

  const totalSeconds = Math.max(duration, 60) + graceSeconds;
  return Math.ceil((totalSeconds * 1000) / pollIntervalMs);
}
