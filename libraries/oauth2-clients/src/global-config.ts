import { FZKitPlugin, createFastifyPlugin } from '@fzkit/base/plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createPageTemplate } from './assets/page-template';
import type { UserData } from './user-data';

export interface OAuth2GlobalConfigOptions {
  /**
   * That can be used to redirect the user after the OAuth2 flow instead of returning the data.
   *
   * If set to true, the plugin will create two routes:
   * - /oauth2/success
   * - /oauth2/failure
   *
   * If set to an object, the plugin will create the routes with the paths defined in the object.
   *
   * @default undefined
   */
  redirectOnHandle?:
    | true
    | {
        successPath: string;
        failurePath: string;
      };
  dataProcessor?: ({
    data,
    request,
    reply,
  }: {
    data: UserData;
    request: FastifyRequest;
    reply: FastifyReply;
  }) => Promise<void>;
}

export interface OAuth2GlobalConfigInstance extends FastifyInstance {
  successRedirectPath?: string;
  failureRedirectPath?: string;
  failureException?: Error;
  setFailureException: (exception: Error) => void;
  dataProcessor?: ({
    data,
    request,
    reply,
  }: {
    data: UserData;
    request: FastifyRequest;
    reply: FastifyReply;
  }) => Promise<void>;
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
    scope.setFailureException = (exception: Error) => {
      scope.failureException = exception;
    };
    scope.dataProcessor = options.dataProcessor;
    if (options.redirectOnHandle !== undefined) {
      if (options.redirectOnHandle === true) {
        scope.successRedirectPath = '/oauth2/success';
        scope.failureRedirectPath = '/oauth2/failure';
      } else {
        scope.successRedirectPath = options.redirectOnHandle.successPath;
        scope.failureRedirectPath = options.redirectOnHandle.failurePath;
      }
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
											${scope.failureException ? `<pre>Error: ${scope.failureException.message}</pre>` : ''}
										</div>
						`,
            { documentTitle: 'Authentication Failure' },
          ),
        );
        scope.failureException = undefined;
      });
    }
    return Promise.resolve();
  }
}

export const OAuth2GlobalConfigPlugin = createFastifyPlugin(OAuth2GlobalConfigFZKitPlugin);
