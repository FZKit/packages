import oauthPlugin, { type OAuth2Namespace } from "@fastify/oauth2";
import { httpClient } from "@fzkit/base/http-client";
import { FZKitPlugin, createFastifyPlugin } from "@fzkit/base/plugin";
import {
  OAuth2BaseConfigFZKitPlugin,
  type OAuth2BaseConfigInstance,
  type UserData,
  sseSendJsonData,
} from "@fzkit/oauth2-base";
import type { FastifyInstance } from "fastify";

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
    this.setupStartRedirect(scope, options);
    this.setupCallback(scope, { ...options, callbackUri });
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

  private setupStartRedirect(
    scope: GoogleOAuth2PluginInstance,
    options: GoogleOAuth2PluginOptions
  ) {
    scope.get<{ Params: { sessionId: string } }>(
      `${options.startRedirectPath}/:sessionId`,
      async (request, reply) => {
        const uri = await scope.googleOAuth2.generateAuthorizationUri(
          request,
          reply
        );
        reply
          .setCookie("sessionId", request.params.sessionId, {
            httpOnly: true,
            sameSite: "lax",
            path: options.cookiePath,
          })
          .redirect(`${uri}&sessionId=${request.params.sessionId}`);
      }
    );
  }

  private setupCallback(
    scope: GoogleOAuth2PluginInstance,
    options: GoogleOAuth2PluginOptions & { callbackUri: string }
  ) {
    const callBackPath = new URL(options.callbackUri).pathname;
    scope.get(callBackPath, async (request, reply) => {
      const sessionId = request.cookies.sessionId;
      try {
        const { token } =
          await scope.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
            request
          );
        const response = await httpClient.get(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
            },
          }
        );
        const rawData = await response.json();
        const data = { basicInfo: rawData, provider: "google" } as UserData;
        if (scope.dataProcessor) {
          await scope.dataProcessor({
            data,
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
          data,
        });
        if (scope.successRedirectPath) {
          return reply.redirect(scope.successRedirectPath);
        }
        return reply.send(rawData);
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
}

export const GoogleOAuth2Plugin = createFastifyPlugin(GoogleOAuth2FZKitPlugin);
