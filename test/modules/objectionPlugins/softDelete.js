'use strict';

// Dependencies
import test from 'ava';
import Komapi from '../../../src/index';
import * as ormFactory from '../../fixtures/ormFactory';

// Tests
test('is not enabled by default', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10
    });
    let collection = await app.orm.Test.query().columns('*').then();
    t.is(collection.length, 10);
    t.is(collection[0].name, 'name-1');
    t.is(collection[0].id, 1);
    t.is(collection[0].softDelete, undefined);
    let collection2 = await collection[0].$relatedQuery('reltests').columns('*').then();
    t.is(collection2.length, 2);
    t.is(collection2[1].desc, 'rel-name-1-2');
    t.is(collection2[1].id, 2);
    t.is(collection2[1].softDelete, undefined);
    t.is(app.orm.Test.systemColumns.indexOf('deleted_at'), -1);
    t.is(app.orm.Test.systemColumns.indexOf('deletedAt'), -1);
});
test('returns all records', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    let collection = await app.orm.Test.query().columns('*').then();
    t.is(collection.length, 10);
    t.is(collection[0].name, 'name-1');
    t.is(collection[0].id, 1);
    t.not(app.orm.Test.systemColumns.indexOf('deleted_at'), -1);
});
test('returns non-deleted records', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.Test.query().columns('*').delete().where('id', '=', 1);
    let collection = await app.orm.Test.query().columns('*').then();
    t.is(collection.length, 9);
    t.is(collection[0].name, 'name-2');
    t.is(collection[0].id, 2);
});
test('returns all records withArchived', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.Test.query().columns('*').delete().where('id', '=', 1);
    let collection = await app.orm.Test.query().columns('*').withArchived().then();
    t.is(collection.length, 10);
    t.is(collection[0].name, 'name-1');
    t.is(collection[0].id, 1);
    t.is(collection[0].deletedAt, null);
    t.is(typeof collection[0].deleted_at, 'string');
});
test('returns all records with camelCase', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true,
        camelCase: true
    });
    await app.orm.Test.query().columns('*').delete().where('id', '=', 1);
    let collection = await app.orm.Test.query().columns('*').withArchived().then();
    t.is(collection.length, 10);
    t.is(collection[0].name, 'name-1');
    t.is(collection[0].id, 1);
    t.is(collection[0].deleted_at, null);
    t.is(typeof collection[0].deletedAt, 'string');
    t.not(app.orm.Test.systemColumns.indexOf('deletedAt'), -1);
});
test('can restore records', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.Test.query().columns('*').delete().where('id', '=', 1);
    let collection = await app.orm.Test.query().columns('*').then();
    t.is(collection.length, 9);
    t.is(collection[0].name, 'name-2');
    t.is(collection[0].id, 2);
    await app.orm.Test.query().columns('*').restore().where('id', '=', 1);
    let collection2 = await app.orm.Test.query().columns('*').then();
    t.is(collection2.length, 10);
    t.is(collection2[0].name, 'name-1');
    t.is(collection2[0].id, 1);
});
test('can restore records with camelCase', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true,
        camelCase: true
    });
    await app.orm.Test.query().columns('*').delete().where('id', '=', 1);
    let collection = await app.orm.Test.query().columns('*').then();
    t.is(collection.length, 9);
    t.is(collection[0].name, 'name-2');
    t.is(collection[0].id, 2);
    await app.orm.Test.query().columns('*').restore().where('id', '=', 1);
    let collection2 = await app.orm.Test.query().columns('*').then();
    t.is(collection2.length, 10);
    t.is(collection2[0].name, 'name-1');
    t.is(collection2[0].id, 1);
});
test('can hard-delete records with {force:true}', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.Test.query().columns('*').delete({force:true}).where('id', '=', 1);
    let collection = await app.orm.Test.query().columns('*').withArchived().then();
    t.is(collection.length, 9);
    t.is(collection[0].name, 'name-2');
    t.is(collection[0].id, 2);
});
test('returns all related records', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    let test = await app.orm.Test.query().columns('*').findById(3).then();
    let collection = await test.$relatedQuery('reltests').columns('*').then();
    t.is(collection.length, 2);
    t.is(collection[1].desc, 'rel-name-3-2');
    t.is(collection[0].id, 5);
});
test('returns non-deleted related records', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.RelTest.query().columns('*').delete().where('id', '=', 5);
    let test = await app.orm.Test.query().columns('*').findById(3).then();
    let collection = await test.$relatedQuery('reltests').columns('*').then();
    t.is(collection.length, 1);
    t.is(collection[0].desc, 'rel-name-3-2');
    t.is(collection[0].id, 6);
});
test('returns all related records withArchived', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.RelTest.query().columns('*').delete().where('id', '=', 5);
    let test = await app.orm.Test.query().columns('*').findById(3).then();
    let collection = await test.$relatedQuery('reltests').columns('*').withArchived().then();
    t.is(collection.length, 2);
    t.is(collection[1].desc, 'rel-name-3-2');
    t.is(collection[0].id, 5);
});
test('can restore related records', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.RelTest.query().columns('*').delete().where('id', '=', 5);
    let test = await app.orm.Test.query().columns('*').findById(3).then();
    let collection = await test.$relatedQuery('reltests').columns('*').then();
    t.is(collection.length, 1);
    t.is(collection[0].desc, 'rel-name-3-2');
    t.is(collection[0].id, 6);
    await app.orm.RelTest.query().columns('*').restore().where('id', '=', 5);
    let collection2 = await test.$relatedQuery('reltests').columns('*').then();
    t.is(collection2.length, 2);
    t.is(collection2[1].desc, 'rel-name-3-2');
    t.is(collection2[0].id, 5);
});
test('can restore related records with camelCase', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true,
        camelCase: true
    });
    await app.orm.RelTest.query().columns('*').delete().where('id', '=', 5);
    let test = await app.orm.Test.query().columns('*').findById(3).then();
    let collection = await test.$relatedQuery('reltests').columns('*').then();
    t.is(collection.length, 1);
    t.is(collection[0].desc, 'rel-name-3-2');
    t.is(collection[0].id, 6);
    await app.orm.RelTest.query().columns('*').restore().where('id', '=', 5);
    let collection2 = await test.$relatedQuery('reltests').columns('*').then();
    t.is(collection2.length, 2);
    t.is(collection2[1].desc, 'rel-name-3-2');
    t.is(collection2[0].id, 5);
});
test('can hard-delete related records with {force:true}', async t => {
    let app = new Komapi();
    await ormFactory.createDatabase(app, {
        seed: 10,
        softDelete: true
    });
    await app.orm.RelTest.query().columns('*').delete({force:true}).where('id', '=', 5);
    let test = await app.orm.Test.query().columns('*').findById(3).then();
    let collection = await test.$relatedQuery('reltests').columns('*').withArchived().then();
    t.is(collection.length, 1);
    t.is(collection[0].desc, 'rel-name-3-2');
    t.is(collection[0].id, 6);
});