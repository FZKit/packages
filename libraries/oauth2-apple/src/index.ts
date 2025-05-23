import oauthPlugin, { type OAuth2Namespace } from '@fastify/oauth2';
import { FZKitPlugin, createFastifyPlugin } from '@fzkit/base/plugin';
import {
  type AppleUserData,
  OAuth2BaseConfigFZKitPlugin,
  type OAuth2BaseConfigInstance,
  callbackExecutor,
  setupStartRedirect,
} from '@fzkit/oauth2-base';
import { getClientSecret, verifyIdToken } from 'apple-signin-auth';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface AppleOAuthUserFirstAccess {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AppleOAuth2PluginInstance extends FastifyInstance, OAuth2BaseConfigInstance {
  appleOAuth2: OAuth2Namespace;
  onFirstAccess: (data: AppleOAuthUserFirstAccess) => Promise<void>;
}

export interface AppleOAuth2PluginOptions {
  credentials: {
    clientId: string;
    teamId: string;
    privateKey: string;
    keyId: string;
    expiresIn?: number;
  };
  scope: string[];
  startRedirectPath?: string;
  callbackPath?: string;
  cookiePath?: string;
  onFirstAccess: (data: AppleOAuthUserFirstAccess) => Promise<void>;
}

class AppleOAuth2FZKitPlugin extends FZKitPlugin<
  AppleOAuth2PluginInstance,
  AppleOAuth2PluginOptions
> {
  dependencies = [OAuth2BaseConfigFZKitPlugin.name];

  protected plugin(
    scope: AppleOAuth2PluginInstance,
    options: AppleOAuth2PluginOptions,
  ): Promise<void> {
    const callbackUri = `${scope.applicationUrl}${
      options.callbackPath || '/oauth2/apple/callback'
    }`;
    const startRedirectPath = options.startRedirectPath || '/oauth2/apple/login';
    const cookiePath = options.cookiePath || '/oauth2';
    options.startRedirectPath = startRedirectPath;
    options.cookiePath = cookiePath;
    scope.onFirstAccess = options.onFirstAccess;
    this.registerClient(scope, { ...options, callbackUri });
    setupStartRedirect(scope, {
      cookiePath: options.cookiePath,
      namespace: 'appleOAuth2',
      startRedirectPath: options.startRedirectPath,
      cookieSameSiteNone: true,
    });
    callbackExecutor(
      scope,
      (request) =>
        this.setupCallback({
          scope,
          request,
          clientId: options.credentials.clientId,
        }),
      {
        callbackPath: new URL(callbackUri).pathname,
        cookiePath: options.cookiePath,
        method: 'post',
      },
    );
    return Promise.resolve();
  }

  private registerClient(
    scope: AppleOAuth2PluginInstance,
    options: AppleOAuth2PluginOptions & { callbackUri: string },
  ) {
    const secret = getClientSecret({
      clientID: options.credentials.clientId,
      teamID: options.credentials.teamId,
      privateKey: options.credentials.privateKey,
      keyIdentifier: options.credentials.keyId,
      expAfter: options.credentials.expiresIn,
    });
    scope.register(oauthPlugin, {
      name: 'appleOAuth2',
      scope: options.scope,
      cookie: {
        sameSite: 'none',
        secure: true,
      },
      credentials: {
        client: {
          id: options.credentials.clientId,
          secret,
        },
        auth: oauthPlugin.APPLE_CONFIGURATION,
        options: {
          authorizationMethod: 'body',
        },
      },
      startRedirectPath: options.startRedirectPath,
      callbackUri: options.callbackUri,
    });
  }

  private async setupCallback({
    request,
    scope,
    clientId,
  }: {
    request: FastifyRequest;
    scope: AppleOAuth2PluginInstance;
    clientId: string;
  }): Promise<AppleUserData> {
    const data = (
      (request.body as Record<string, unknown>).code ? request.body : request.query
    ) as {
      code: string;
      state: string;
      error: string;
      user?: string;
    };
    const { code, state, error, user } = data;
    const parsedUser = user ? JSON.parse(user) : null;
    if (parsedUser) {
      try {
        await scope.onFirstAccess({
          firstName: parsedUser.name.firstName,
          lastName: parsedUser.name.lastName,
          email: parsedUser.email,
        });
      } catch (e) {
        scope.log.error(e);
        scope.log.debug(user);
      }
    }
    if (!state) {
      throw new Error('Illegal invoking of endpoint.');
    }
    if (error) {
      throw new Error(error);
    }
    const {
      token: { id_token },
    } = await scope.appleOAuth2.getAccessTokenFromAuthorizationCodeFlow({
      ...request,
      query: { code, state },
    });
    if (!id_token) {
      throw new Error('No id_token found.');
    }
    const rawData = await verifyIdToken(id_token, clientId);
    return {
      data: rawData,
      provider: 'apple',
    };
  }
}

export const AppleOAuth2Plugin = createFastifyPlugin(AppleOAuth2FZKitPlugin);
