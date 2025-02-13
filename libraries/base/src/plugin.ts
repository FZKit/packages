import type {
	FastifyInstance,
	FastifyPluginCallback,
	FastifyPluginOptions,
} from "fastify";
import fp, { type PluginMetadata } from "fastify-plugin";

export abstract class FZKitPlugin<
	T extends FastifyInstance,
	U extends FastifyPluginOptions = Record<never, never>,
> {
	dependencies: PluginMetadata["dependencies"] = undefined;
	decorators: PluginMetadata["decorators"] = undefined;
	encapsulate: PluginMetadata["encapsulate"] = true;

	register() {
		return fp<U>(
			async (scope, options) => {
				try {
					await this.plugin(scope as T, options);
				} catch (error) {
					scope.log.error(
						error,
						`Error registering "${this.constructor.name}" plugin`,
					);
					throw error;
				}
				scope.log.info(`[${this.constructor.name}] plugin registered`);
			},
			{
				name: this.constructor.name,
				fastify: "5.x",
				dependencies: this.dependencies,
				decorators: this.decorators,
				encapsulate: this.encapsulate,
			},
		);
	}

	protected abstract plugin(scope: T, options?: U): Promise<void>;
}

export function createFastifyPlugin<
	T extends FastifyInstance,
	U extends FastifyPluginOptions,
>(Plugin: new () => FZKitPlugin<T, U>): FastifyPluginCallback<U> {
	return new Plugin().register();
}
