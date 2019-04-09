mapboxgl.accessToken = API_KEY

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: [0, 30],
  zoom: 1.3
});

// year[0] = 1980, year[36] = 2016
years = []
for(i = 1980; i < 2017; i++) {
  years.push(i);
};

function filterBy(year) {
  // meets syntax requirements for filter in mapbox, converts int year to string
  // to match the year in under the 'time' key of the geoJSON
  var filters = ['==', 'time', (1980 + year).toString()];
  // assign filter to lines Layer
  map.setFilter('disease-lines', filters);
  // Set the label to the year
  document.getElementById('year').textContent = years[year];
}

map.on('load', function() {
  d3.json('/data', function(err, data) {
      if (err) throw err;

      map.addSource('dlines', {
        'type': 'geojson',
        data: data
      });

      map.addLayer({
        'id': `disease-lines`,
        'type': 'line',
        'source': 'dlines',
        "paint": {
          "line-color": [
            'match',
            ['get', 'name'],
            "Malaria", 'red',
            "Leprosy", "cyan",
            "Yellow Fever", "yellow",
            'purple'
          ],
          "line-width": 3,
          "line-opacity": 0.5
        }
      });

      // Set filter to last year in set, 2016 - 1980 = 36
      filterBy(36);
      
      document.getElementById('slider').addEventListener('input', function(e) {
        // parse strings of ints from index page, 0 to 36 
        var year = parseInt(e.target.value, 10);
        // pass int to filterBy
        filterBy(year);
      });
  });
});