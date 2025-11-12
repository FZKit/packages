import { FZKitPlugin } from '@fzkit/base';
import type { FastifyInstance } from 'fastify';

export interface PrintRoutesInstance extends FastifyInstance {}

type Route = { name: string; methods: Array<string>; routes?: Routes };
type Routes = Array<Route>;

export class PrintRoutesPlugin extends FZKitPlugin<PrintRoutesInstance> {
  override encapsulate = false;

  private routes!: Route;

  protected override async plugin(app: PrintRoutesInstance): Promise<void> {
    this.routes = {
      name: 'Routes',
      methods: [],
      routes: [],
    };

    app.addHook('onRoute', (route) => {
      this.addRoute(route);
    });

    app.addHook('onReady', () => {
      this.sortRoutes();
      this.printRoute();
    });
  }

  private addRoute(route: { url: string; method: string | Array<string> }, father = this.routes) {
    const [routeName, ...rest] = route.url.startsWith('/')
      ? route.url.replace('/', '').split('/')
      : route.url.split('/');
    const currentMethods = Array.isArray(route.method) ? route.method : [route.method];

    if (currentMethods.some((method) => ['HEAD', 'OPTIONS'].includes(method))) {
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

  private printRoute(route = this.routes, isLast = true, deep = 0, prefix = '') {
    const nextPrefix = prefix.replaceAll(' ├──', ' │  ').replaceAll(' └──', '    ');
    const displayPrefix = deep === 0 ? '' : `${nextPrefix}${isLast ? ' └──' : ' ├──'}`;
    if (route) {
      const stringMethods = route.methods.length ? `(${route.methods.join(', ')})` : '';

      console.log(displayPrefix, deep === 0 ? route.name : `/${route.name}`, stringMethods);

      if (!this.routes.routes?.length) {
        console.log(
          ' ├── No routes found',
          '\n └── Make sure you have registered the PrintRoutesPlugin before registering the routes',
        );
      }

      for (const index in route.routes) {
        if (route.routes) {
          this.printRoute(
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
