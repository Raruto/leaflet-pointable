# leaflet-pointable.js
A Leaflet plugin that allows to interact with semi-transparent tiled overlays

_For a working example see [demo](https://raruto.github.io/examples/leaflet-pointable/leaflet-pointable.html)_

---

## How to use

1. **include CSS & JavaScript**
    ```html
    <head>
    ...
    <style> html, body, #map { height: 100%; width: 100%; padding: 0; margin: 0; } </style>
    <!-- Leaflet (JS/CSS) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.3.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.3.4/dist/leaflet.js"></script>
    <!-- Leaflet-Pointable -->
    <script src="https://unpkg.com/leaflet-pointable@latest/leaflet-pointable.js"></script>
    ...
    </head>
    ```
2. **choose a div container used for the slippy map**
    ```html
    <body>
    ...
	  <div id="map"></div>
    ...
    </body>
    ```
3. **create your first simple “leaflet-pointable slippy map**
    ```html
    <script>
      var map = L.map('map');
      map.setView(new L.LatLng(45, 9.5), 5);

      var control = L.control.layers(null, null, {
        collapsed: false
      }).addTo(map);

      var Basemap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        opacity: 0.90
        });
      Basemap.addTo(map);

      var Overlay = L.tileLayer('https://tile.waymarkedtrails.org/{id}/{z}/{x}/{y}.png', {
        id: 'hiking',
        pointable: true,
        attribution: '&copy; <a href="http://waymarkedtrails.org">Sarah Hoffmann</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      });
      Overlay.addTo(map);

      control.addOverlay(Overlay, "ON / OFF");

      map.on("pointable_mouseclick",function(e){
        map.openPopup("<b>Clicked overlay</b>: " + e.latlng.lat + "," + e.latlng.lng, e.latlng);
      });

    </script>
    ```

---

**Compatibile with:** leaflet@1.3.4

---

**Contributors:** [Raruto](https://github.com/Raruto/leaflet-pointable)
