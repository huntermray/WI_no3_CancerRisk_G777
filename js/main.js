/*  ***TO DO***
* Add grouped layer control radio button settings for IDW layers
* Show/Hide legends based on active IDW layer
* Zoom to Home after Reset
*/

//Basemap variables
var Stadia_AlidadeSmooth,CartoDB_DarkMatter,map,baselayers,overlays,layerList;

//Layer variables
var wellMarkers,wellLables,wellPoints,cancerTracts,breaks,wellsHexgrids,collectedFeaturesHexgrids,regressionHexgrids,tractCentroids,wellsFeatures,nitrateRatesHexbinsTurf,cancerRatesGridPointsTurf,collectedFeaturesHexbinsTurf;

//Layer array variables
var wellPointsArray=[],
    cancerTractsArray=[],
    wellsTractsArray=[],
    wellsIDWArray=[],
    joinedIDWArray=[];

//Layer group variables
var wellsGrp = L.layerGroup(),
    tractsGrp = L.layerGroup(),
    stamenGrp = L.layerGroup(),
    grayscaleGrp = L.layerGroup(),
    aerialGrp = L.layerGroup(),
    wellsIDWGrp = L.layerGroup(),
    joinedIDWGrp = L.layerGroup(),
    regressionGrp = L.layerGroup();

//IDW settings default values
var Q = 2,
    hexSize = 10,
    cellsize = 5;

//Initialize map
var map = L.map('map', {
    center:[45.0, -88.1],
    zoom: 7.5,
    layers: [grayscaleGrp, wellsGrp, tractsGrp,regressionGrp],
    minZoom: 6,
    maxZoom: 17,
    maxBounds: L.latLngBounds([40.822448, -80.120168], [48.628936, -100.325876]),
    bounceAtZoomLimits: false,
    zoomControl: false,
    zoomSnap: 0.25
});

//Create map panes to keep point GeoJSON on top of polygon GeoJSON
map.createPane('tractsPane');
map.createPane('wellsPane');

//Set z-index properites of map panes for overlay order
map.getPane('tractsPane').style.zIndex = 200;
map.getPane('wellsPane').style.zIndex = 300;

L.esri.basemapLayer('Imagery').addTo(aerialGrp);
L.esri.basemapLayer('ImageryLabels').addTo(aerialGrp);

var Stadia_AlidadeSmooth = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
	maxZoom: 20,
	attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
});
Stadia_AlidadeSmooth.addTo(stamenGrp);

var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
});
CartoDB_DarkMatter.addTo(grayscaleGrp);

var baselayers = {
    Dark: grayscaleGrp,
    Light: stamenGrp,
    Satellite: aerialGrp
};

var overlays = {
    "Wells (Nitrates)": wellsGrp,
    "Tracts (Cancer Rate)": tractsGrp
};

var zoomHome = L.Control.zoomHome({position: 'topleft',zoomSnap: 0.25});
zoomHome.addTo(map);

createSidebar(map);
createPrintButton(map);
userInput();
defineLayers(overlays);

function createSidebar(map){   
    var sidebar = L.control.sidebar({ container: 'sidebar', autopan: true })
        .addTo(map)
        .open('home');
};

$('#regressionEquationLabel').hide();
$('#rSquaredLabel').hide();

function createPrintButton(map){
    L.easyPrint('print',{
        title: 'Print Map',
        position: 'topleft',
        sizeModes: ['current'],
        hideClasses: ['#sidebar']
    }).addTo(map);
};

function defineLayers(overlays) {
    layerList = L.control.layers(baselayers, overlays, {
        collapsed: false,
        autoZIndex: true,
        hideSingleBase: true
    }).addTo(map);
};

function removeLayers(overlays) {
    layerList = L.control.layers(baselayers, overlays, {
        collapsed: false,
        autoZIndex: true,
        hideSingleBase: true
    }).addTo(map);
};

