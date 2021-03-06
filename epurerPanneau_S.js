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

// Ce script ajoute une propriété type a chacun des features d'un documentFeatures

var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var JSONStream = require('JSONStream');

// Nom du fichier à traiter!
var filename = process.argv[2];
var diroutput = process.argv[3];
var realGeoJsonDoc = {
    "name": "PARKING_POIS",
    "type": "FeatureCollection",
    "features": []
};


function extractNbMinAutoriseFromProps(doc) {
    var regex = /[1-9].*min+/g;
    if (doc.properties.TYPE_DESC !== undefined && doc.properties.TYPE_DESC.indexOf("min") > -1) {
        var outId = regex.exec(doc.properties.TYPE_DESC);
        if (outId !== null && outId !== undefined && outId.indexOf("-") === -1) {
            return outId[0];
        }
    } else {
        return undefined;
    }
}

function extraiteHeuresDebutEtFin(doc) {
    var runRegex, regex, firstSplit, splitRegex, iCpt, heuresAutorise;
    // Regex pour extraire les heures !!
    var regex = /([0-9]+h).(-*).*[0-9]([0-9])?h([0-9])?([0-9])?/
    if (doc.properties.TYPE_DESC !== undefined && (doc.properties.TYPE_DESC.indexOf("H") > -1 || doc.properties.TYPE_DESC.indexOf("h") > -1)) {
        var runRegex = regex.exec(doc.properties.TYPE_DESC);
        if (runRegex !== undefined && runRegex !== null) {
            splitRegex = [];
            firstSplit = runRegex[0].split("-");
            for (iCpt = 0; iCpt < firstSplit.length; iCpt = iCpt + 1) {
                var tempSplit = firstSplit[iCpt].split(",");
                for (var jCpt = 0; jCpt < tempSplit.length; jCpt++) {
                    splitRegex.push(tempSplit[jCpt]);
                }
            }
            // Trim the dataset...
            for (iCpt = 0; iCpt < splitRegex.length; iCpt = iCpt + 1) {
                splitRegex[iCpt] = splitRegex[iCpt].trim();
            }
            heuresAutorise = [];

            if (splitRegex.length % 2 === 0) {
                for (iCpt = 0; iCpt < splitRegex.length; iCpt = iCpt + 2) {
                    var insToDo = [];
                    // Heure de debut
                    if (splitRegex[iCpt].indexOf("h") > -1 || splitRegex[iCpt].indexOf("H") > -1)
                        insToDo[0] = splitRegex[iCpt].substr(0, splitRegex[iCpt].toUpperCase().indexOf("H"));
                    else
                        insToDo[0] = splitRegex[iCpt];
                    // Heure de fin
                    if (splitRegex[iCpt + 1].indexOf("h") > -1 || splitRegex[iCpt + 1].indexOf("H") > -1)
                        insToDo[1] = splitRegex[iCpt + 1].substr(0, splitRegex[iCpt + 1].toUpperCase().indexOf("H"));
                    else
                        insToDo[1] = splitRegex[iCpt + 1];

                    heuresAutorise.push(insToDo);
                }
            } else {
                // Trying deuxieme startegie...
                // Exemple data en probleme  6h,9h 15h,18h
                // Premier jeux d'heure...
                var thatSplit = splitRegex[1].split(" ");
                var insToDo = [];
                insToDo[0] = splitRegex[0].substr(0, splitRegex[0].toUpperCase().indexOf("H"));
                insToDo[1] = thatSplit[0].trim().substr(0, thatSplit[0].toUpperCase().indexOf("H"));
                heuresAutorise.push(insToDo);
                insToDo[1] = splitRegex[2].substr(0, splitRegex[2].toUpperCase().indexOf("H"));
                insToDo[0] = thatSplit[1].trim().substr(0, thatSplit[1].toUpperCase().indexOf("H"));
                heuresAutorise.push(insToDo);
                if (!isNaN(heuresAutorise[0][0]) && !isNaN(heuresAutorise[0][1]) && !isNaN(heuresAutorise[1][0]) && !isNaN(heuresAutorise[1][1]) && heuresAutorise[0][0].length > 0 && heuresAutorise[0][1].length > 0 && heuresAutorise[1][0].length > 0 && heuresAutorise[1][1].length > 0) {
                    return heuresAutorise;
                } else {
                    console.log('Warning heures de parking en.. ' + heuresAutorise);
                    return undefined;
                }

            }
            return heuresAutorise;
        }
    }

    return undefined;
}

function streamJsonToCouch(pFilename) {
    var stream = fs.createReadStream(pFilename, {
            encoding: 'utf8'
        }),
        parser = JSONStream.parse('features.*');

    stream.pipe(parser);

    parser.on('data', function (data) {
        // Si c'est un arret RTC on s'en criss....
        if (data.properties.TYPE_DESC !== undefined && data.properties.TYPE_DESC.indexOf("RTC") > -1) {
            ///console.log('hit rtc data skipping it');
        } else {
            if (data.properties.TYPE_DESC !== undefined && (data.properties.TYPE_DESC.indexOf("MIN") > -1 || data.properties.TYPE_DESC.indexOf("min") > -1 || data.properties.TYPE_DESC.indexOf("H") > -1 || data.properties.TYPE_DESC.indexOf("h") > -1)) {
                //  console.log('hit stationnement zone limite');
                // Creation de props :)
                data.properties.STATIONEMENT_LIMITE = true;
                data.properties.NB_MINUTES_AUTORISE = extractNbMinAutoriseFromProps(data);
                data.properties.HEURES_AUTORISE = extraiteHeuresDebutEtFin(data);

                realGeoJsonDoc.features.push(data);
            } else {
                realGeoJsonDoc.features.push(data);
            }
        }
    });


    parser.on('close', function () {
        console.log('finished parsing the json now writing it :)');
        fs.writeFile(diroutput, JSON.stringify(realGeoJsonDoc), function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
            }
        });
    })
}

console.log('starting load for ' + filename);
streamJsonToCouch(filename);
