import { sessionClients } from './globals';

export function sseSendJsonData({
  sessionId,
  data,
  close = true,
}: {
  sessionId: string | undefined;
  data: Record<string, unknown>;
  close?: boolean;
}) {
  if (sessionId && sessionClients.has(sessionId)) {
    // biome-ignore lint/style/noNonNullAssertion: This is a valid check
    const channel = sessionClients.get(sessionId)!;
    channel.write(`data: ${JSON.stringify(data)}\n\n`);
    if (close) {
      channel.end();
    }
  }
}
