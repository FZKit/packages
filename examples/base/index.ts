import { FZKitPlugin, createFastifyPlugin } from "@fzkit/base/plugin";
import Fastify, { type FastifyInstance } from "fastify";

export interface BaseExamplePluginInstance extends FastifyInstance {}

export class BaseExamplePlugin extends FZKitPlugin<BaseExamplePluginInstance> {
	protected plugin(
		scope: BaseExamplePluginInstance,
		options?: Record<never, never> | undefined,
	): Promise<void> {
		scope.get("/", async () => {
			return { hello: "world" };
		});

		return Promise.resolve();
	}
}
const fastify = Fastify({ logger: true });
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
