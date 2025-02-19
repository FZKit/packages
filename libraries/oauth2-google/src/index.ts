import oauthPlugin, { type OAuth2Namespace } from "@fastify/oauth2";
import { httpClient } from "@fzkit/base/http-client";
import { FZKitPlugin, createFastifyPlugin } from "@fzkit/base/plugin";
import {
  type GoogleUserData,
  OAuth2BaseConfigFZKitPlugin,
  type OAuth2BaseConfigInstance,
  callbackExecutor,
  setupStartRedirect,
} from "@fzkit/oauth2-base";
import type { FastifyInstance, FastifyRequest } from "fastify";

export interface GoogleOAuth2PluginInstance
  extends FastifyInstance,
    OAuth2BaseConfigInstance {
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
  dependencies = [OAuth2BaseConfigFZKitPlugin.name];

  protected plugin(
    scope: GoogleOAuth2PluginInstance,
    options: GoogleOAuth2PluginOptions
  ): Promise<void> {
    const callbackUri = `${scope.applicationUrl}${
      options.callbackPath || "/oauth2/google/callback"
    }`;
    const startRedirectPath =
      options.startRedirectPath || "/oauth2/google/login";
    const cookiePath = options.cookiePath || "/oauth2";
    options.startRedirectPath = startRedirectPath;
    options.cookiePath = cookiePath;
    this.registerClient(scope, { ...options, callbackUri });
    setupStartRedirect(scope, {
      cookiePath: options.cookiePath,
      namespace: "googleOAuth2",
      startRedirectPath: options.startRedirectPath,
    });
    callbackExecutor(scope, (request) => this.setupCallback(scope, request), {
      callbackPath: new URL(callbackUri).pathname,
      cookiePath: options.cookiePath,
    });
    return Promise.resolve();
  }

  private registerClient(
    scope: GoogleOAuth2PluginInstance,
    options: GoogleOAuth2PluginOptions & { callbackUri: string }
  ) {
    scope.register(oauthPlugin, {
      name: "googleOAuth2",
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
      cookie: {
        path: options.cookiePath,
      },
    });
  }

  private async setupCallback(
    scope: GoogleOAuth2PluginInstance,
    request: FastifyRequest
  ): Promise<{ parsed: GoogleUserData; raw: unknown }> {
    const { token } =
      await scope.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    const response = await httpClient.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      }
    );
    const rawData = await response.json();
    return {
      parsed: { basicInfo: rawData, provider: "google" } as GoogleUserData,
      raw: rawData,
    };
  }
}

export const GoogleOAuth2Plugin = createFastifyPlugin(GoogleOAuth2FZKitPlugin);
