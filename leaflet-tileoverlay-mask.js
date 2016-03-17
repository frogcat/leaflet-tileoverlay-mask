(function() {

  // Leaflet.TileOverlay
  // SVG based implementation of Leaflet.TileLayer

  L.TileOverlay = L.Layer.extend({
    options: {
      pane: "overlayPane",
      attribution: null
    },
    initialize: function(url, options) {
      this._url = url;
      L.setOptions(this, options);
    },
    onAdd: function(map) {
      var svg = map.getRenderer(this);
      this._defs = svg._rootGroup.appendChild(L.SVG.create("defs"));
      this._group = svg._rootGroup.appendChild(L.SVG.create("g"));
    },
    onRemove: function(map) {
      this._group.parentNode.removeChild(this._group);
      this._defs.parentNode.removeChild(this._defs);
      delete this._group;
      delete this._defs;
    },
    getEvents: function() {
      return {
        zoomend: this._update,
        moveend: this._update,
        viewreset: this._update
      };
    },
    setUrl: function(url) {
      this._url = url;
      this._update();
    },
    getAttribution: function() {
      return this.options.attribution;
    },
    getTileUrl: function(coords) {
      return L.Util.template(this._url, L.extend(coords, this.options));
    },
    _createTile: function(coords) {
      var image = L.SVG.create("image");
      image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", this.getTileUrl(coords));
      this._project(image, coords);
      return image;
    },
    _project: function(image, coords) {
      var map = this._map;
      var nw = map.unproject(coords.multiplyBy(256), coords.z);
      var se = map.unproject(coords.add([1, 1]).multiplyBy(256), coords.z);
      var box = L.bounds(map.latLngToLayerPoint(nw), map.latLngToLayerPoint(se));
      image.setAttribute("x", box.min.x);
      image.setAttribute("y", box.min.y);
      image.setAttribute("width", box.getSize().x);
      image.setAttribute("height", box.getSize().y);
    },
    _update: function() {
      var map = this._map;
      var opt = this.options;
      var g = this._group;

      var zoom = map.getZoom();
      if ((opt.minZoom && opt.minZoom > zoom) || (opt.maxZoom && opt.maxZoom < zoom))
        return;
      if (opt.maxNativeZoom)
        zoom = Math.min(opt.maxNativeZoom, zoom);

      var images = {};
      for (var f = g.firstChild; f; f = f.nextSibling)
        if (f.getAttribute)
          images[f.getAttribute("xlink:href")] = f;

      var b = map.getBounds();
      var tl = map.project(b.getNorthWest(), zoom).divideBy(256).floor();
      var br = map.project(b.getSouthEast(), zoom).divideBy(256).ceil();
      for (var y = tl.y; y < br.y; y++) {
        for (var x = tl.x; x < br.x; x++) {
          var coords = L.point(x, y);
          coords.z = zoom;
          var url = this.getTileUrl(coords);
          if (images[url]) {
            this._project(images[url], coords);
            delete images[url];
          } else {
            g.appendChild(this._createTile(coords));
          }
        }
      }
      for (var f in images)
        g.removeChild(images[f]);
    }
  });

  // Default mask image
  // 512 x 512 circle with soft edge

  var defaultMaskUrl = [
    'data:image/png;base64,',
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAC7lBMVEUAAAABAQECAgIDAwMEBAQF',
    'BQUGBgYHBwcICAgJCQkKCgoLCwsMDAwNDQ0ODg4PDw8QEBARERESEhITExMUFBQVFRUWFhYXFxcY',
    'GBgZGRkaGhobGxscHBwdHR0eHh4fHx8gICAhISEiIiIjIyMkJCQlJSUmJiYnJycoKCgpKSkqKior',
    'KyssLCwtLS0uLi4vLy8wMDAxMTEyMjIzMzM0NDQ1NTU2NjY3Nzc4ODg5OTk6Ojo7Ozs8PDw9PT0+',
    'Pj4/Pz9AQEBBQUFCQkJDQ0NERERGRkZHR0dISEhJSUlKSkpLS0tMTExNTU1OTk5PT09QUFBRUVFS',
    'UlJTU1NUVFRVVVVWVlZXV1dYWFhZWVlaWlpbW1tcXFxdXV1eXl5fX19gYGBhYWFiYmJjY2NkZGRl',
    'ZWVmZmZnZ2doaGhpaWlqampra2tsbGxtbW1ubm5vb29xcXFycnJzc3N0dHR1dXV2dnZ3d3d4eHh5',
    'eXl6enp7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiKioqLi4uMjIyN',
    'jY2Ojo6Pj4+QkJCRkZGSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnZ2enp6fn5+g',
    'oKChoaGioqKkpKSlpaWmpqanp6eoqKipqamqqqqrq6usrKytra2urq6vr6+wsLCxsbGysrKzs7O0',
    'tLS1tbW2tra3t7e4uLi5ubm6urq7u7u9vb2+vr6/v7/AwMDBwcHCwsLDw8PExMTFxcXGxsbHx8fI',
    'yMjJycnKysrLy8vMzMzNzc3Pz8/Q0NDR0dHS0tLT09PU1NTV1dXW1tbX19fY2NjZ2dna2trb29vc',
    '3Nzd3d3e3t7f39/g4ODh4eHi4uLj4+Pk5OTl5eXm5ubn5+fo6Ojp6enq6urr6+vs7Ozt7e3u7u7v',
    '7+/w8PDx8fHy8vLz8/P09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7///9A5nLSAAAA',
    'AWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98FHBEuKjDLarAAAAAdaVRY',
    'dENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAjNJREFUOMtjYEACjExMLCzMTIwM',
    '2AETK7eQhIyslAgvOzM2aU4xTbvAhMyspFAXPWkedCWM7GJGYVUz1+0+fGTfpvnNCdYynEwo8twq',
    'fo1rTt978fbDh3evHl7c1hOty49kCCOPTtK8U08+fPvx4+fPnz++fXpxaXWhhRAzQr9O5uob7779',
    'hIPvHx/sqLISgNnCrpK8+s6nHz+RwI8vT3aVGnJDPMwk5jfvBqo8SMWjDUkKrGAFnEYNJ9+hyQNV',
    'fLo+zUUAZASTeNjaJ99+YoDvr/flKLEAFbBpVp368BML+HJzohU3UAG33Yy7X7Ep+P58XZAwEwOT',
    'UOC65z+wKfj5/lCmLDMDk0T87rfYFXw6W6HGysAik3kYqxOAjrjcpM3GwCKbdQSXgivNOuwMTFLJ',
    '+95ht+Lz+Wp1VgYmkdBNL7Er+HA0V56FgZHXef7Db9jkf7zaEikGjC92vaYLn7Ap+HpvliMPMKyZ',
    'peO3vfiOxYB3x8s02ECRxWPdc+kjpiu+3FvoKwJOESwy0asefEGX//Zid74GOyTBcOoW7njyFdWM',
    'b6+Ot9rwQ3MIE79F9a5Hn74jJ5cXx3vcxeCJklnIqnTD9TdfoEp+fH13b3ebuxQrIlkzCxgmTdt3',
    '4/n7T1++fP7w6u6xhfk24qwo+YpbwSVn4rqDZy9fOX90y6wyXw1+tLzFyMqvZBWcUdHUXJ0b6agh',
    'zI6ZgxlZuIRlVbW11eXFeFhxZHAmZlY2dlYWlPwPAD6nKPWk11d/AAAAAElFTkSuQmCC'
  ].join("");

  // Leaflet.TileOverlay.Mask
  // SVG based implementation of Leaflet.TileLayer with Mask Effect


  L.TileOverlay.Mask = L.TileOverlay.extend({
    options: {
      pane: "overlayPane",
      maskUrl: defaultMaskUrl,
      maskWidth: 512,
      maskHeight: 512
    },
    onAdd: function(map) {
      L.TileOverlay.prototype.onAdd.call(this, map);
      var key = "_leaflet_tileroverlay_mask_" + L.stamp(this);
      var opt = this.options;

      var mask = this._defs.appendChild(L.SVG.create("mask"));
      mask.setAttribute("id", key);
      var image = mask.appendChild(L.SVG.create("image"));
      image.setAttribute("width", opt.maskWidth);
      image.setAttribute("height", opt.maskHeight);
      image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", opt.maskUrl);
      this._group.setAttribute("mask", "url(#" + key + ")");
      this._image = image;
      this.setCenter(map.latLngToContainerPoint(map.getCenter()));
    },
    onRemove: function(map) {
      L.TileOverlay.prototype.onRemove.call(this, map);
      delete this._image;
    },
    setCenter: function(containerPoint) {
      var layerPoint = this._map.containerPointToLayerPoint(containerPoint);
      this._image.setAttribute("x", layerPoint.x - this.options.maskWidth / 2);
      this._image.setAttribute("y", layerPoint.y - this.options.maskHeight / 2);
    }
  });


  L.tileOverlay = function(url, options) {
    return new L.TileOverlay(url, options);
  };

  L.tileOverlay.mask = function(url, options) {
    return new L.TileOverlay.Mask(url, options);
  };

})();
