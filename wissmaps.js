
var map, pilotImpactLayer, targetLayer;

function loadmap() {


  // set up our real bounds
  //these will actually be dynamic and passed to this js file by a C# file via JSON
  var left = -81.7426684;
  var bottom = 29.0901949;
  var right = -81.6901007;
  var top = 29.1393509;

  //create some adjustments bounds because the odds of it being a perfect square are low
  //plus we want to keep our real world bounds intact
  var adjLeft;
  var adjBottom;
  var adjRight;
  var adjTop;

  //now lets do some inspecting of these real bounds
  var rightLeft = right - left;
  var topBottom = top - bottom;
  console.log(rightLeft + "" + topBottom);

  //compare which side of this map is the largest and make that the offset
  //the goal is to make a square - so take the longer side and squish it inward
  //we are going to make the square from both ends - top/bottom or left/right
  //lets not forget coords can be negative so we need to check for that when makin' squares
  var offset;
  if (rightLeft > topBottom) {
    offset = rightLeft - topBottom;
    adjRight = right - (offset / 2);
    adjLeft = left + (offset / 2);
    adjTop = top;
    adjBottom = bottom;
  } else if (topBottom > rightLeft) {
    offset = topBottom - rightLeft;
    adjTop = top - (offset / 2);
    adjBottom = bottom + (offset / 2);
    adjRight = right;
    adjLeft = left;
  }


  //now lets get some faux centers
  //plus to confuse matters OpenLayers does LonLat instead of normal LatLon - this is your first and final warning on that
  //longitude are those vertical lines - so that means the center point between the two is the left vertical line + the right vertical line/2
  var centerLon = (adjLeft + adjRight) / 2;
  var centerLat = (adjBottom + adjTop) / 2;

  //this just gets image tiles
  //don't mess with it - it works perfectly
  var get_my_url = function(bounds) {
      var res = this.map.getResolution();

      var z = this.map.getZoom();
      var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
      var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));

      //ok i lied - you can edit this part to fit your image path needs - keep z x y in that order please
      var path = "tile_" + z + "_" + x + "-" + y + "." + this.type;
      var url = this.url;
      if (url instanceof Array) {
        url = this.selectUrl(path, url);
      }
      return url + path;
    }

    //look at the api - tons of options to set
  var options = {
    //bounds always in form of - left, bottom, right, top
    //obviously we are going to use the adjustments here otherwise we've done all the work above for nothing
    maxExtent: new OpenLayers.Bounds(adjLeft, adjBottom, adjRight, adjTop),
    //maxExtent: new OpenLayers.Bounds(left, bottom, right, top),
    numZoomLevels: 6,
    projection: "EPSG:900913",
    displayProjection: new OpenLayers.Projection("EPSG:4326")
  };

  //name of div + options above
  var map = new OpenLayers.Map('wissmap', options);


  //tms - tile mapping system
  //using TMS because we cannot, cannot use an external API that connects to the internet .... like Google maps
  var tms = new OpenLayers.Layer.TMS('Aerial', 'output/', {
    type: 'png',
    getURL: get_my_url
  });


  var rightLeftDirty;
  var topBottomDirty;

  if (adjRight != right && adjLeft != left) {
    rightLeftDirty = true;
  }
  if (adjTop != top && adjBottom != bottom) {
    topBottomDirty = true;
  }

  var toCenter;
  if (rightLeftDirty) {
    toCenter = right - centerLon;
  } else if (topBottomDirty) {
    toCenter = top - centerLat;
  }


  //lets create some points for testing
  //obviously in the future these will be real points again passed from C# via JSON
