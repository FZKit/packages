import type { IncomingMessage, ServerResponse } from 'node:http';
import { FZKitPlugin, createFastifyPlugin } from '@fzkit/base/plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createPageTemplate } from './assets/page-template';
import type { UserData } from './user-data';

interface CommonOptions {
  applicationUrl: string;
  dataProcessor?: ({
    data,
    request,
    reply,
    sseDispatcher,
  }: {
    data: UserData;
    request: FastifyRequest;
    reply: FastifyReply;
    sseDispatcher: (data: Record<string, unknown>) => void;
  }) => Promise<void>;
  errorProcessor?: ({
    error,
    request,
    reply,
    sseDispatcher,
  }: {
    error: Error;
    request: FastifyRequest;
    reply: FastifyReply;
    sseDispatcher: (data: Record<string, unknown>) => void;
  }) => Promise<void>;
  sseCorsOrigin?:
    | string
    | string[]
    | ((origin: string, callback: (error: Error | null, allow?: boolean) => void) => void);
}

export interface OAuth2GlobalConfigOptions extends CommonOptions {
  /**
   * That can be used to redirect the user after the OAuth2 flow instead of returning the data.
   *
   * If set to true, the plugin will create two routes:
   * - /oauth2/success
   * - /oauth2/failure
   *
   * If you want to redirect the user to a different path, you can set this to false and create your own routes and redirect on process data.
   *
   * @default undefined
   */
  redirectOnHandle?: boolean;
}

const authClients = new Map<string, ServerResponse<IncomingMessage>>();

export interface OAuth2GlobalConfigInstance extends FastifyInstance, CommonOptions {
  successRedirectPath?: string;
  failureRedirectPath?: string;
  failureException?: Error;
  setFailureException: (exception: Error) => void;
  authClients: typeof authClients;
}

export class OAuth2GlobalConfigFZKitPlugin extends FZKitPlugin<
  OAuth2GlobalConfigInstance,
  OAuth2GlobalConfigOptions
> {
  encapsulate = false;
  protected plugin(
    scope: OAuth2GlobalConfigInstance,
    options: OAuth2GlobalConfigOptions,
  ): Promise<void> {
    scope.authClients = authClients;
    scope.applicationUrl = options.applicationUrl;
    scope.dataProcessor = options.dataProcessor;
    scope.setFailureException = (exception: Error) => {
      scope.failureException = exception;
    };
    if (options.redirectOnHandle) {
      scope.successRedirectPath = '/oauth2/success';
      scope.failureRedirectPath = '/oauth2/failure';
      scope.get(scope.successRedirectPath, async (request, reply) => {
        reply.type('text/html').send(
          createPageTemplate(
            /*html*/ `
										<div id="app-body-base">
											<h3>Authentication Success</h3>
											<h5>You can close this window and return to the application</h5>
										</div>
						`,
            { documentTitle: 'Authentication Failure' },
          ),
        );
      });
      scope.get(scope.failureRedirectPath, async (request, reply) => {
        reply.type('text/html').send(
          createPageTemplate(
            /*html*/ `
										<div id="app-body-base">
											<h3>Authentication Failure</h3>
											<h5>You can close this window and return to the application to try again</h5>
											${
                        scope.failureException
                          ? `<pre>Error: ${scope.failureException.message}</pre>`
                          : ''
                      }
										</div>
						`,
            { documentTitle: 'Authentication Failure' },
          ),
        );
        scope.failureException = undefined;
      });
    }
    scope.post('/oauth2/status', async (request, reply) => {
      const sessionId = crypto.randomUUID();
      reply.send({ sessionId });
    });
    scope.get<{ Params: { sessionId: string } }>('/oauth2/status/:sessionId', (request, reply) => {
      const sessionId = request.params.sessionId;
      if (!sessionId) return reply.status(400).send({ error: 'Missing session id' });
      const rawOrigin = options.sseCorsOrigin;
      const requestOrigin = request.headers.origin;
      let origin = '*';
      if (typeof rawOrigin === 'string') {
        origin = rawOrigin;
      } else if (Array.isArray(rawOrigin)) {
        origin = rawOrigin.join(' ');
      } else if (typeof rawOrigin === 'function' && requestOrigin) {
        rawOrigin(requestOrigin, (err, allow) => {
          if (err || !allow) {
            reply.status(403).send({ error: 'CORS not allowed' });
            return;
          }
          origin = requestOrigin;
        });
      }
      if (!origin) {
        reply.status(403).send({ error: 'CORS not allowed' });
        return;
      }
      reply.raw
        .setHeader('Content-Type', 'text/event-stream')
        .setHeader('Cache-Control', 'no-cache')
        .setHeader('Connection', 'keep-alive')
        .setHeader('Access-Control-Allow-Origin', origin);
      scope.authClients.set(sessionId, reply.raw);
      request.raw.on('close', () => {
        scope.authClients.delete(sessionId);
      });
    });
    return Promise.resolve();
  }
}

export const OAuth2GlobalConfigPlugin = createFastifyPlugin(OAuth2GlobalConfigFZKitPlugin);
