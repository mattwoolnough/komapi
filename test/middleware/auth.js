'use strict';

// Dependencies
import test from 'ava';
import appFactory from '../fixtures/appFactory';
import {agent as request} from 'supertest-as-promised';
import {Strategy as LocalStrategy} from 'passport-local';
import Boom from 'boom';
import DummyLogger from '../fixtures/dummyLogger';

// Init
process.setMaxListeners(11); // Fix false positive memory leak messages because of many Komapi instances. This should be exactly the number of times appFactory() is called in this file

// Tests
test('is initiated through authInit() method', async t => {
    t.plan(4);
    const app = appFactory();
    t.is(typeof app.context.login, 'undefined');
    app.authInit();
    t.is(typeof app.context.login, 'function');
    app.use((ctx, next) => {
        t.is(ctx.isAuthenticated(), false);
        ctx.body = null;
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 204);
});
test('is enabled through auth() method', async t => {
    const app = appFactory();
    app.authInit();
    app.auth();
    app.use((ctx, next) => {
        t.is(ctx.isAuthenticated(), false);
        ctx.body = null;
    });
    const res = await request(app.listen())
        .get('/');
    t.is(res.status, 204);
});
test('can be mounted at specific path', async t => {
    const app = appFactory();
    app.authInit();
    app.auth('/test');
    app.use((ctx, next) => {
        t.is(ctx.isAuthenticated(), false);
        ctx.body = null;
    });
    const res = await request(app.listen())
        .get('/test');
    t.is(res.status, 204);
});
test('cannot be initialized multiple times', async t => {
    const app = appFactory();
    t.throws(() => {
        app.authInit();
        app.authInit();
    }, 'Cannot initialize authentication more than once');
});
test('cannot be enabled without first having been initialized', async t => {
    const app = appFactory();
    t.throws(() => {
        app.auth();
    }, 'Cannot use authentication middleware without running "authInit" first');
});
test('refuses invalid credentials', async t => {
    const app = appFactory();
    const passportUser = {
        id: 1,
        username: 'test'
    };
    app.bodyParser();
    app.authInit(new LocalStrategy(function (username, password, done) {
        if (username === 'test' && password === 'testpw') return done(null, passportUser);
        done(null, false);
    }));

    app.use((ctx, next) => {
        return app.auth('local', (user, info) => {
            if (!user) throw new Boom.unauthorized();
            return ctx.login(user, {session: false});
        })(ctx, next);
    });
    app.use((ctx, next) => {
        t.fail();
        ctx.body = null;
    });
    const res = await request(app.listen())
        .post('/')
        .send({ username: 'test', password: 'asdf' });
    t.is(res.status, 401);
});
test('allows valid credentials', async t => {
    t.plan(2);
    const app = appFactory();
    const passportUser = {
        id: 1,
        username: 'test'
    };
    app.bodyParser();
    app.authInit(new LocalStrategy(function (username, password, done) {
        if (username === 'test' && password === 'testpw') return done(null, passportUser);
        done(null, false);
    }));
    app.use((ctx, next) => {
        return app.auth('local', (user, info) => {
            if (!user) throw new Boom.unauthorized();
            return ctx.login(user, {session: false});
        })(ctx, next);
    });
    app.use((ctx, next) => {
        t.is(ctx.isAuthenticated(), true);
        ctx.body = null;
    });
    const res = await request(app.listen())
        .post('/')
        .send({ username: 'test', password: 'testpw' });
    t.is(res.status, 204);
});
test('adds username in logs when logged in', async t => {
    let app = appFactory();
    const passportUser = {
        id: 1,
        username: 'test'
    };
    t.plan(2);
    app.requestLogger();
    app.log.addStream({
        name: 'DummyLogger',
        level: 'trace',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.context === 'request') {
                t.deepEqual(obj.request.user, passportUser);
            }
        })
    });
    app.bodyParser();
    app.authInit(new LocalStrategy(function (username, password, done) {
        if (username === 'test' && password === 'testpw') return done(null, passportUser);
        done(null, false);
    }));
    app.use((ctx, next) => {
        return app.auth('local', (user, info) => {
            if (!user) throw new Boom.unauthorized();
            return ctx.login(user, {session: false});
        })(ctx, next);
    });
    app.use((ctx, next) => {
        ctx.body = null;
    });
    const res = await request(app.listen())
        .post('/')
        .send({ username: 'test', password: 'testpw' });
    t.is(res.status, 204);
});
test('does not add username to logs when not logged in', async t => {
    let app = appFactory();
    const passportUser = {
        id: 1,
        username: 'test'
    };
    t.plan(2);
    app.requestLogger();
    app.log.addStream({
        name: 'DummyLogger',
        level: 'trace',
        type: 'raw',
        stream: new DummyLogger((obj) => {
            if (obj.context === 'request') {
                t.is(obj.request.user, undefined);
            }
        })
    });
    app.bodyParser();
    app.authInit(new LocalStrategy(function (username, password, done) {
        if (username === 'test' && password === 'testpw') return done(null, passportUser);
        done(null, false);
    }));
    app.use((ctx, next) => {
        return app.auth('local', (user, info) => {
            if (!user) throw new Boom.unauthorized();
            return ctx.login(user, {session: false});
        })(ctx, next);
    });
    app.use((ctx, next) => {
        ctx.body = null;
    });
    const res = await request(app.listen())
        .post('/')
        .send({ username: 'test-fail', password: 'testpw-fail' });
    t.is(res.status, 401);
});