/*var tgt = [
    [-81.707370, 29.120065],
    [-81.724625, 29.118087],
    [-81.733006, 29.135575],
    [-81.724479, 29.114774],
    [-81.733929, 29.093696],
    [right, top],
    [left, top],
    [right, bottom],
    [left, bottom]
  ];

*/
  //Targets JSON
  var targetObjects = [{
    "name": "Johnny",
    "longitude": -81.707370,
    "latitude": 29.120065,
    "shapeId": 0,
    "shapeAngle": 45
  }, {
    "name": "Tommy",
    "longitude": -81.724625,
    "latitude": 29.118087,
    "shapeId": 0,
    "shapeAngle": 90
  }, {
    "name": "Joan",
    "longitude": -81.733006,
    "latitude": 29.135575,
    "shapeId": 0,
    "shapeAngle": 135
  }, {
    "name": "Sunny-D",
    "longitude": -81.724479,
    "latitude": 29.114774,
    "shapeId": 0,
    "shapeAngle": 180
  }, {
    "name": "George",
    "longitude": -81.733929,
    "latitude": 29.093696,
    "shapeId": 0,
    "shapeAngle": 225
  }, ];


  //All we are doing here is some styling. What we want is from far away our targets point to appear tiny
  //as you zoom in those targets get larger and so do out points
  //this needs to be cleaned up because we hard coded the 2.25 which is just a magical made up number for this instance
  //the size should be dyamic with the zoom there is an OpenLayers example on this sort of
  style = new OpenLayers.Style(
  OpenLayers.Util.extend(
  OpenLayers.Feature.Vector.style.default, {
    pointRadius: "${calculateRadius}"
  }), {
    context: {
      calculateRadius: function(f) {
        var resize = 2.25 * f.layer.map.getZoom();
        console.log("resize: " + resize);
        return resize;
      }
    }
  });

  sm = new OpenLayers.StyleMap({
    "default": style
  });

  pilotImpactLayer = new OpenLayers.Layer.Vector("Impacts", {

    styleMap: styleMap,
    visibility: false,

   }


  );

  targetLayer = new OpenLayers.Layer.Vector("Targets", {
    styleMap: sm,

    //Event listener for feature selection
    eventListeners: {
      'featureselected': function(evt) {

        var feature = evt.feature;

        var popup = new OpenLayers.Popup.FramedCloud("popup", feature.geometry.getBounds().getCenterLonLat(),
        //new OpenLayers.LonLat(feature.attributes.longitude, feature.attributes.latitude),
        null, "<div style='font-size:.8em'>Name: " + feature.attributes.name + "<br>Longitude: " + feature.attributes.longitude + "<br>Latitude: " + feature.attributes.latitude + "</div>", null, true, onPopupClose);
        feature.popup = popup;
        popup.feature = feature;
        map.addPopup(popup);
      },
      'featureunselected': function(evt) {

        feature = evt.feature;
        if (feature.popup) {
          popup.feature = null;
          map.removePopup(feature.popup);
          feature.popup.destroy();
          feature.popup = null;
        }
      }


    }
  });


  //px are right/left
  //py are top/bottom
  var px, py;
  var targetPolygonFeatures = [];
  var pointGeometry;
  var pointFeature;

  var distance;
  var push;
  var adjPx;
  var adjPy;
  var pointList = [];

  //Target polygons
  for (var i = 0; i < targetObjects.length; i++) {
    px = targetObjects[i].longitude;
    py = targetObjects[i].latitude;

    if (rightLeftDirty) {
      distance = centerLon - px;
      push = (distance / toCenter) * offset;
      adjPx = px + push;
      pointGeometry = new OpenLayers.Geometry.Point(adjPx, py);
    } else if (topBottomDirty) {
      distance = centerLat - py;
      push = (distance / toCenter) * offset;
      adjPy = py + push;
      pointGeometry = new OpenLayers.Geometry.Point(px, adjPy);
    }


    var polygonFeature = returnPolygonFeature(pointGeometry, targetObjects[i]);
    targetPolygonFeatures.push(polygonFeature);


  }


  targetLayer.addFeatures(targetPolygonFeatures);

  selectControl = new OpenLayers.Control.SelectFeature(targetLayer);


  //Pilot Impact point geometries
  var pilotXValues;
  var pilotYValues;
  var pilotImpactPolygonFeatures = [];
  var currentPilot;
  for (var i = 0; i < pilotObjects.length; i++) {

    currentPilot = pilotObjects[i];
    pilotXValues = currentPilot.impactXValues;
    pilotYValues = currentPilot.impactYValues;
    pilotColorMap[currentPilot.pilotId]=
{
  "name":currentPilot.name,
    "color":currentPilot.color
  }
    lookup[currentPilot.pilotId]={fillColor: currentPilot.color};

    for (var j = 0; j < pilotXValues.length; ++j) {


      px = pilotXValues[j];
      py = pilotYValues[j];
      console.log(px+" "+py);
      if (rightLeftDirty) {
        distance = centerLon - px;
        push = (distance / toCenter) * offset;
        adjPx = px + push;
        pointGeometry = new OpenLayers.Geometry.Point(adjPx, py);
      } else if (topBottomDirty) {
        distance = centerLat - py;
        push = (distance / toCenter) * offset;
        adjPy = py + push;
        pointGeometry = new OpenLayers.Geometry.Point(px, adjPy);
      }

var attributes = {

      'pilotId': currentPilot.pilotId
    };

      var polygonImpactFeature = new OpenLayers.Feature.Vector(pointGeometry, attributes);

console.log(polygonImpactFeature);
      pilotImpactPolygonFeatures.push(polygonImpactFeature);


    }
}

 styleMap.addUniqueValueRules("default", "pilotId", lookup);
    targetLayer.addFeatures(targetPolygonFeatures);
    pilotImpactLayer.addFeatures(pilotImpactPolygonFeatures);


    map.addLayers([tms, targetLayer, pilotImpactLayer]);


    map.addControl(selectControl);
    selectControl.activate();


    map.setCenter([centerLon, centerLat], 2);

  drawLegend();
  }

  var selectControl;

