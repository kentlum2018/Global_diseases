mapboxgl.accessToken = API_KEY

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: [0, 10],
  zoom: 1
});

// year[0] = 1980, year[36] = 2016
years = []
for(i = 1980; i < 2017; i++) {
  years.push(i);
};

// function takes an index, and temps array. Array must be in chronological order.
function filterBy(index, temps) {
  // meets syntax requirements for filter in mapbox, converts int index to string
  // to match the year in under the 'time' key of the geoJSON
  var filters = ['==', 'time', (1980 + index).toString()];
  // assign filter to line Layers
  map.setFilter('Malaria', filters);
  map.setFilter('Yellow Fever', filters);
  map.setFilter('Leprosy', filters);
  // Set the label to the year and temp
  document.getElementById('year').textContent = years[index];
  document.getElementById('temp').textContent = Number((temps[index]).toFixed(2)).toString() + '°C';
}

// do to map when page loads
map.on('load', function() {
  // load in json from flask approute
  d3.json('/data', function(err, data) {
    if (err) throw err;
    // set source for layers as the data from json
    map.addSource('dlines', {
      'type': 'geojson',
      data: data
    });

    // add one layer for each disease.
    // note the similar structure (color and line opacity conditionals), 
    // but opacity is only "on" for one disease per layer.
    map.addLayer({
      'id': `Malaria`,
      'type': 'line',
      'source': 'dlines',
      "paint": {
        "line-color": [
          'match',
          ['get', 'name'],
          "Malaria", 'red',
          "Leprosy", "blue",
          "Yellow Fever", "yellow",
          'purple'
        ],
        "line-width": 3,
        "line-opacity": [
          'match',
          ['get', 'name'],
          "Malaria", 0.5,
          "Leprosy", 0,
          "Yellow Fever", 0,
          0
        ]
      }
    });

    map.addLayer({
      'id': `Leprosy`,
      'type': 'line',
      'source': 'dlines',
      "paint": {
        "line-color": [
          'match',
          ['get', 'name'],
          "Malaria", 'red',
          "Leprosy", "blue",
          "Yellow Fever", "yellow",
          'purple'
        ],
        "line-width": 3,
        "line-opacity": [
          'match',
          ['get', 'name'],
          "Malaria", 0,
          "Leprosy", 0.5,
          "Yellow Fever", 0,
          0
        ]
      }
    });

    map.addLayer({
      'id': `Yellow Fever`,
      'type': 'line',
      'source': 'dlines',
      "paint": {
        "line-color": [
          'match',
          ['get', 'name'],
          "Malaria", 'red',
          "Leprosy", "blue",
          "Yellow Fever", "yellow",
          'purple'
        ],
        "line-width": 3,
        "line-opacity": [
          'match',
          ['get', 'name'],
          "Malaria", 0,
          "Leprosy", 0,
          "Yellow Fever", 0.5,
          0
        ]
      }
    });

    // make array for temps with 36 positions
    temps = []
    for(i = 0; i < 37; i++) {
      temps.push('');
    };
    // map each temperature to the position of appropriate year, for calling in filterBy function
    data.features.forEach(feature => {
        if (feature.properties.line == 'max') {
          // the parsInt(time) - 1980 makes an index ranging from 0 to 36, ordered chronologically
          temps[parseInt(feature.properties.time, 10) - 1980] = feature.properties.temp;
        }
    });
    
    // Set initial slider position to last year in set, 2016 - 1980 = 36
    filterBy(36, temps);
    document.getElementById('slider').addEventListener('input', function(e) {
      // parse strings of ints from slider on index page, 0 to 36 
      var index = parseInt(e.target.value, 10);
      // pass int to filterBy
      filterBy(index, temps);
    });
      
      

  });
});
// add layer ids for toggler
var toggleableLayerIds = [ 'Malaria', 'Leprosy', 'Yellow Fever'];
 
// loop over ids and add proper toggler elements to html for each layer
for (var i = 0; i < toggleableLayerIds.length; i++) {
  var id = toggleableLayerIds[i];
  // creates a button to nowhere in an <a> tag
  var link = document.createElement('a');
  link.href = '#';
  link.className = 'active';
  link.textContent = id;
  
  
  link.onclick = function (e) {
    // select which thing was clicked
    var clickedLayer = this.textContent;
    // prevent page reload
    e.preventDefault();
    e.stopPropagation();
    
    // get property for conditional statement
    var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

    // on click make lines visible or invisible, depending on what it is currently set to.
    if (visibility === 'visible') {
      map.setLayoutProperty(clickedLayer, 'visibility', 'none');
      this.className = '';
    } else {
      this.className = 'active';
      map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
    }
  };
  
  // add link elements to the menu
  var layers = document.getElementById('menu');
  layers.appendChild(link);
}