$.getJSON("data/cancer_tracts.json", function(response){
            function styleTracts(feature) {
                return {
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.8
                };
            }
            cancerTracts = L.geoJson(response,{
                pane: 'tractsPane',
                style: styleTracts,
                onEachFeature: function(feature, layer){
                    layer.bindPopup( "Tract ID: "+"<strong>"+feature.properties.GEOID10+"</strong><br/>"+"Cancer Rate: "+feature.properties.canrate*100+"%"+"<br/>"+"Nitrate Level: "+feature.properties.nitrate)
                }
            }).addTo(tractsGrp);
        
            fillCancerTracts();
        });


$.getJSON("data/well_nitrate.json",function(response){
            function styleWells(feature) {
                return {
                    radius: 3,
                    weight: 1,
                    opacity: 1,
                    color: '#000',
                    fillOpacity: 1
                };
            };
            
            wellPoints = L.geoJson(response, {
                pane:'wellsPane',
                style: styleWells,
                pointToLayer: function (feature, latlng){
                    return L.circleMarker(latlng);
                },
                onEachFeature:
                    function(feature, layer){
                    layer.bindPopup("Well ID: "+"<strong>"+feature.properties.TARGET_FID+"</strong><br/>"+"Nitrate Level: "+feature.properties.nitr_ran+"<br/>")
                    }
            }).addTo(wellsGrp);
            fillWellPoints();
        });

function fillCancerTracts(map){
    var breaks = getTractsBreaks(cancerTracts);
    cancerTracts.eachLayer(function (layer) {
        layer.setStyle({
            fillColor: getTractsColor(layer.feature.properties.canrate, breaks)
        });
    });
    drawCancerRatesLegend(breaks);
};

function fillWellPoints(){
    var breaks = getWellsBreaks(wellPoints);
    wellPoints.eachLayer(function (layer) {
        layer.setStyle({
            fillColor: getWellsColor(layer.feature.properties.nitr_ran, breaks)
        });
    });
    drawNitrateRatesLegend(breaks);
};
function getTractsBreaks(data) {
    var values = [];
    data.eachLayer(function (layer) {
        var value = layer.feature.properties.canrate;
        values.push(value);
    });
    var clusters = ss.ckmeans(values, 5);
    var breaks = clusters.map(function (cluster) {
        return [cluster[0], cluster.pop()];
    });
    return breaks;
};

function getWellsBreaks(data) {
    var values = [];
    data.eachLayer(function (layer) {
        var value = layer.feature.properties.nitr_ran;
        values.push(value);
    });
    var clusters = ss.ckmeans(values, 5);
    var breaks = clusters.map(function (cluster) {
        return [cluster[0], cluster.pop()];
    });
    return breaks;
};

function getTractsColor(d, breaks) {
    // If the data value <= the upper value of a cluster corresponding color is returned
    if (d <= breaks[0][1]) {
        return '#f2f0f7';
    } else if (d <= breaks[1][1]) {
        return '#cbc9e2';
    } else if (d <= breaks[2][1]) {
        return '#9e9ac8';
    } else if (d <= breaks[3][1]) {
        return '#756bb1';
    } else if (d <= breaks[4][1]) {
        return '#54278f';
    }
};

function getWellsColor(d, breaks) {
    // If the data value <= the upper value of a cluster corresponding color is returned
    if (d <= breaks[0][1]) {
        return '#fee5d9';
    } else if (d <= breaks[1][1]) {
        return '#fcae91';
    } else if (d <= breaks[2][1]) {
        return '#fb6a4a';
    } else if (d <= breaks[3][1]) {
        return '#de2d26';
    } else if (d <= breaks[4][1]) {
        return '#a50f15';
    }
};

