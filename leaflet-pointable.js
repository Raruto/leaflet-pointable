/**
 * leaflet-pointable
 *
 * @author    Raruto
 * @license   GPL-3.0+
 * @link https://github.com/Raruto/leaflet-pointable
 * @desc Leaflet plugin that allows to interact with semi-transparent tiled overlays
 */
(() => {
  const gridProto = L.GridLayer.prototype;
  const onAddGridProto = gridProto.onAdd;
  const onRemoveGridProto = gridProto.onRemove;

  gridProto.options.pointable = false;

  L.Map.addInitHook(function() {
    this._defaultCursor = this._container.style.cursor;
    this._pointableLayers = {};
    this.on(L.version.startsWith('1.') ? "mousemove" : "pointermove", this._handlePointableMouseMove, this);
    this.on("click", this._handlePointableMouseClick, this);
  });

  L.Map.include({
    addPointableLayer(layer) {
      this._pointableLayers[layer._leaflet_id] = layer;
      return this._pointableLayers;
    },

    removePointableLayer(layer) {
      delete this._pointableLayers[layer._leaflet_id];
      layer._isPointablePixel = false;
      this._updatePointableState();
      return this._pointableLayers;
    },

    // Layers are sampled here (not in their own listeners) so that the state
    // is never one event behind the event being handled.
    _updatePointableState(e) {
      this._isPointablePixel = false;
      for (const i in this._pointableLayers) {
        if (e) this._pointableLayers[i]._pointableMouseTracker(e);
        if (this._pointableLayers[i].isPointablePixel()) {
          this._isPointablePixel = true;
          if (!e) break;
        }
      }
      this._container.style.cursor = this._isPointablePixel ? 'pointer' : this._defaultCursor;
    },

    _handlePointableMouseMove(e) {
      this._updatePointableState(e);
      if (!this._isPointablePixel) return;
      this.fire("pointable_mousemove", e);
    },

    _handlePointableMouseClick(e) {
      this._updatePointableState(e);
      if (!this._isPointablePixel) return;
      this.fire("pointable_mouseclick", e);
    },

    isPointablePixel() {
      return !!this._isPointablePixel;
    },
  });

  L.GridLayer.include({
    onAdd(map) {
      if (this.options.pointable) {
        map.addPointableLayer(this);
      }
      onAddGridProto.call(this, map);
    },

    onRemove(map) {
      if (this.options.pointable) {
        map.removePointableLayer(this);
      }
      onRemoveGridProto.call(this, map);
    },

    isPointablePixel() {
      return !!this._isPointablePixel;
    },

    _pointableMouseTracker(e) {
      const tile = this._getPointableTile(e.latlng);
      const img = this._getPointableImage(tile);
      const pixel = this._getPointablePixel(img, e.originalEvent);
      this._isPointablePixel = this._hasPointablePixelData(img, pixel);
    },

    // Tile lookup follows the layer's own grid (CRS, tile size, zoom offset, wrapping).
    _getPointableTile(latlng) {
      const zoom = this._tileZoom;
      if (!this._tiles || zoom === undefined || !latlng) return;
      const coords = this._map.project(latlng, zoom).unscaleBy(this.getTileSize()).floor();
      coords.z = zoom;
      return this._tiles[this._tileCoordsToKey(coords)];
    },

    _getPointableImage(tile) {
      if (!tile || !tile.el) return;
      const tag = tile.el.tagName.toLowerCase();
      return (tag == 'img' || tag == 'canvas') ? tile.el : tile.el.querySelector('img, canvas');
    },

    _getPointablePixel(img, e) {
      if (!img || !e || e.clientX === undefined) return;
      const rect = img.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      return {
        x: Math.floor((e.clientX - rect.left) * width / rect.width),
        y: Math.floor((e.clientY - rect.top) * height / rect.height),
      };
    },

    _hasPointablePixelData(img, pixelPoint) {
      if (!img || !pixelPoint) return false;
      const ctx = this._getPointableContext(img);
      if (!ctx) return false;
      try {
        return ctx.getImageData(pixelPoint.x, pixelPoint.y, 1, 1).data[3] != 0;
      } catch (err) {
        this._pointableError('cannot read tile pixel', img.src, err);
        return false;
      }
    },

    _getPointableContext(img) {
      if (img.tagName.toLowerCase() == 'canvas') return img.getContext("2d");
      if (!img.src) return;
      const cache = img._pointableCache;
      if (cache && cache.src == img.src) return cache.ctx;
      if (!img.complete || !img.naturalWidth) return;
      const ctx = this._drawPointableImage(img);
      try {
        ctx.getImageData(0, 0, 1, 1);
      } catch (err) {
        // Tainted by a cross-origin tile: reload it with CORS enabled.
        this._pointableError('tile canvas is tainted, retrying with CORS', img.src, err);
        this._downloadPointableTile(img);
        return;
      }
      img._pointableCache = { src: img.src, ctx: ctx };
      return ctx;
    },

    // Reported once per message and tile, so mousemove cannot flood the console.
    _pointableError(message, src, err) {
      const key = message + ' ' + src;
      this._pointableErrors = this._pointableErrors || {};
      if (this._pointableErrors[key]) return;
      this._pointableErrors[key] = true;
      console.error('leaflet-pointable: ' + message + ' (' + src + ')', err);
      this.fire('pointable_error', { message: message, src: src, error: err });
    },

    _downloadPointableTile(tileImg) {
      const src = tileImg.src;
      if (tileImg._pointableLoading == src) return;
      tileImg._pointableLoading = src;
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.addEventListener("load", function() {
        tileImg._pointableCache = { src: src, ctx: this._drawPointableImage(img) };
      }.bind(this), false);
      img.addEventListener("error", function() {
        this._pointableError('tile reload with CORS failed', src);
      }.bind(this), false);
      img.src = src;
    },

    _drawPointableImage(img) {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return ctx;
    },
  });
})();