import { GoogleOAuth2Plugin, OAuth2GlobalConfigPlugin } from '@fzkit/oauth2-clients';
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });
fastify.register(OAuth2GlobalConfigPlugin, {
  redirectOnHandle: true,
  async dataProcessor(data) {
    // process data, save to database, etc
    console.log(data);
  },
});
fastify.register(GoogleOAuth2Plugin, {
  client: {
    id: '<CLIENT_ID>',
    secret: '<CLIENT_SECRET>',
  },
  scope: ['profile'],
  startRedirectPath: '/oauth2/google/login',
  callbackUri: 'http://127.0.0.1:3000/oauth2/google/callback',
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