function drawNitrateRatesLegend(breaks) {
    var legend = L.control({
        position: 'bottomright'
    });
    
    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML = "<h3><b>Nitrate Concentration (ppm)</b></h3>";

        for (var i = 0; i < breaks.length; i++) {
            var color = getWellsColor(breaks[i][0], breaks);
            div.innerHTML +=
                '<span style="background:' + color + '"></span> ' +
                '<label>' + parseFloat(breaks[i][0]).toFixed(2).toLocaleString() + ' &mdash; ' +
                parseFloat(breaks[i][1]).toFixed(2).toLocaleString() + ' ppm' + '</label><br>';
        };
        return div;
    };
    legend.addTo(map);
};

function drawCancerRatesLegend(breaks) {
    var legend = L.control({
        position: 'bottomright'
    });
    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'legend');

        div.innerHTML = "<h3><b>Cancer Rate</b><br>(per Tract)</h3>";

        for (var i = 0; i < breaks.length; i++) {
            var color = getTractsColor(breaks[i][0], breaks);
            div.innerHTML +=
                '<span style="background:' + color + '"></span> ' +
                '<label>' + parseFloat(breaks[i][0] * 100).toFixed(2).toLocaleString() + '% &mdash; ' +
                parseFloat(breaks[i][1] * 100).toFixed(2).toLocaleString() + '%</label><br>';

        }
        return div;
    };
    legend.addTo(map);
};

function drawNitrateRatesLegend(breaks) {
    var legend = L.control({
        position: 'bottomright'
    });
    
    legend.onAdd = function () {

        var div = L.DomUtil.create('div', 'legend');

        div.innerHTML = "<h3><b>Nitrate Concentration</b></h3>";

        for (var i = 0; i < breaks.length; i++) {
            var color = getWellsColor(breaks[i][0], breaks);
            div.innerHTML +=
                '<span style="background:' + color + '"></span> ' +
                '<label>' + parseFloat(breaks[i][0]).toFixed(2).toLocaleString() + ' &mdash; ' +
                parseFloat(breaks[i][1]).toFixed(2).toLocaleString() + ' ppm' + '</label><br>';
        };
        return div;
    };
    legend.addTo(map);
};

function userInput() {
    var submit = $('#submitButton');

    submit.on('click', function (e) {
        submitParameters();
    });
    
    var reset = $('#resetButton');

    reset.on('click', function (e) {
        resetParameters();

        $('#regressionEquationLabel').hide();
        $('#regressionEquation').hide();
        $('#rSquaredLabel').hide();
        $('#rSquared').hide();        
    });
};

function submitParameters() {
    if (wellPoints !== undefined) {
        wellPoints.remove();
    }
    if (cancerTracts !== undefined) {
        cancerTracts.remove();
    }
    if (wellsHexgrids !== undefined) {
        wellsHexgrids.remove();
    }
    if (collectedFeaturesHexgrids !== undefined) {
        collectedFeaturesHexgrids.remove();
    }
    if (regressionHexgrids !== undefined) {
        regressionHexgrids.remove();
    }
    Q = $('#distanceDecayCoefficient').val();
    Q = parseFloat(Q);

    hexSize = $('#hexbinArea').val();
    hexSize = parseFloat(hexSize);

    if (isNaN(hexSize) || hexSize < 6 || hexSize > 30) {
        window.alert("Enter a hexbin size between 6 and 30");
        $('#hexbinArea').val(10);
        resetParameters();
        return;

    } else if (isNaN(Q) || Q < 1 || Q > 20) {
        window.alert("Enter a distance decay coefficient between 1 and 20");
        $('#distanceDecayCoefficient').val(2);
        resetParameters();
        return;
    }

    $('.legend').hide();

    layerList.remove();

    overlays = {
        "Nitrate Levels": wellsIDWGrp,
        "Cancer Rates": joinedIDWGrp,
        "Regression Residuals": regressionGrp
    };
    
    defineLayers(overlays);
    interpolateNitrateRates(Q, hexSize);
    joinCancerRatesToNitrateInterpolation(Q, hexSize);
};

