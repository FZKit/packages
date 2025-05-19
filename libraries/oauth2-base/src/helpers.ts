import type { OAuth2Namespace } from '@fastify/oauth2';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { OAuth2BaseConfigInstance } from './base-config';
import { sessionClients } from './globals';
import type { UserData } from './user-data';

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
      channel.write('event: close\n\n');
      channel.end();
      sessionClients.delete(sessionId);
    }
  }
}

export function setupStartRedirect<T extends FastifyInstance>(
  scope: T,
  options: {
    startRedirectPath: string;
    cookiePath: string;
    namespace: keyof T;
  },
) {
  scope.get<{ Params: { sessionId: string } }>(
    `${options.startRedirectPath}/:sessionId`,
    async (request, reply) => {
      const namespace = scope[options.namespace] as unknown as OAuth2Namespace;
      if (!namespace) {
        throw new Error(`Namespace ${namespace} not found`);
      }
      const uri = await namespace.generateAuthorizationUri(request, reply);
      reply
        .setCookie('session_id', request.params.sessionId, {
          httpOnly: true,
          sameSite: 'lax',
          path: options.cookiePath,
        })
        .redirect(`${uri}&session_id=${request.params.sessionId}`);
    },
  );
}

// TODO: add request schema
export function callbackExecutor<T extends OAuth2BaseConfigInstance>(
  scope: T,
  callback: (request: FastifyRequest) => Promise<UserData>,
  options: { callbackPath: string; cookiePath: string; method?: 'post' | 'get' },
) {
  scope[options.method ?? 'get'](options.callbackPath, async (request, reply) => {
    const sessionId = request.cookies.session_id;
    try {
      const data = await callback(request);
      await scope.dataProcessor({
        data,
        request,
        reply,
        sseDispatcher: (callbackData, close = false) =>
          sseSendJsonData({
            sessionId,
            data: callbackData,
            close,
          }),
      });
      return;
    } catch (e) {
      const defaultErrorMessage = 'Failed to get user data';
      const isInstanceOfError = e instanceof Error;
      const errorInstance = isInstanceOfError ? e : new Error(defaultErrorMessage);
      await scope.errorProcessor({
        error: errorInstance,
        request,
        reply,
        sseDispatcher: (callbackData, close = false) =>
          sseSendJsonData({
            sessionId,
            data: callbackData,
            close,
          }),
      });
      return;
    }
  });
}
