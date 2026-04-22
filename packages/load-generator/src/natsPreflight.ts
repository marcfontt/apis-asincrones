type NatsServerInfo = {
  max_payload?: number;
};

export function getNatsPayloadPreflightError(
  messageSizeBytes: number,
  serverInfo?: NatsServerInfo,
): string | null {
  if (!Number.isFinite(messageSizeBytes) || messageSizeBytes <= 0) {
    return null;
  }

  const maxPayload = serverInfo?.max_payload;
  if (!Number.isFinite(maxPayload) || maxPayload == null || maxPayload <= 0) {
    return null;
  }

  if (messageSizeBytes <= maxPayload) {
    return null;
  }

  return `Configured message size ${messageSizeBytes} bytes exceeds NATS max_payload ${maxPayload} bytes`;
}
