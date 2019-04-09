mapboxgl.accessToken = API_KEY

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: [0, 0],
  zoom: 2
});

years = []
for(i = 1980; i < 2017; i++) {
  years.push(i);
};

function filterBy(year) {
  var filters = ['==', 'time', year.toString()];
  map.setFilter('disease-lines', filters);

  // Set the label to the year
  document.getElementById('year').textContent = years[year];
}

map.on('load', function() {
  d3.json('/data', function(err, data) {
      if (err) throw err;

      // data.features = data.features.map(function(d) {
      //   d.properties.year = d.properties.time.slice(0,4);
      //   console.log(d.properties.time.slice(0,4));
      //   return d;
      // });

      map.addSource('dlines', {
        'type': 'geojson',
        data: data
      });

      // layers = [
      //   {
      //     "id": "testlayer",
      //     "type": "line",
      //     "source": "dlines",
      //     "paint": {
      //       "line-color": "red",
      //       "line-width": 3,
      //       "line-opacity": 0.1
      //     }
      //   }
      // ]
      // map.addLayer(layers[0]);

      map.addLayer({
        'id': `disease-lines`,
        'type': 'line',
        'source': 'dlines',
        "paint": {
          "line-color": [
            'match',
            ['get', 'name'],
            "Malaria", 'red',
            "Yellow Fever", "yellow",
            "Leprosy", "blue",
            '#ccc'
          ],
          "line-width": 3,
          "line-opacity": 0.1
        }
      });

      // Set filter to last year in set, 2016 - 1980 = 36
      filterBy(36);
      
      document.getElementById('slider').addEventListener('input', function(e) {
        var year = parseInt(e.target.value, 10);
        filterBy(year);
      });
  });
});