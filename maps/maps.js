// -- coding: utf-8 --
// JavaScript Document
var apiLoaded=false;
var debugJs=false;

var map;
var infoWindow;

// France / Romans is default camera position
var defLat=45.31698;
var defLng=5.45124;
var defaultZoom=16;
var currentZoom=defaultZoom;

// Images dir
var urlImages="../plugins/maps/pics/";

// Markers ...
var allMarkers = [];
// Content of infoWindow ...
var infoWindowsArray = [];

// Couleur de fond selon l'état
var customBackground = {
	ND: { couleur: '#9999ff' },
	ES: { couleur: '#a3feba' },
	HS: { couleur: '#daa520' },
	SR: { couleur: '#ffa8a8' },
	IS: { couleur: 'steelblue' },
	MP: { couleur: 'powderblue' },
	FT: { couleur: 'powderblue' },
	TU: { couleur: 'powderblue' }
};

var deselectCurrent = function() {};

//------------------------------------------------------------------------------
// Google maps API loading if needed, and map creation ...
//------------------------------------------------------------------------------
// If google maps API is not already loaded, call this function which will, at
// end, call mapInit ...
//------------------------------------------------------------------------------
function mapLoad() {
	if (debugJs) console.log('mapLoad');

	if (! apiLoaded) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "http://maps.googleapis.com/maps/api/js?sensor=false&callback=mapInit";
		document.body.appendChild(script);
	} else {
		mapInit();
	}
}

// marker initialization
// point : GPS coordinates
// host : host object containing data
// content : infoWindow content
//------------------------------------------------------------------------------
markerCreate = function(point, host, content, icon) {
	if (debugJs) console.log("markerCreate : "+host.name);
	if (icon == undefined) icon='marque';
	var iconUrl=urlImages+icon+"-"+host.state+".png";
	if (debugJs) console.log("markerCreate : "+iconUrl);

	// var url = customIcons[host.state] || { url: marqueViolette };
	var image = new google.maps.MarkerImage(iconUrl, new google.maps.Size(32,32), new google.maps.Point(0,0), new google.maps.Point(16,32));

	// Manage markers on the same position ...
	for (i=0; i < allMarkers.length; i++) {
		var existingMarker = allMarkers[i];
		var pos = existingMarker.getPosition();

        // if a marker already exists in the same position as this marker
        if (point.equals(pos)) {
			if (debugJs) console.log("markerCreate, same position ...");
			
			//update the position of the coincident marker by applying a small multipler to its coordinates
			var newLat = point.lat() + (Math.random() -.10) / 10000;
			var newLng = point.lng() + (Math.random() -.10) / 10000;
			point = new google.maps.LatLng(newLat,newLng);
			if (debugJs) console.log("markerCreate, new position is : "+point);
		}
	}

/* Standard Google maps marker
	var marker = new google.maps.Marker({
		map: map, position: point, raiseOnDrag: false,
		icon: image, 
		animation: google.maps.Animation.DROP,
		title: host.name
	});
*/
	// Marker with label ...
	var marker = new MarkerWithLabel({
		map: map, position: point,
		icon: image, 
		raiseOnDrag: false, draggable: true,

		labelContent: host.name,
		// Half the CSS width
		labelAnchor: new google.maps.Point(50, 10),
		labelClass: "labels", // the CSS class for the label
		labelStyle: {opacity: 0.50},
		title: host.name
	});

	google.maps.event.addListener(marker, 'click', function () {
		infoWindow.setContent(content);
		infoWindow.open(map, marker);
	});
	

	// Register Custom "dragend" Event
	google.maps.event.addListener(marker, 'dragend', function() {
		// Get the Current position, where the pointer was dropped
		var point = marker.getPosition();
		// Center the map at given point
		map.panTo(point);
		// Update the textbox
		document.getElementById('txt_latlng').value=point.lat()+", "+point.lng();
	});
	
	return marker;
}

