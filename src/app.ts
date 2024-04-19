/* eslint-disable node/no-extraneous-import */
require('dotenv').config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';
import typeDefs from './api/schemas/index';
import resolvers from './api/resolvers/index';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import {notFound, errorHandler} from './middlewares';
import authenticate from './functions/authenticate';
import {createRateLimitRule} from 'graphql-rate-limit';
import {shield} from 'graphql-shield';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {applyMiddleware} from 'graphql-middleware';
import {MyContext} from './types/MyContext';

const app = express();

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

(async () => {
  try {
    // TODO Create a rate limit rule instance (not WSK2 course)
    const rateLimitRule = createRateLimitRule({
      identifyContext: (ctx) => ctx.id,
    });

    // TODO Create a permissions object (not WSK2 course)
    const permissions = shield({
      Query: {
        users: rateLimitRule({max: 1000, window: '1m'}),
        userById: rateLimitRule({max: 1000, window: '1m'}),
        checkToken: rateLimitRule({max: 1000, window: '1m'}),
        catById: rateLimitRule({max: 1000, window: '1m'}),
        cats: rateLimitRule({max: 1000, window: '1m'}),
        catsByArea: rateLimitRule({max: 1000, window: '1m'}),
        catsByOwner: rateLimitRule({max: 1000, window: '1m'}),
      },
      Mutation: {
        login: rateLimitRule({max: 1000, window: '1m'}),
        register: rateLimitRule({max: 1000, window: '1m'}),
        updateUser: rateLimitRule({max: 1000, window: '1m'}),
        deleteUser: rateLimitRule({max: 1000, window: '1m'}),
        updateUserAsAdmin: rateLimitRule({max: 1000, window: '1m'}),
        deleteUserAsAdmin: rateLimitRule({max: 1000, window: '1m'}),
        createCat: rateLimitRule({max: 1000, window: '1m'}),
        updateCat: rateLimitRule({max: 1000, window: '1m'}),
        deleteCat: rateLimitRule({max: 1000, window: '1m'}),
      },
    });

    const schema = applyMiddleware(
      makeExecutableSchema({
        typeDefs,
        resolvers,
      }),
      permissions,
    );

    const server = new ApolloServer<MyContext>({
      schema,
      introspection: true,
      plugins: [
        process.env.NODE_ENV === 'production'
          ? ApolloServerPluginLandingPageProductionDefault({
              embed: true as false,
            })
          : ApolloServerPluginLandingPageLocalDefault(),
      ],
      includeStacktraceInErrorResponses: false,
    });
    await server.start();

    app.use(
      '/graphql',
      cors<cors.CorsRequest>(),
      express.json(),
      expressMiddleware(server, {
        context: async ({req}) => authenticate(req),
      }),
    );

    app.use(notFound);
    app.use(errorHandler);
  } catch (error) {
    console.log(error);
  }
})();

export default app;