function resetParameters(breaks,overlays) {
    $('.legend').hide();
    
    $('#regressionEquationLabel').hide();
    $('#regressionEquation').hide();
    $('#rSquaredLabel').hide();    
    $('#rSquared').hide();

    if (wellPoints !== undefined) {
        wellPoints.remove();
    }
    if (cancerTracts !== undefined) {
        cancerTracts.remove();
    }
    if (wellsHexgrids !== undefined) {
        wellsHexgrids.remove();
    }
    if (collectedFeaturesHexgrids !== undefined) {
        collectedFeaturesHexgrids.remove();
    }
    if (regressionHexgrids !== undefined) {
        regressionHexgrids.remove();
    }

    cancerTracts.addTo(map);
    wellPoints.addTo(map);
    
    fillWellPoints();
    fillCancerTracts();

    layerList.remove();

    overlays = {
        "Wells": wellsGrp,
        "Tracts": tractsGrp
    };

    cancerTracts.bringToBack();

    defineLayers(overlays);
    drawCancerRatesLegend(breaks);
    drawNitrateRatesLegend(breaks);
};

function interpolateNitrateRates(Q, hexSize) {
    if (wellsIDWGrp !== undefined) {
        wellsIDWGrp.clearLayers();
    }

    wellPoints.eachLayer(function (layer) {
        var props = layer.feature.properties;
        var coordinates = layer.feature.geometry.coordinates;

        wellPointsFeature = turf.point(coordinates, props);

        wellPointsArray.push(wellPointsFeature);
    });

    wellsFeatures = turf.featureCollection(wellPointsArray);

    var options = {
        gridType: 'hex',
        property: 'nitr_ran', 
        units: 'kilometers', 
        weight: Q
    };
    
    nitrateRatesHexbinsTurf = turf.interpolate(wellsFeatures, hexSize, options);

    for (var hexbin in nitrateRatesHexbinsTurf.features) {
        var interpolatedNitrateRate = nitrateRatesHexbinsTurf.features[hexbin].properties.nitr_ran;
        wellsIDWArray.push(interpolatedNitrateRate);
    }

    wellsHexgrids = L.geoJson(nitrateRatesHexbinsTurf, {

        style: function (feature) {
            return {
                color: '#585858',
                weight: 0.5,
                fillOpacity: 0.6,
                opacity: 0.5
            };
        }
    }).addTo(wellsIDWGrp);

    var breaks = getWellsBreaks(wellsHexgrids);

    wellsHexgrids.eachLayer(function (layer) {
        layer.setStyle({
            fillColor: getWellsColor(layer.feature.properties.nitr_ran, breaks)
        });
        
        var popup = "<b>Nitrate Concentration: </b>" + layer.feature.properties.nitr_ran.toFixed(2) + " ppm";

        layer.bindPopup(popup);
    });

    wellsHexgrids.bringToFront();

    drawNitrateRatesLegend(breaks);

};