/*
var xPoint = [0, 9, 36, 36, 46, 65, 63, 77, 86, 80, 91, 91, 97, 109, 114, 112, 115, 112, 114, 109, 97, 91, 91, 80, 86, 77, 63, 65, 46, 36, 36, 9, 0];

var yPoint = [0, 4, 5, 8, 8, 24, 24, 35, 35, 7, 6, 4, 3, 15, 15, 1, 0, -1, -15, -15, -3, -4, -6, -7, -35, -35, -24, -24, -8, -8, -5, -4, 0];
*/


  var shapeObjects = [{
    "shapeId": 0,
    "xValues": [0, 9, 36, 36, 46, 65, 63, 77, 86, 80, 91, 91, 97, 109, 114, 112, 115, 112, 114, 109, 97, 91, 91, 80, 86, 77, 63, 65, 46, 36, 36, 9, 0],
    "yValues": [0, 4, 5, 8, 8, 24, 24, 35, 35, 7, 6, 4, 3, 15, 15, 1, 0, -1, -15, -15, -3, -4, -6, -7, -35, -35, -24, -24, -8, -8, -5, -4, 0]
  }];



  var pilotObjects = [{

    "pilotId": 0,
    "name": "Michael Hsu The Ace Pilot",
    "impactXValues": [-81.707370, -81.733006],
    "impactYValues": [ 29.120065, 29.135575],
    "color": "#FF0000"

  },

{

    "pilotId": 1,
    "name": "Dr.Jiang Guo The Ultimate Ace Pilot",
    "impactXValues": [-81.724625, -81.724625,-81.724625,-81.733006, -81.724479, -81.733929],
    "impactYValues": [ 29.118087, 29.119,29.120,29.135575, 29.114774, 29.093696],
    "color": "#0000FF"

  }



  ];

/*
"name": "Tommy",
    "longitude": -81.724625,
    "latitude": 29.118087,
    "shapeId": 0,
    "shapeAngle": 90
  }, {
    "name": "Joan",
    "longitude": -81.733006,
    "latitude": 29.135575,
    "shapeId": 0,
    "shapeAngle": 135
  }, {
    "name": "Sunny-D",
    "longitude": -81.724479,
    "latitude": 29.114774,
    "shapeId": 0,
    "shapeAngle": 180
  }, {
    "name": "George",
    "longitude": -81.733929,
    "latitude": 29.093696,
    "shapeId": 0,
    "shapeAngle": 225

*/

  var pilotColorMap = new Object();
   var styleMap = new OpenLayers.StyleMap({
                fillOpacity: 1,
                pointRadius: 6
            });

  var lookup = {
              
            };
  function get(k) {
    return pilotColorMap[k];
}

  function returnPolygonFeature(point, targetObject) {

    var pointList = [];

    var maxX = maxY = minX = minY = 0;

    var shapeToDraw;
    var xPoint;
    var yPoint;
    //Get Shape from  shapeId
    for (var index = 0; index < shapeObjects.length; ++index) {
      if (shapeObjects[index].shapeId == targetObject.shapeId) {

        shapeToDraw = shapeObjects[index];
        xPoint = shapeToDraw.xValues;
        yPoint = shapeToDraw.yValues;
        break;
      }


    }
/*
console.log("shape: ");
console.log(shapeToDraw);
*/
    for (var p = 0; p < xPoint.length; ++p) {
      if (maxX < xPoint[p]) maxX = xPoint[p];
      if (maxY < yPoint[p]) maxY = yPoint[p];
      if (minX > xPoint[p]) minX = xPoint[p];
      if (minY > yPoint[p]) maxY = yPoint[p];

      var newPoint = new OpenLayers.Geometry.Point(point.x + xPoint[p], point.y + yPoint[p]);
      pointList.push(newPoint);
    }
    pointList.push(pointList[0]);

    var linearRing = new OpenLayers.Geometry.LinearRing(pointList);

    // Centering the plane to the point 
    var moveX = -Math.round((maxX + minX) / 2);
    var moveY = -Math.round((maxY + minY) / 2);
    linearRing.move(moveX, moveY);

    // Resizing the plane
    linearRing.resize(0.0000025, point);

    var attributes = {

      'longitude': point.x,
      'latitude': point.y,
      'name': targetObject.name

    };
    var polygonFeature = new OpenLayers.Feature.Vector(
    new OpenLayers.Geometry.Polygon([linearRing]), attributes);

    //Clounter-clockwise, Angle to be clarified, right now it makes it straight
    polygonFeature.geometry.rotate(-90, point);

    //polygonFeature.geometry.rotate(targetObject.shapeAngle, point);
    return polygonFeature;

  }

  function onPopupClose(evt) {
    // 'this' is the popup.
    selectControl.unselect(this.feature);
  }
   function toggleControl(element){
         if(element.value =="impact"){
          console.log("Show impact");
          pilotImpactLayer.setVisibility(element.checked);
         }
         if(element.value == "target"){
          targetLayer.setVisibility(element.checked);
         }
        }

  function drawLegend()
  {
    var pilotNameColor;

    for (var prop in pilotColorMap) {
      // important check that this is objects own property 
      // not from prototype prop inherited
      if(pilotColorMap.hasOwnProperty(prop)){
        pilotNameColor=  pilotColorMap[prop];

          document.getElementById("pilotColorLegend").innerHTML+="<li><span style=\"background-color:"+pilotNameColor.color+";\"></span> "+pilotNameColor.name+"</li>";
      }
   }





  }