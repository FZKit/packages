import fastifyCors from '@fastify/cors';
import { GoogleOAuth2Plugin, OAuth2GlobalConfigPlugin } from '@fzkit/oauth2-clients';
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });
// enable cors to allow the client to make requests to the server for status tracking
fastify.register(fastifyCors, {
  origin: '*',
  methods: ['POST'],
});
fastify.register(OAuth2GlobalConfigPlugin, {
  applicationUrl: 'http://127.0.0.1:3000',
  async dataProcessor({ data, reply, sseDispatcher }) {
    try {
      // process data manually (save to database, etc)
      sseDispatcher(data);
      reply.send(data);
      // or redirect to a success page
      // reply.redirect("/my-success-page")
    } catch {
      sseDispatcher({ error: 'An error occurred' });
    }
  },
  async errorProcessor({ error, reply, sseDispatcher }) {
    // process error manually
    sseDispatcher({ error: error.message });
    reply.send({ error: error.message });
    // or redirect to a failure page
    // reply.redirect("/my-failure-page")
  },
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
