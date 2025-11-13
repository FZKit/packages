import { FZKitPlugin } from '@fzkit/base';
import type { FastifyInstance } from 'fastify';

export interface PrintRoutesInstance extends FastifyInstance {}

type HTTPMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

type Route = {
  name: string;
  methods: Array<string>;
  routes?: Routes;
};
type Routes = Array<Route>;

export interface PrintRoutesOptions {
  methodsToHide?: HTTPMethods[];
  // biome-ignore lint/suspicious/noExplicitAny: logger can have any signature
  logger?: (...args: any[]) => void;
}

export class PrintRoutesPlugin extends FZKitPlugin<PrintRoutesInstance, PrintRoutesOptions> {
  override encapsulate = false;

  private routes!: Route;

  protected override async plugin(
    scope: PrintRoutesInstance,
    { methodsToHide = ['HEAD', 'OPTIONS'], logger = console.log }: PrintRoutesOptions,
  ): Promise<void> {
    this.routes = {
      name: 'Routes',
      methods: [],
      routes: [],
    };

    scope.addHook('onRoute', (route) => {
      this.addRoute(methodsToHide, route);
    });

    scope.addHook('onReady', () => {
      this.sortRoutes();
      this.printRoute(logger);
    });
  }

  private addRoute(
    methodsToHide: Required<PrintRoutesOptions>['methodsToHide'],
    route: { url: string; method: string | Array<string> },
    father = this.routes,
  ) {
    const [routeName, ...rest] = route.url.startsWith('/')
      ? route.url.replace('/', '').split('/')
      : route.url.split('/');
    const currentMethods = Array.isArray(route.method) ? route.method : [route.method];

    if (currentMethods.some((method) => methodsToHide.includes(method as HTTPMethods))) {
      return;
    }

    if (father.routes) {
      const currentRoute = father.routes.find((r) => r.name === routeName);

      if (!currentRoute) {
        const methods: Array<string> = [];

        if (!rest.length || (rest.length === 1 && rest[0] === '')) {
          for (const currentMethod of currentMethods) {
            if (!methods.includes(currentMethod)) {
              methods.push(currentMethod);
            }
          }
        }

        father.routes.push({
          name: routeName || '',
          methods,
          routes: [],
        });
      } else {
        if (!rest.length || (rest.length === 1 && rest[0] === '')) {
          for (const currentMethod of currentMethods) {
            if (!currentRoute.methods.includes(currentMethod)) {
              currentRoute.methods.push(currentMethod);
            }
          }
        }
      }

      const path = rest.join('/');
      if (path) {
        this.addRoute(
          methodsToHide,
          { url: path, method: route.method },
          father.routes.find((r) => r.name === routeName),
        );
      }
    }
  }

  private sortRoutes(route = this.routes) {
    if (route.routes) {
      route.routes.sort((a, b) => (a.name < b.name ? -1 : 1));

      for (const currentRoute of route.routes) {
        this.sortRoutes(currentRoute);
      }
    }
  }

  private printRoute(
    logger: Required<PrintRoutesOptions>['logger'],
    route = this.routes,
    isLast = true,
    deep = 0,
    prefix = '',
  ) {
    const nextPrefix = prefix.replaceAll(' ├──', ' │  ').replaceAll(' └──', '    ');
    const displayPrefix = deep === 0 ? '' : `${nextPrefix}${isLast ? ' └──' : ' ├──'}`;
    if (route) {
      const stringMethods = route.methods.length ? `(${route.methods.join(', ')})` : '';

      logger(displayPrefix, deep === 0 ? route.name : `/${route.name}`, stringMethods);

      if (!this.routes.routes?.length) {
        logger(
          ' ├── No routes found',
          '\n └── Make sure you have registered the PrintRoutesPlugin before registering the routes',
        );
      }

      for (const index in route.routes) {
        if (route.routes) {
          this.printRoute(
            logger,
            route.routes[+index],
            +index === route.routes.length - 1,
            deep + 1,
            displayPrefix,
          );
        }
      }
    }
  }
}
