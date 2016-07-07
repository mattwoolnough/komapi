'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import DummyLogger from '../fixtures/dummyLogger';

// Tests
test('is enabled through app.mw.requestLogger() method', async t => {
    let app = appFactory();
    t.plan(3);
    app.use(app.mw.requestLogger());
    app.log.addStream({
        name: 'DummyLogger',
        level: 'trace',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.context === 'request' && obj.logger == 'requestLogger') {
                t.is(obj.level, 30);
                t.is(!!(obj.req_id), true);
            }
        })
    });
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 200);
});
test('throws on invalid options', async t => {
    let app = appFactory();
    t.plan(1);
    t.throws(() => {
        app.mw.requestLogger({
            logger: true
        });
    }, /"logger" must be a Function/);
});
test('logs the response status on statuscode >= 500', async t => {
    let app = appFactory();
    t.plan(4);
    app.use(app.mw.requestLogger());
    app.log.addStream({
        name: 'DummyLogger',
        level: 'trace',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.context === 'request' && obj.logger == 'requestLogger') {
                t.is(obj.level, 30);
                t.is(!!(obj.req_id), true);
                t.is(obj.response.status, 500);
            }
        })
    });
    app.use((ctx, next) => {
        throw new Error('Test error');
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 500);
});
test('logs the request body and hides password on statuscode >= 500', async t => {
    let app = appFactory();
    let body = {
        username: 'test',
        password: 'asdf'
    };
    t.plan(5);
    app.use(app.mw.requestLogger());
    app.log.addStream({
        name: 'DummyLogger',
        level: 'trace',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.context === 'request' && obj.logger == 'requestLogger') {
                t.is(obj.level, 30);
                t.is(!!(obj.req_id), true);
                t.is(obj.response.status, 500);
                t.deepEqual(obj.request.body, {
                    username: 'test',
                    password: '*****'
                });
            }
        })
    });
    app.use(app.mw.bodyParser());
    app.use((ctx, next) => {
        throw new Error('Test error');
    });
    const res = await request(app.listen())
        .post('/')
        .send(body);
    t.is(res.status, 500);
});

test('supports options', async t => {
    let app = appFactory();
    t.plan(3);
    app.use(app.mw.requestLogger({
        logger: (ctx)  => {
            return ctx.log.trace({
                isDummy: true
            });
        }
    }));
    app.log.addStream({
        name: 'DummyLogger',
        level: 'trace',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.context === 'request' && obj.isDummy == true) {
                t.is(obj.level, 10);
                t.is(obj.isDummy, true);
            }
        })
    });
    app.use((ctx, next) => {
        ctx.send({
            status: 'ok'
        });
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 200);
});