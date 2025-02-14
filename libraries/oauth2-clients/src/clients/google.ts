import oauthPlugin, { type OAuth2Namespace } from '@fastify/oauth2';
import { httpClient } from '@fzkit/base/http-client';
import { FZKitPlugin, createFastifyPlugin } from '@fzkit/base/plugin';
import type { FastifyInstance } from 'fastify';
import { OAuth2GlobalConfigFZKitPlugin, type OAuth2GlobalConfigInstance } from '../global-config';

export interface GoogleOAuth2PluginInstance extends FastifyInstance, OAuth2GlobalConfigInstance {
  googleOAuth2: OAuth2Namespace;
}

export interface GoogleOAuth2PluginOptions {
  client: {
    id: string;
    secret: string;
  };
  startRedirectPath: string;
  callbackUri: string;
  scope: string[];
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
      startRedirectPath: options.startRedirectPath,
      callbackUri: options.callbackUri,
    });
    const callBackPath = new URL(options.callbackUri).pathname;
    scope.get(callBackPath, async (request, reply) => {
      try {
        const { token } = await scope.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
        const response = await httpClient.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        });
        const data = await response.json();
        await scope.dataProcessor?.({
          basicInfo: data,
          provider: 'google',
        });
        if (scope.successRedirectPath) {
          return reply.redirect(scope.successRedirectPath);
        }
        return reply.send(data);
      } catch (e) {
        if (scope.failureRedirectPath) {
          scope.setFailureException(e instanceof Error ? e : new Error('Failed to get user data'));
          return reply.redirect(scope.failureRedirectPath);
        }
        return reply.code(400).send({
          error: 'Failed to get user data',
        });
      }
    });
    return Promise.resolve();
  }
}

export const GoogleOAuth2Plugin = createFastifyPlugin(GoogleOAuth2FZKitPlugin);
