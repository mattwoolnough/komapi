// Dependencies
import test from 'ava';
import { agent as request } from 'supertest';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import Komapi from '../../../../src/index';

// Tests
test('provides routes for all common rest operations', async (t) => {
  const app = new Komapi();
  const params = { auth: null, query: {} };
  app.use(bodyParser());
  const fullBody = {
    key1: 'value1',
    key2: 'value2',
  };
  const patchBody = {
    key2: 'value2',
  };
  app.services(path.join(__dirname, '../../../fixtures/services/rest.js'));
  app.use(app.mw.route(app.service.Rest.$getRoutes.bind(app.service.Rest)));
  const r = request(app.listen());
  const res = {
    find: await r.get('/').then(b => b.body),
    get: await r.get('/1').then(b => b.body),
    create: await r.post('/').send(fullBody).then(b => b.body),
    update: await r.put('/1').send(fullBody).then(b => b.body),
    patch: await r.patch('/1').send(patchBody).then(b => b.body),
    delete: await r.delete('/1').then(b => b.body),
  };
  t.deepEqual(res.find, {
    data: {
      method: 'find',
      args: {
        params,
      },
    },
  });
  t.deepEqual(res.get, {
    data: {
      method: 'get',
      args: {
        id: 1,
        params,
      },
    },
  });
  t.deepEqual(res.create, {
    data: {
      method: 'create',
      args: {
        data: fullBody,
        params,
      },
    },
  });
  t.deepEqual(res.update, {
    data: {
      method: 'update',
      args: {
        id: 1,
        data: fullBody,
        params,
      },
    },
  });
  t.deepEqual(res.patch, {
    data: {
      method: 'patch',
      args: {
        id: 1,
        data: patchBody,
        params,
      },
    },
  });
  t.deepEqual(res.delete, {});
});
test('responds 404 by default for an empty response on GET operation', async (t) => {
  const app = new Komapi();
  app.services(path.join(__dirname, '../../../fixtures/services/rest.js'));
  app.use(app.mw.route(app.service.Rest.$getRoutes.bind(app.service.Rest)));
  const res = await request(app.listen()).get('/2');
  t.is(res.status, 404);
});
test('options route is disabled if no other routes can be found', async (t) => {
  const app = new Komapi();
  app.services(path.join(__dirname, '../../../fixtures/services/blog.js'));
  app.use(app.mw.route(app.service.Blog.$getRoutes.bind(app.service.Blog)));
  const res = await request(app.listen()).options('/');
  t.is(res.status, 404);
  t.is(res.headers.allow, undefined);
});
