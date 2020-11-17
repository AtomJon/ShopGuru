var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

// Create the script tag, set the appropriate attributes
var script = document.createElement('script');
script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDpH-3z4wT4W-gqAKvJBs8VTD8OMExeFFY&libraries=places&callback=initialize&language=da-DK';
script.defer = true;
document.head.appendChild(script);

var googleMap;
var routeRendere;
var placesService;
var directionsService;
var currentLocation;
var talkingIndicator;

function initialize() {
    navigator.geolocation.getCurrentPosition((curLoc, status) => {
        currentLocation = {lat: curLoc.coords.latitude, lng: curLoc.coords.longitude};
        initGoogleMap(); 
    }, (errorCode) => {
        console.error("Failed to get geological position", errorCode);
        currentLocation = {lat: 56.176361, lng: 9.554922};
        initGoogleMap(); 
    });
}

function initGoogleMap() {
    googleMap = new google.maps.Map(document.getElementById("map"), {
      center: currentLocation,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
    });
    
    talkingIndicator = document.getElementById("talkingIndicator");
    
    let controlDiv = document.createElement('div');
    controlDiv.style.margin = "1vw";
    let uiDiv = document.createElement('div');
    uiDiv.style.backgroundColor = "darkgray";
    uiDiv.style.border = "0.75vw solid darkgray";
    uiDiv.style.borderRadius = "1em";
    let startButton = document.createElement('button');
    startButton.innerHTML = 'Tryk for at starte'; 
    startButton.style.fontSize = "2vw";
    startButton.style.textAlign = "center";
    
    google.maps.event.addDomListener(startButton, 'click', turnMic);
    
    recognition.onspeechend = recognition.onerror = () => fade(talkingIndicator);
    
    uiDiv.appendChild(startButton);
    controlDiv.appendChild(uiDiv);
    
    googleMap.controls[google.maps.ControlPosition.TOP_CENTER].push(controlDiv);

    routeRendere = new google.maps.DirectionsRenderer();
    routeRendere.setMap(googleMap);
    placesService = new google.maps.places.PlacesService(googleMap);
    directionsService = new google.maps.DirectionsService();
}

function unfade(element) {
    var op = 0.1;  // initial opacity
    element.style.display = 'block';
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += op * 0.1;
    }, 10);
}

function fade(element) {
    var op = 1;  // initial opacity
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 50);
}

function turnMic() {
    unfade(talkingIndicator);
    responsiveVoice.cancel();
    recognition.start();
}

var shops = new Map();
//shops.set([''], ['']);
shops.set(['burger', 'pizza', 'nuggets', 'maccen', 'sodavand'], ['Burger King', 'Sunset', 'Mac Donalds']);
shops.set(['\370je', 'brille'], ['Louis Nielsen']);
shops.set(['tank', 'benzin'], ['OK', 'Shell', 'Q8', 'Bonus', 'Cirkle K']);
shops.set(['bib', 'bøg', 'bog'], ["Bibliotek"]);
shops.set(['ting', 'blyant', 'viske', 'mal', 'l\346red', 'pensel', 'gave'], ["Tiger", "Normal", "S\370sterne Grene"]);
shops.set(['skjort'], ["Jack & Jones"]);
shops.set(['t\370j', 'kjole', 'nederdele', 'bukse', 'shorts'], ["H&M"]);
shops.set(['kjole'], ['vero moda']);

handleRecognition = (event) => processWord(event.results[event.resultIndex][0].transcript);

var recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'da-DK';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

recognition.onresult = handleRecognition;

// This runs when the speech recognition service starts
recognition.onstart = function() {
  console.log("We are listening. Try speaking into the microphone.");
};

function processWord(word) {
  console.log(word);
    
  let recShops = [];
    
  shops.forEach( (shops, keywords) => {
    if (keywords.some(key => word.toLowerCase().includes(key.toLowerCase())))
        recShops = recShops.concat(shops);
    else
      shops.forEach((shop) => {
        if (word.toLowerCase().includes(shop.toLowerCase()))
          recShops = recShops.concat(shop);
      });
   });
   
   console.log(recShops);
    
   if (recShops.length == 1) {
       promptShops(recShops);
       return;
   };
    
   if (recShops.length > 1) {
       console.log("fandt flere butikker");
       
       promptShops(recShops);
   }
}

function promptShops(shops) {
    console.log('shops prompted: ', shops);
    
    if (shops.length == 1) findShop(shops[0]);
    if (shops.length <= 1) return;
    
    let msg = "Jeg fandt " + shops.length + " mulige steder, "
    
    for (let i = 0; i < shops.length; i++) msg += shops[i] + ", ";
    
    msg += "sig hvilken butik jeg skal finde";
    
    responsiveVoice.speak(msg, "Danish Female");
    responsinveVoice.OnFinishedPlaying = (x) => { turnMic(); responsinveVoice.OnFinishedPlaying = undefined; };
}

function findShop(shop) {  
  console.log("Finding shop: " + shop);

  let request = {
    query: shop /*+ " Silkeborg"*/,
    fields: ["geometry"],
    locationBias: {center: currentLocation, radius: 2000},
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
      let viewport = new google.maps.LatLngBounds(); 
      let target;

      results.forEach((location) => {
          console.log("Location:", location);
            
          if (!target || target && pythagorasEquirectangular(location.geometry.location, currentLocation)
              > pythagorasEquirectangular(target, currentLocation)) target = location.geometry.location;
      });  
    
      directionsService.route({origin: currentLocation, destination: target,
                               travelMode: google.maps.DirectionsTravelMode.WALKING}, (result, status) => {
          if (status != "OK") { console.error("Can't find route"); return; }
          
          console.log(result);
          responsiveVoice.speak( "Ruten er, " + result.routes[0].legs[0].steps.map(step => step.instructions.replace(/<(.*?)>/g,'') + '').join('. '), "Danish Female");

          routeRendere.setDirections(result);
          googleMap.fitBounds(result.routes[0].bounds);
          googleMap.setZoom(19);
      });
  });
}
                                   
// Convert Degress to Radians
function Deg2Rad(deg) {
  return deg * Math.PI / 180;
}

function pythagorasEquirectangular(pos1, pos2) {
  let lat1 = Deg2Rad(pos1.lat);
  let lat2 = Deg2Rad(pos2.lat);
  let lon1 = Deg2Rad(pos1.lng);
  let lon2 = Deg2Rad(pos2.lng);
  var R = 6371; // km
  var x = (pos2.lng - pos1.lng) * Math.cos((pos1.lat + pos2.lat) / 2);
  var y = (pos2.lat - pos1.lat);
  var d = Math.sqrt(x * x + y * y) * R;
  return d;
}

recognition.onnomatch = function(event) {
  alert("Hvad sagde du?");
}

recognition.onerror = function(event) {
  console.error('Error occurred in recognition: ', event);
}
