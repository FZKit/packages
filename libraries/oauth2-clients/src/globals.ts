import type { IncomingMessage, ServerResponse } from 'node:http';
export const sessionClients = new Map<string, ServerResponse<IncomingMessage>>();