// Map initialization
// Global hostsInfo needs to be defined before calling this function
// This function is a callback called after Google maps API is fully loaded
mapInit = function() {
	if (hostsInfo == undefined) return false;
	
	Ext.Loader.load([ debugJs ? '../plugins/maps/google/markerclusterer.js' : '../plugins/maps/google/markerclusterer_packed.js' ], function() {
		Ext.Loader.load([ '../plugins/maps/google/markerwithlabel.js' ], function() {
			if (debugJs) console.log('Google marker clusterer API loaded ...');
			
			map = new google.maps.Map(document.getElementById('map'),{
				center: new google.maps.LatLng (defLat, defLng),
				zoom: defaultZoom,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});

			infoWindow = new google.maps.InfoWindow;
			
			var bounds = new google.maps.LatLngBounds();
			for (var index = 0; index < hostsInfo.length; ++index) {
				var host = hostsInfo[index];
				var gpsLocation = new google.maps.LatLng(host.lat, host.lng);
				var iconBase='marque';
				if (debugJs) console.log('host '+host.name+' is '+host.state+', located here : '+gpsLocation);

				if (host.monitoring && host.monitoring == true) {
					iconBase='point';
					var infoViewContent = 
						'<div class="map-infoView" id="iw-'+host.name+'">'+
						'<img class="map-iconstate" src="../plugins/maps/pics/Kiosk-'+host.state+'.png" />'+
						'<span class="map-hostname">'+'<a href="'+host.link+'">'+host.name+'</a>'+' is '+host.state+'.</span>'+
						'<hr/>';
					if (host.services != undefined) {
						infoViewContent += '<ul>';
						for (var idxServices = 0; idxServices < host.services.length; ++idxServices) {
							var service = host.services[idxServices];
							if (debugJs) console.log(' - service '+service.name+' is '+service.state);
							// console.log(service);
							infoViewContent += '<li class="map-service">'+service.name+' is '+service.state+'.</li>';
						}
						infoViewContent += '</ul>';
					}
					infoViewContent += '</div>';
				} else {
					var infoViewContent = 
						'<div class="map-infoView" id="iw-'+host.name+'">'+
						'<span class="map-hostname">'+'<a href="'+host.link+'">'+host.name+'</a>'+
						'</span>'+
						'</div>';
				}
				
				// Create a marker ...
				allMarkers.push(markerCreate(gpsLocation, host, infoViewContent, iconBase));
				bounds.extend(gpsLocation);
			}
			map.fitBounds(bounds);
			
			var mcOptions = {
				zoomOnClick: true, showText: true, averageCenter: true, gridSize: 40, maxZoom: 20, 
				styles: [
					{ height: 53, width: 53, url: urlImages+"m1.png" },
					{ height: 56, width: 56, url: urlImages+"m2.png" },
					{ height: 66, width: 66, url: urlImages+"m3.png" },
					{ height: 78, width: 78, url: urlImages+"m4.png" },
					{ height: 90, width: 90, url: urlImages+"m5.png" }
				]
			};
			var markerCluster = new MarkerClusterer(map, allMarkers, mcOptions);
/*
			google.maps.event.addListener(markerCluster, 'clusterclick', function (mCluster) {
				var infoViewContent = '<div class="map-infoView"><span>Marker cluster !</span><hr/></div>';
				 infoWindow.setContent(infoViewContent);
				 infoWindow.setPosition(mCluster.getCenter());
				 infoWindow.open(mCluster.getMap());
			});
*/
		});
	});

	return true;
};

function getRandomPoint() {
  var lat = defLat + (Math.random() - 0.5) * 5.5;
  var lng = defLng + (Math.random() - 0.5) * 10.0;
  return new google.maps.LatLng(Math.round(lat * 10) / 10, Math.round(lng * 10) / 10);
}

// ...
function boutonClique() {
	if (debugJs) console.log('boutonClique');
	alert("Faire quelque chose !");
	selectionMap = true;
}

