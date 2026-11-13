const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { After, AfterAll, BeforeAll, Then, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30000);
let browser;
BeforeAll(async () => { browser = await chromium.launch(); });
After(async function () { if (this.page) await this.page.close(); });
AfterAll(async () => { if (browser) await browser.close(); });

Then('the {string} bundle works with Leaflet {string}', async function (bundle, version) {
        const suffix = bundle === 'minified' ? '.min' : '';
        const page = this.page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<div id="map" style="height:400px"></div>');
        const dist = `https://unpkg.com/leaflet@${version}/dist`;
        await page.addStyleTag({ url: `${dist}/leaflet.css` });
        await page.addScriptTag({ url: `${dist}/${version === '1.9.4' ? 'leaflet.js' : 'leaflet-global.js'}` });
        await page.addScriptTag({ path: path.join(__dirname, '..', '..', `leaflet-pointable${suffix}.js`) });
        const result = await page.evaluate(() => {
          const map = new (L.LeafletMap || L.Map)('map', { center: [0, 0], zoom: 2 });
          const layer = new L.GridLayer({ pointable: true });
          layer.createTile = () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 256;
            canvas.getContext('2d').fillRect(0, 0, 128, 256);
            return canvas;
          };
          layer.addTo(map);
          const tile = Object.values(layer._tiles).find(tile => tile.el.getBoundingClientRect().width);
          const rect = tile.el.getBoundingClientRect();
          let moves = 0, clicks = 0;
          map.on('pointable_mousemove', () => moves++);
          map.on('pointable_mouseclick', () => clicks++);
          const fire = (x, type) => {
            const originalEvent = { clientX: rect.left + x, clientY: rect.top + 10 };
            // Convert browser viewport coordinates to this map's container coordinates.
            const container = map.getContainer().getBoundingClientRect();
            map.fire(type, { originalEvent, latlng: map.containerPointToLatLng([originalEvent.clientX - container.left, originalEvent.clientY - container.top]) });
          };
          const event = L.version.startsWith('1.') ? 'mousemove' : 'pointermove';
          fire(10, event);
          fire(10, 'click');
          const opaque = map.isPointablePixel() && layer.isPointablePixel() && map.getContainer().style.cursor === 'pointer';
          fire(200, event);
          fire(200, 'click');
          const transparent = !map.isPointablePixel() && !layer.isPointablePixel();
          fire(10, event);
          layer.remove();
          const removed = !map.isPointablePixel() && Object.keys(map._pointableLayers).length === 0;
          layer.addTo(map);
          const added = Object.keys(map._pointableLayers).length === 1;
          map.remove();
          return { version: L.version, opaque, transparent, removed, added, moves, clicks };
        });
        assert.equal(result.version, version);
        assert.deepEqual({ ...result, version: undefined }, { version: undefined, opaque: true, transparent: true, removed: true, added: true, moves: 2, clicks: 1 });
        assert.deepEqual(errors, []);
});
