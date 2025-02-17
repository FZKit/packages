import cors from '@fastify/cors';
import { GoogleOAuth2Plugin, OAuth2GlobalConfigPlugin } from '@fzkit/oauth2-clients';
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: ['http://127.0.0.1:5500'], credentials: true });
fastify.register(OAuth2GlobalConfigPlugin, {
  applicationUrl: 'http://127.0.0.1:3000',
  sseCorsOrigin: ['http://127.0.0.1:5500', 'http://127.0.0.1:3001'],
});
fastify.register(GoogleOAuth2Plugin, {
  client: {
    id: '<CLIENT_ID>',
    secret: '<CLIENT_SECRET>',
  },
  scope: ['profile'],
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
