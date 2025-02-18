import oauthPlugin, { type OAuth2Namespace } from '@fastify/oauth2';
import { httpClient } from '@fzkit/base/http-client';
import { FZKitPlugin, createFastifyPlugin } from '@fzkit/base/plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { OAuth2GlobalConfigFZKitPlugin, type OAuth2GlobalConfigInstance } from '../global-config';
import type { UserData } from '../user-data';

export interface GoogleOAuth2PluginInstance extends FastifyInstance, OAuth2GlobalConfigInstance {
  googleOAuth2: OAuth2Namespace;
}

export interface GoogleOAuth2PluginOptions {
  client: {
    id: string;
    secret: string;
  };
  scope: string[];
  startRedirectPath?: string;
  callbackPath?: string;
  cookiePath?: string;
}

class GoogleOAuth2FZKitPlugin extends FZKitPlugin<
  GoogleOAuth2PluginInstance,
  GoogleOAuth2PluginOptions
> {
  dependencies = [OAuth2GlobalConfigFZKitPlugin.name];

  protected plugin(
    scope: GoogleOAuth2PluginInstance,
    options: GoogleOAuth2PluginOptions,
  ): Promise<void> {
    const callbackUri = `${scope.applicationUrl}${options.callbackPath || '/oauth2/google/callback'}`;
    const startRedirectPath = options.startRedirectPath || '/oauth2/google/login';
    const cookiePath = options.cookiePath || '/oauth2';
    scope.register(oauthPlugin, {
      name: 'googleOAuth2',
      scope: options.scope,
      credentials: {
        client: {
          id: options.client.id,
          secret: options.client.secret,
        },
        auth: oauthPlugin.GOOGLE_CONFIGURATION,
      },
      startRedirectPath,
      callbackUri: callbackUri,
      cookie: {
        path: cookiePath,
      },
    });
    const callBackPath = new URL(callbackUri).pathname;
    function sendSseDataEvent({
      request,
      data,
      close = true,
    }: { request: FastifyRequest; data: Record<string, unknown>; close?: boolean }) {
      const sessionId = request.cookies.sessionId;
      if (sessionId && scope.authClients.has(sessionId)) {
        // biome-ignore lint/style/noNonNullAssertion: This is a valid check
        const channel = scope.authClients.get(sessionId)!;
        channel.write(`data: ${JSON.stringify(data)}\n\n`);
        if (close) {
          channel.end();
        }
      }
    }
    scope.get<{ Params: { sessionId: string } }>(
      `${startRedirectPath}/:sessionId`,
      async (request, reply) => {
        const uri = await scope.googleOAuth2.generateAuthorizationUri(request, reply);
        reply
          .setCookie('sessionId', request.params.sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            path: cookiePath,
          })
          .redirect(`${uri}&sessionId=${request.params.sessionId}`);
      },
    );
    scope.get(callBackPath, async (request, reply) => {
      try {
        const { token } = await scope.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
        const response = await httpClient.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        });
        const rawData = await response.json();
        const data = { basicInfo: rawData, provider: 'google' } as UserData;
        if (scope.dataProcessor) {
          await scope.dataProcessor({
            data,
            request,
            reply,
            sseDispatcher: (callbackData) => sendSseDataEvent({ request, data: callbackData }),
          });
          return;
        }
        sendSseDataEvent({ request, data });
        if (scope.successRedirectPath) {
          return reply.redirect(scope.successRedirectPath);
        }
        return reply.send(rawData);
      } catch (e) {
        const defaultErrorMessage = 'Failed to get user data';
        const isInstanceOfError = e instanceof Error;
        const errorObject = { error: isInstanceOfError ? e.message : defaultErrorMessage };
        const errorInstance = isInstanceOfError ? e : new Error(defaultErrorMessage);
        if (scope.errorProcessor) {
          await scope.errorProcessor({
            error: errorInstance,
            request,
            reply,
            sseDispatcher: (callbackData) => sendSseDataEvent({ request, data: callbackData }),
          });
          return;
        }
        sendSseDataEvent({ request, data: errorObject });
        if (scope.failureRedirectPath) {
          scope.setFailureException(errorInstance);
          return reply.redirect(scope.failureRedirectPath);
        }
        return reply.code(400).send(errorObject);
      }
    });
    return Promise.resolve();
  }
}

export const GoogleOAuth2Plugin = createFastifyPlugin(GoogleOAuth2FZKitPlugin);