function joinCancerRatesToNitrateInterpolation(Q, hexSize) {
    if (joinedIDWGrp !== undefined) {
        joinedIDWGrp.clearLayers();
    }
    
    cancerTracts.eachLayer(function (layer) {
        var props = layer.feature.properties;
        var coordinates = layer.feature.geometry.coordinates;
        
        cancerTractsFeature = turf.polygon(coordinates, props);

        var cancerTractsCentroidFeature = turf.centroid(cancerTractsFeature, props);

        cancerTractsArray.push(cancerTractsCentroidFeature);
    });
    
    tractCentroids = turf.featureCollection(cancerTractsArray);

    var gridOptions = {
        gridType: 'point',
        property: 'canrate',
        units: 'kilometers',
        weight: Q
    };

    cancerRatesGridPointsTurf = turf.interpolate(tractCentroids, hexSize, gridOptions);

    collectedFeaturesHexbinsTurf = turf.collect(nitrateRatesHexbinsTurf, cancerRatesGridPointsTurf, 'canrate', 'values');

    for (var i in collectedFeaturesHexbinsTurf.features) {
        var canrateArray = collectedFeaturesHexbinsTurf.features[i].properties.values;

        var canrateArraySum = 0;
        for (var j in canrateArray) {
            if (canrateArray.length > 0) {
                canrateArraySum += parseFloat(canrateArray[j]);
            }
        }
        var canrateArrayAvg = canrateArraySum / canrateArray.length;

        if (canrateArrayAvg !== undefined) {
            collectedFeaturesHexbinsTurf.features[i].properties.canrate = canrateArrayAvg;
        } else {
            collectedFeaturesHexbinsTurf.features[i].properties.canrate = "";
        }
    };

    collectedFeaturesHexgrids = L.geoJson(collectedFeaturesHexbinsTurf, {

        style: function (feature) {
            return {
                color: '#585858',
                weight: 0.5,
                fillOpacity: 0.6,
                opacity: 0.5
            };
        }
    }).addTo(joinedIDWGrp);

    var breaks = getTractsBreaks(collectedFeaturesHexgrids);

    collectedFeaturesHexgrids.eachLayer(function (layer) {

        layer.setStyle({
            fillColor: getTractsColor(layer.feature.properties.canrate, breaks)
        });

        var popup = "<b>Cancer Rate: </b>" + (layer.feature.properties.canrate * 100).toFixed(2).toLocaleString();

        layer.bindPopup(popup);
    });

    collectedFeaturesHexgrids.bringToFront();

    drawCancerRatesLegend(breaks);
    calculateLinearRegression(collectedFeaturesHexbinsTurf);

};

function calculateLinearRegression(collectedFeaturesHexbinsTurf) {
    if (regressionGrp !== undefined) {
        regressionGrp.clearLayers();
    }
    for (var i in collectedFeaturesHexbinsTurf.features) {

        var props = collectedFeaturesHexbinsTurf.features[i].properties;
        var interpolatedNitrateConcentration = props.nitr_ran;
        var interpolatedCancerRate = props.canrate;
        var currentNitrateAndCancerRates = [parseFloat(interpolatedNitrateConcentration), parseFloat(interpolatedCancerRate)];
        joinedIDWArray.push(currentNitrateAndCancerRates);
    }
    var regressionEquation = ss.linearRegression(joinedIDWArray);
    
    var m = regressionEquation.m;
    var b = regressionEquation.b;
    
    var regressionEquationFormatted = "y = " + parseFloat(m).toFixed(5) + "x + " + parseFloat(b).toFixed(5);

    for (var j in collectedFeaturesHexbinsTurf.features) {

        var collectedFeatureHexbinProps = collectedFeaturesHexbinsTurf.features[j].properties;
        
        var collectedHexbinInterpolatedNitrateConcentration = collectedFeatureHexbinProps.nitr_ran;
        var collectedHexbinInterpolatedCancerRate = collectedFeatureHexbinProps.canrate;

        var predictedCancerRate = m * (parseFloat(collectedHexbinInterpolatedNitrateConcentration)) + b;

        var residual = predictedCancerRate - collectedHexbinInterpolatedCancerRate;

        collectedFeaturesHexbinsTurf.features[j].properties.predictedCancerRate = predictedCancerRate;
        collectedFeaturesHexbinsTurf.features[j].properties.residual = residual;
        
        var observedNitrateAndCancerRatesPair = [collectedHexbinInterpolatedNitrateConcentration, collectedHexbinInterpolatedCancerRate];
        
        wellsTractsArray.push(observedNitrateAndCancerRatesPair);

    }
    
    var regressionLine = ss.linearRegressionLine(regressionEquation);
    
    var rSquared = parseFloat(ss.rSquared(wellsTractsArray, regressionLine)).toFixed(5);

    $('#regressionEquationLabel').show();
    $('#regressionEquation').show();
    $('#rSquaredLabel').show();    
    $('#rSquared').show();

    var regressionEquationDiv = $('#regressionEquation');
    regressionEquationDiv.html(regressionEquationFormatted);
    
    var rSquaredDiv = $('#rSquared');
    rSquaredDiv.html(rSquared);

    regressionHexgrids = L.geoJson(collectedFeaturesHexbinsTurf, {

        style: function (feature) {
            return {
                color: '#999999',
                weight: 0.5,
                fillOpacity: 0.5,
                opacity: 0.5
            };
        }
    }).addTo(regressionGrp);

    var breaks = getRegressionResidualClassBreaks(regressionHexgrids);

    regressionHexgrids.eachLayer(function (layer) {
        layer.setStyle({
            fillColor: getRegressionResidualColor(layer.feature.properties.residual, breaks)
        });

        if (getRegressionResidualColor(layer.feature.properties.residual, breaks) == '#f7f7f7') {
            layer.setStyle({
                fillOpacity: 0.1
            });
        }

        var popup = "<b>Nitrate Concentration (ppm): </b>"+ layer.feature.properties.nitr_ran.toFixed(2)+"<br/>"+
            "<b>Cancer Rate-Observed: </b>" + (layer.feature.properties.canrate * 100).toFixed(2).toLocaleString() +"<br/>" +
            "<b>Cancer Rate-Predicted: </b>" + (layer.feature.properties.predictedCancerRate * 100).toFixed(2).toLocaleString();

        layer.bindPopup(popup);

    });

    regressionHexgrids.bringToFront();

    map.removeLayer(wellsIDWGrp);
    map.removeLayer(joinedIDWGrp);

    drawRegressionResidualsLegend(breaks);
};