// Drop d'un élément dans la carte
function dropCarte(event) {
	if (debugJs) console.warn("dropCarte, event : "+event.type);

	// Ne rien faire ...
	alert("Fonctionnalité non disponible !");
	return;

	if (event.dataTransfer) {
		if (debugJs) console.log("dropCarte, event.dataTransfer ...");
		var format = "Text";
		var textData = event.dataTransfer.getData (format);
		if (! textData) {
			textData = "<span style='color:red'>The data transfer contains no text data.</span>";
		}

		var targetDiv = document.getElementById ("target");
		alert(textData);
    }
	
	// La position absolue de la carte sur l'écran ...
	var mapOffset = $('carteMap').cumulativeOffset();
	mLeft = mapOffset.left;
	mTop = mapOffset.top;
	var mapDimensions = $('carteMap').getDimensions();
	mWidth = mapDimensions.width;
	mHeight = mapDimensions.height;

	// La position où a été laché l'objet ...
	var x = event.pointerX();
	var y = event.pointerY();

	if (debugJs) console.log("dropCarte, x="+x+", y="+y);
	if (debugJs) console.log("dropCarte, mLeft="+mLeft+", mTop="+mTop);
	if (debugJs) console.log("dropCarte, mWidth="+mWidth+", mHeight="+mHeight);
	
	// Check if the cursor is inside the map div
	if (x > mLeft && x < (mLeft + mWidth) && y > mTop && y < (mTop + mHeight)) {
		if (debugJs) console.log("dropCarte, cursor in map ...");
		// Difference between the x property of iconAnchor
		// and the middle of the icon width
		var anchorDiff = 1;

		// Find the object's pixel position in the map container
		var pixelpoint = new google.maps.Point(x - mLeft -anchorDiff, y - mTop);

		// Corresponding geo point on the map
		var overlayProjection = dummy.getProjection();
		var latlng = overlayProjection.fromContainerPixelToLatLng(pixelpoint);

		// Create a corresponding marker on the map
		var html='<strong>Nouveau point</strong><br/><button type="button" onClick="boutonClique();">Cliquer !</button>';
		createMarker(latlng, "Nouveau site", html, marqueOrange);
		//$('boutonSite').observe('click', function(event) { alert('Bouton cliqué !'); });
	} else {
		if (debugJs) console.log("dropCarte, cursor not in map !");
	}
};

// Fonction pour créer un marqueur ...
var selectedMarker=null;
function createMarker(latlng, name, html, src) {
	if (debugJs) console.log('createMarker: html='+html);
	
    var marker = new google.maps.Marker({
        position: latlng,
        map: map,
		draggable: true,
		title: name,
        zIndex: Math.round(latlng.lat()*-100000)<<5
	});
	if (! marker) return;
	
    google.maps.event.addListener(marker, 'click', function() {
		if (debugJs) console.log('clickMarker: ');
		selectedMarker=marker;
        infoWindow.setContent(html); 
		geocoder.geocode({'latLng': marker.getPosition()}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[0]) {
					infoWindow.setContent(infoWindow.getContent()+"<br/>"+results[0].formatted_address);
				}
			}
		});
        infoWindow.open(map,marker);
	});

	google.maps.event.addListener(marker, "dragstart", function(event) {
		// Close infowindow when dragging the marker whose infowindow is open
		if (selectedMarker == marker) infoWindow.close();
		infoWindow.setContent(infoWindow.getContent()+"<br/><b>Ancienne position</b> : "+event.latLng);
	});
	
	google.maps.event.addListener(marker, "dragend", function(event) {
		// Close infowindow when dragging the marker whose infowindow is open
		if (selectedMarker == marker) infoWindow.open(map, marker);
		
		geocoder.geocode({'latLng': marker.getPosition()}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[0]) {
					infoWindow.setContent(infoWindow.getContent()+"<br/>"+results[0].formatted_address);
				}
			}
		});
	});

	selectedMarker=marker;
    google.maps.event.trigger(marker, 'click');

    return marker;
}