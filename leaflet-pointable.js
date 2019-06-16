/**
 * leaflet-pointable
 *
 * @author    Raruto
 * @license   GPL-3.0+
 * @link https://github.com/Raruto/leaflet-pointable
 * @desc Leaflet plugin that allows to interact with semi-transparent tiled overlays
 */

(function() {

  var gridProto = L.GridLayer.prototype;
  var onAddGridProto = gridProto.onAdd;
  var onRemoveGridProto = gridProto.onRemove;

  gridProto.options.pointable = false;

  L.Map.addInitHook(function() {
    this._defaultCursor = this._container.style.cursor;
    this._pointableLayers = {};
    this.on("mousemove", this._handlePointableMouseMove, this);
    this.on("click", this._handlePointableMouseClick, this);
  });

  L.Map.prototype.addPointableLayer = function(layer) {
    this._pointableLayers[layer._leaflet_id] = layer;
    return this._pointableLayers;
  };

  L.Map.prototype.removePointableLayer = function(layer) {
    for (var i in this._pointableLayers) {
      if (i == layer._leaflet_id) {
        delete this._pointableLayers[i];
      }
    }
    return this._pointableLayers;
  };

  L.Map.prototype._handlePointableMouseMove = function(e) {
    this._isPointablePixel = false;
    for (var i in this._pointableLayers) {
      if (this._pointableLayers[i].isPointablePixel()) {
        this._isPointablePixel = true;
        break;
      }
    }
    this._container.style.cursor = this._isPointablePixel ? 'pointer' : this._defaultCursor;
    if (!this._isPointablePixel) return;
    this.fire("pointable_mousemove", e);
  };

  L.Map.prototype._handlePointableMouseClick = function(e) {
    if (!this._isPointablePixel) return;
    this.fire("pointable_mouseclick", e);
  };

  L.Map.prototype.isPointablePixel = function() {
    return !!this._isPointablePixel;
  };

  L.GridLayer.include({
    onAdd: function(map) {
      if (this.options.pointable) {
        map.addPointableLayer(this);
        map.on("mousemove", this._pointableMouseTracker, this);
      }
      onAddGridProto.call(this, map);
    },

    onRemove: function(map) {
      if (this.options.pointable) {
        map.removePointableLayer(this);
        map.off("mousemove", this._pointableMouseTracker, this);
      }
      onRemoveGridProto.call(this, map);
    },

    isPointablePixel: function() {
      return !!this._isPointablePixel;
    },

    _pointableMouseTracker: function(e) {
      var coords = this._getPointableTileCoords(e.latlng.lat, e.latlng.lng, this._map.getZoom());
      var tile = this._getPointableTile(coords);
      var img = this._getPointableImage(tile);
      var pixel = this._getPointablePixel(img, e.originalEvent);
      this._isPointablePixel = this._hasPointablePixelData(img, pixel);
    },

    _getPointableTileCoords: function(lat, lon, zoom) {
      var DEG_TO_RAD = Math.PI / 180;
      var xtile = parseInt(Math.floor((lon + 180) / 360 * (1 << zoom)));
      var ytile = parseInt(Math.floor((1 - Math.log(Math.tan(lat * DEG_TO_RAD) + 1 / Math.cos(lat * DEG_TO_RAD)) / Math.PI) / 2 * (1 << zoom)));
      return {
        x: xtile,
        y: ytile,
        z: zoom,
      };
    },

    _getPointableTile: function(coords) {
      if (!this._tiles) return;
      var key = this._tileCoordsToKey(coords);
      var tile = this._tiles[key];
      return tile;
    },

    _getPointableImage: function(tile) {
      if (!tile) return;
      var tag = tile.el.tagName.toLowerCase();
      var img = (tag == 'img' || tag == 'canvas') ? tile.el : tile.el.querySelector(tag);
      if (!img) return;
      if (tag == 'img') {
        this._downloadPointableTile(img.src, this._onPointableTileLoaded); // crossOrigin = "Anonymous"
      } else if (tag == 'canvas') {
        this.tileContext = img.getContext("2d");
      }
      return img;
    },

    _getPointablePixel: function(img, e) {
      if (!img) return;
      var imgRect = img.getBoundingClientRect();
      var imgPos = {
        pageY: (imgRect.top + window.scrollY).toFixed(0),
        pageX: (imgRect.left + window.scrollX).toFixed(0)
      };
      var mousePos = {
        x: e.pageX - imgPos.pageX,
        y: e.pageY - imgPos.pageY
      };
      return mousePos;
    },

    _hasPointablePixelData: function(img, pixelPoint) {
      if (!this.tileContext || !pixelPoint) return;
      var pixelData = this.tileContext.getImageData(pixelPoint.x, pixelPoint.y, 1, 1).data;
      var alpha = pixelData[3];
      var hasTileData = (alpha != 0);
      return hasTileData;
    },

    _downloadPointableTile: function(imageSrc, callback) {
      if (!imageSrc) return;
      img = new Image();
      img.crossOrigin = "Anonymous";
      img.addEventListener("load", callback.bind(this, img), false);
      img.src = imageSrc;
    },

    _onPointableTileLoaded: function(img) {
      this.tileCanvas = document.createElement("canvas");
      this.tileContext = this.tileCanvas.getContext("2d");

      var tileSize = this.getTileSize();
      this.tileCanvas.width = tileSize.x;
      this.tileCanvas.height = tileSize.y;

      this.tileContext.drawImage(img, 0, 0);
    },
  });

})();
