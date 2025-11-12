import { FZKitPlugin, createFastifyPlugin } from '@fzkit/base/plugin';
import { PrintRoutesPlugin } from '@fzkit/print-routes';
import Fastify, { type FastifyInstance } from 'fastify';

export interface BaseExamplePluginInstance extends FastifyInstance {}

export class BaseExamplePlugin extends FZKitPlugin<BaseExamplePluginInstance> {
  protected plugin(
    scope: BaseExamplePluginInstance,
    options?: Record<never, never> | undefined,
  ): Promise<void> {
    scope.get('/', async () => {
      return { hello: 'world' };
    });
    scope.get('/hello', async () => {
      return { hello: 'fzkit' };
    });
    scope.post('/hello', async () => {
      return { hello: 'fzkit' };
    });
    scope.put('/hello', async () => {
      return { hello: 'fzkit' };
    });
    scope.delete('/hello', async () => {
      return { hello: 'fzkit' };
    });
    scope.post('/goodbye', async () => {
      return { goodbye: 'fzkit' };
    });
    scope.get('/nested/route', async () => {
      return { nested: 'route' };
    });
    scope.get('/another/nested/route', async () => {
      return { another: 'nested route' };
    });
    scope.get('/with/:param', async (request) => {
      return { params: request.params };
    });
    scope.get('/with/:param/and/:anotherParam', async (request) => {
      return { params: request.params };
    });
    scope.get('/with/:param/and/:anotherParam/and/:yetAnotherParam', async (request) => {
      return { params: request.params };
    });

    return Promise.resolve();
  }
}
const fastify = Fastify({ logger: true });
fastify.register(createFastifyPlugin(PrintRoutesPlugin));
fastify.register(createFastifyPlugin(BaseExamplePlugin));

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