function getRegressionResidualClassBreaks(regressionHexgrids) {
    var values = [];
    regressionHexgrids.eachLayer(function (layer) {
        var value = layer.feature.properties.residual;
        values.push(value);
    });
    var standardDeviation = ss.sampleStandardDeviation(values);
    var breaks = [-2 * standardDeviation, -1 * standardDeviation, standardDeviation, 2 * standardDeviation];
    return breaks;
};      

function getRegressionResidualColor(d, breaks) {
    if (d <= breaks[0]) {
        return '#7b3294'; 
    } else if (d <= breaks[1]) {
        return '#c2a5cf';
    } else if (d <= breaks[2]) {
        return 'rgba(169, 169, 169, 0.6)';  
    } else if (d <= breaks[3]) {
        return '#a6dba0'; 
    } else if (d > breaks[3]) {
        return '#008837';
    }
};

function drawRegressionResidualsLegend(breaks) {
    var legend = L.control({
        position: 'bottomright'
    });

    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'legend');

        div.innerHTML = "<h3><b>Residual<br>(Predicted-Observed<br>Cancer Rate)</b></h3>";

        var colorMoreThanMinus2StdDev = getRegressionResidualColor(breaks[0], breaks);
        var colorMinus2ToMinus1StdDev = getRegressionResidualColor(breaks[1], breaks);
        var colorMinus1To1StdDev = getRegressionResidualColor(breaks[2], breaks);
        var color1To2StdDev = getRegressionResidualColor(breaks[3], breaks);
        var colorMoreThan2StdDev = '#0571b0';

        div.innerHTML +=
            '<span style="background:' + colorMoreThanMinus2StdDev + '"></span> ' +
            '<label>< -2 Std. Dev. (Under)</label><br>';
        div.innerHTML +=
            '<span style="background:' + colorMinus2ToMinus1StdDev + '"></span> ' +
            '<label>-2 Std. Dev. &mdash; -1 Std. Dev.</label><br>';
        div.innerHTML +=
            '<span style="background:' + colorMinus1To1StdDev + '"></span> ' +
            '<label>-1 Std. Dev. &mdash; 1 Std. Dev.</label><br>';
        div.innerHTML +=
            '<span style="background:' + color1To2StdDev + '"></span> ' +
            '<label>1 Std. Dev. &mdash; 2 Std. Dev.</label><br>';
        div.innerHTML +=
            '<span style="background:' + colorMoreThan2StdDev + '"></span> ' +
            '<label>> 2 Std. Dev. (Over)</label><br>';
        return div;

    };
    legend.addTo(map);
};