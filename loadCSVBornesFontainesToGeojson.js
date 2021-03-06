/*
This file is part of ParkingVQETL.

ParkingVQETL is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

ParkingVQETL is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with ParkingVQETL.  If not, see <http://www.gnu.org/licenses/>.
*/
// Ce script realise la conversion du csv bornes fontaines en documentFeatures
// En paramètre passer path au fichier

// Nom du fichier à traiter!
var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var filename = process.argv[2];

// CouchDB Related

var realGeoJsonDoc = {
  "name": "BORNES_FONTAINES",
  "type": "FeatureCollection",
  "features": []
};


var instream = fs.createReadStream(filename);
var outstream = new stream;
var rl = readline.createInterface(instream, outstream);
var firstLine = true;
rl.on('line', function(line) {
  // process line here
	if (firstLine)
		{
			firstLine = false;
			console.log('First line not doing anything');
		}
	else
	{
		//console.log(line);
		realGeoJsonDoc.features.push(processJsonObject(line));
	}
});

rl.on('close', function() {
  // do something on finish here
    console.log('Nb occurences : ' + realGeoJsonDoc.features.length);
    console.log('Done converting Bornes Fontaines CSV');
    fs.writeFile("out/" + filename, JSON.stringify(realGeoJsonDoc), function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("The file was saved!");
      }
    });
});

function processJsonObject(line) {
var splitValues = line.split("|");
    //GENERIQUE|LIAISON|SPECIFIQUE|DIRECTION|NOM_TOPO|VILLE|ARROND|LONGITUDE|LATITUDE|ID_VOIE_PUB
    var jsonToAddFeatures = {"type":"Feature",
             "geometry":{"type":"Point",
                         "coordinates":[splitValues[7],splitValues[8]]},
             "properties":{"GENERIQUE":splitValues[0],
                           "LIAISON":splitValues[1],
                           "SPECIFIQUE":splitValues[2],
                           "DIRECTION": splitValues[3],
                            "NOM_TOPO": splitValues[4],
                          "VILLE": splitValues[5],
                          "ARROND": splitValues[6],
                          "ID_VOIE_PUB": splitValues[9],
                          "TYPE_SRC": "BORNES_FONTAINES"}
            };    
    
    
return jsonToAddFeatures;
}

