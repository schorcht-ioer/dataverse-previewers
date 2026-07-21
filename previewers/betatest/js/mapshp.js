$(document).ready(function() {
    startPreview(false);   
});

// initialize the map
var map = L.map('map').fitWorld();

function translateBaseHtmlPage() {
    var mapPreviewText = $.i18n( "mapPreviewText" );
    $( '.mapPreviewText' ).text( mapPreviewText );
}

// set limits
const fileSizeLimit = 50; // in MB

// enable spinner
var target = document.getElementById('map');
var spinner = new Spinner().spin(target);

async function loadMetadata(metadataUrl) {
  const response = await fetch(metadataUrl);

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const metadata = await response.json();

  return metadata;
}

async function getFileSize(){
    
    // size via header (replaced with metadata...)
    //  fetch(fileUrl, { method: "HEAD" })
    //    .then(r => console.log(r.headers.get("Content-Length")));

    const fileid = queryParams.fileid;
    const datasetMetadataUrl = queryParams.versionUrl;

    // metadata of dataset
    const metadata = await loadMetadata(datasetMetadataUrl);

    // metadata of all files including name and id
    const filesMetadata = metadata.data.files;

    // metadata of tiff what to preview
    const fileMetadata = filesMetadata.find(f => f.dataFile.id === fileid);

    // get file name and size (mb) of tiff
    const fileName = fileMetadata.dataFile.filename;
    const fileSize = Math.round(fileMetadata.dataFile.filesize/(1024**2));
    console.log(fileName, fileSize);

    return fileSize
}

async function writeContent(fileUrl, file, title, authors) {
    addStandardPreviewHeader(file, title, authors);

    const fileSize = await getFileSize();   

    if (fileSize > fileSizeLimit){
        show_error(`The file is too big to be displayed (limit is ${fileSizeLimit.toString()} MB)`);
    }else{
        // load a tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // get data
        var request = new XMLHttpRequest();
        request.open('GET', fileUrl, true);
        request.responseType = 'blob';
        request.onload = function() {
            var reader = new FileReader();
            reader.readAsArrayBuffer(request.response);
            reader.onload =  function(e){
                convertToLayer(e.target.result);        
            };
        };
        request.send();
    }

} 

function convertToLayer(buffer){
    shp(buffer).then(function(shapeData){	//More info: https://github.com/calvinmetcalf/shapefile-js
        var shape = L.shapefile(shapeData, {
        	onEachFeature: function (feature, layer) {
        	    if (feature.properties) {
        	        var popupcontent = [];
        	        for (var propName in feature.properties) {
        	            propValue = feature.properties[propName];
        	            popupcontent.push("<strong>" + propName + "</strong>: " + JSON.stringify(propValue, null, 2));
        	        }
        	        layer.bindPopup(popupcontent.join("<br />"));
        	    }
        	}
        }).addTo(map);  //More info: https://github.com/calvinmetcalf/leaflet.shapefile
        map.fitBounds(shape.getBounds()); 
        // disable spinner
        spinner.stop();      
    });
}

function show_error(error_text){
	$('#map').hide();
	$('#file_error').show();
	$('#file_error').append(error_text);
}
