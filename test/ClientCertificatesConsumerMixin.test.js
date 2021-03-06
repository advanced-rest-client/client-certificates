/* eslint-disable no-param-reassign */
import { fixture, assert, html } from '@open-wc/testing';
import sinon from 'sinon';
import { DataGenerator } from '@advanced-rest-client/arc-data-generator';
import '@advanced-rest-client/arc-models/client-certificate-model.js';
import './test-element.js';
import { ImportEvents, ArcModelEvents, ArcModelEventTypes } from '@advanced-rest-client/arc-events';

describe('ClientCertificatesConsumerMixin', () => {
  const generator = new DataGenerator();

  async function basicFixture() {
    return fixture(html`<test-element></test-element>`);
  }

  async function queryDataFixture() {
    const elmRequest = fixture(html`
    <div>
      <client-certificate-model></client-certificate-model>
      <test-element></test-element>
    </div>`);
    return new Promise((resolve) => {
      window.addEventListener(ArcModelEventTypes.ClientCertificate.list, function f(e) {
        window.removeEventListener(ArcModelEventTypes.ClientCertificate.list, f);
        // @ts-ignore
        const { detail } = e;
        setTimeout(() => {
          detail.result
          .then(() => elmRequest)
          .then((node) => {
            resolve(node.querySelector('test-element'));
          });
        });
      });
    });
  }

  async function untilAfterQuery(element, result) {
    return new Promise((resolve) => {
      element.addEventListener(ArcModelEventTypes.ClientCertificate.list, function f(e) {
        element.removeEventListener(ArcModelEventTypes.ClientCertificate.list, f);
        e.preventDefault();
        e.detail.result = Promise.resolve(result || []);
        setTimeout(() => resolve());
      });
      element.reset();
    });
  }

  describe('#hasItems', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
      await untilAfterQuery(element);
    });

    it('is false when no items', () => {
      assert.isFalse(element.hasItems);
    });

    it('is true when has items', () => {
      element.items = generator.generateClientCertificates({ size: 5 });
      assert.isTrue(element.hasItems);
    });
  });

  describe('#dataUnavailable', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
      await untilAfterQuery(element);
    });

    it('is true when no items and not loading', () => {
      assert.isTrue(element.dataUnavailable);
    });

    it('is false when no items and loading', () => {
      element.items = generator.generateClientCertificates({ size: 5 });
      element.loading = true;
      assert.isFalse(element.dataUnavailable);
    });

    it('is false when has items', () => {
      element.items = generator.generateClientCertificates({ size: 5 });
      assert.isFalse(element.dataUnavailable);
    });
  });

  describe('datastore-destroyed event handler', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
      // @ts-ignore
      element.items = generator.generateClientCertificates({ size: 5 });
    });

    it('resets items', () => {
      ArcModelEvents.destroyed(document.body, 'client-certificates');
      assert.isUndefined(element.items);
    });

    it('ignores other data stores', () => {
      ArcModelEvents.destroyed(document.body, 'saved-requests');
      assert.lengthOf(element.items, 5);
    });
  });

  describe('data-imported event handler', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('calls reset()', () => {
      const spy = sinon.spy(element, 'reset');
      ImportEvents.dataImported(document.body);
      assert.isTrue(spy.called);
    });
  });

  describe(`${ArcModelEventTypes.ClientCertificate.State.delete} event handler`, () => {
    let element;
    before(async () => {
      await generator.insertCertificatesData({
        size: 5,
      });
    });

    after(async () => {
      await generator.destroyClientCertificates();
    });

    beforeEach(async () => {
      element = await queryDataFixture();
    });

    it('removes existing item', () => {
      const item = element.items[0];
      ArcModelEvents.ClientCertificate.State.delete(document.body, item._id, item._rev);
      assert.lengthOf(element.items, 4);
    });

    it('ignores when not on the list', () => {
      ArcModelEvents.ClientCertificate.State.delete(document.body, 'some-id', 'some-rev');
      assert.lengthOf(element.items, 5);
    });
  });

  describe(`${ArcModelEventTypes.ClientCertificate.State.update} event handler`, () => {
    let element;
    before(async () => {
      await generator.insertCertificatesData({
        size: 5,
      });
    });

    after(async () => {
      await generator.destroyClientCertificates();
    });

    beforeEach(async () => {
      element = await queryDataFixture();
    });

    it('updates existing item', () => {
      let item = element.items[0];
      item = { ...item};
      item.name = 'test';
      const record = {
        item,
        id: item._id,
        rev: 'test',
      };
      ArcModelEvents.ClientCertificate.State.update(document.body, record);
      assert.equal(element.items[0].name, 'test');
    });

    it('Adds new item to the list', () => {
      const item = generator.generateClientCertificate();
      // @ts-ignore
      item._id = '6_';
      const record = {
        item,
        // @ts-ignore
        id: item._id,
        rev: 'test',
      };
      // @ts-ignore
      ArcModelEvents.ClientCertificate.State.update(document.body, record);
      assert.lengthOf(element.items, 6);
    });
  });

  describe('Data list', () => {
    before(async () => {
      await generator.insertCertificatesData({});
    });

    after(async () => {
      await generator.destroyClientCertificates();
    });

    let element;
    beforeEach(async () => {
      element = await queryDataFixture();
    });

    it('has items set', () => {
      assert.lengthOf(element.items, 15);
    });

    it('returns true for hasItems', () => {
      assert.isTrue(element.hasItems);
    });

    it('returns false for dataUnavailable', () => {
      assert.isFalse(element.dataUnavailable);
    });
  });
});
