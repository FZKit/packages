import type { OAuth2Namespace } from "@fastify/oauth2";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { OAuth2BaseConfigInstance } from "./base-config";
import { sessionClients } from "./globals";
import type { UserData } from "./user-data";

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

export function setupStartRedirect<T extends FastifyInstance>(
  scope: T,
  options: {
    startRedirectPath: string;
    cookiePath: string;
    namespace: keyof T;
  }
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
        .setCookie("session_id", request.params.sessionId, {
          httpOnly: true,
          sameSite: "lax",
          path: options.cookiePath,
        })
        .redirect(`${uri}&session_id=${request.params.sessionId}`);
    }
  );
}

export function callbackExecutor<T extends OAuth2BaseConfigInstance>(
  scope: T,
  callback: (
    request: FastifyRequest
  ) => Promise<{ parsed: UserData; raw: unknown }>,
  options: { callbackPath: string; cookiePath: string }
) {
  scope.get(options.callbackPath, async (request, reply) => {
    const sessionId = request.cookies.session_id;
    try {
      const { parsed, raw } = await callback(request);
      if (scope.dataProcessor) {
        await scope.dataProcessor({
          data: parsed,
          request,
          reply,
          sseDispatcher: (callbackData) =>
            sseSendJsonData({
              sessionId,
              data: callbackData,
            }),
        });
        return;
      }
      sseSendJsonData({
        sessionId,
        data: parsed,
      });
      if (scope.successRedirectPath) {
        return reply.redirect(scope.successRedirectPath);
      }
      return reply.send(raw);
    } catch (e) {
      const defaultErrorMessage = "Failed to get user data";
      const isInstanceOfError = e instanceof Error;
      const errorObject = {
        error: isInstanceOfError ? e.message : defaultErrorMessage,
      };
      const errorInstance = isInstanceOfError
        ? e
        : new Error(defaultErrorMessage);
      if (scope.errorProcessor) {
        await scope.errorProcessor({
          error: errorInstance,
          request,
          reply,
          sseDispatcher: (callbackData) =>
            sseSendJsonData({
              sessionId,
              data: callbackData,
            }),
        });
        return;
      }
      sseSendJsonData({
        sessionId,
        data: errorObject,
      });
      if (scope.failureRedirectPath) {
        scope.setFailureException(errorInstance);
        return reply.redirect(scope.failureRedirectPath);
      }
      return reply.code(400).send(errorObject);
    }
  });
}
