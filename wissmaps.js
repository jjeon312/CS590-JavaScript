function loadmap() {

/*
Mapping 101

Coordinates run from 180(right) to -180(left) and 90(top) to -90(bottom).
This means - right is always greater than left.  And top is always greater than bottom.

Maps are always cut as squares (never rectangles).  Because of this our bounds MUST also be square.
Even when we are supplied a rectangle map - it will always, always be cut into a square by the tiling
program.  Each square tile is always sized 256px.  

So we run into an issue.  If we are given a rectangle map - we CANNOT just simple crop it because we
would loose valuble information (ie. targets, cameras, etc).  So we rely on the tiling system to make
a faux square - meaning it will cut the image into a square and fill in extra space with black
background.

Now we are faced with having to deal with bounds that fit a rectangle, but now must be translated to fit a square.
So we must do some prep work before we can get into 'real' mapping work.  Basically just like the tiling program
we need to create an adjusted faux bound and then recompensate when plotting targets.

Follow the rabbit down the hole to see how this is done...
*/

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
   if (rightLeft > topBottom){
    offset = rightLeft - topBottom;
    adjRight = right - (offset/2);
       adjLeft = left + (offset/2);
    adjTop = top;
       adjBottom = bottom;
   }
   else if (topBottom > rightLeft){
    offset = topBottom - rightLeft;
       adjTop = top - (offset/2);
       adjBottom = bottom + (offset/2);
       adjRight = right;
       adjLeft = left;
   }


   //now lets get some faux centers
   //plus to confuse matters OpenLayers does LonLat instead of normal LatLon  - this is your first and final warning on that
   //longitude are those vertical lines - so that means the center point between the two is the left vertical line + the right vertical line/2
   var centerLon = (adjLeft + adjRight) / 2;
   var centerLat = (adjBottom + adjTop) / 2;

   //this just gets image tiles
   //don't mess with it - it works perfectly
   var get_my_url = function (bounds) {
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
   };

   //name of div + options above
   var map = new OpenLayers.Map(
   'wissmap',
   options
   );

   //tms - tile mapping system
//using TMS because we cannot, cannot use an external API that connects to the internet .... like Google maps
   var tms = new OpenLayers.Layer.TMS(
   'Aerial',
   'output/',
   {
       type: 'png',
       getURL: get_my_url      
   });

   /* Dirty Point Plotiung

    Yep - you read that right. Now we need to do some dirty work. Because we went and adjusted
    our real world bounds.  So to compensate for that offset - because in the real world your bounds
    are the ones defined at the tip-top of the fucntion - not the adjusted ones.  

    So we have to adjust all our targets so the appear on the map properly.  So what we are going to
    do is keep the real lat/lon for cool things like popups/hovers but plot dirty points for targets
so that all are targets appear to be in the correct location.  
    Basically doing some slight of hand, obtical illusions.

   */

   //first we need to know if we are going to dirty the lon (left/right) or lat (top/bottom)
   //hence why I said keep a clean version - hope you didn't cheat
   var rightLeftDirty;
   var topBottomDirty;

   if (adjRight != right && adjLeft != left){
    rightLeftDirty = true;
   }
   if (adjTop != top && adjBottom != bottom){
    topBottomDirty = true;
   }

   var toCenter;
   if (rightLeftDirty){
       toCenter = right - centerLon;
   }
   else if (topBottomDirty) {
       toCenter = top - centerLat;
   }


   //lets create some points for testing
//obviously in the future these will be real points again passed from C# via JSON
   var tgt = [
       [-81.707370,29.120065],
       [-81.724625,29.118087],
       [-81.733006,29.135575],
       [-81.724479,29.114774],
       [-81.733929,29.093696],
       [right,top],[left,top],
       [right,bottom],[left,bottom]];

   //All we are doing here is some styling.  What we want is from far away our targets point to appear tiny
//as you zoom in those targets get larger and so do out points
//this needs to be cleaned up because we hard coded the 2.25 which is just a magical made up number for this instance
//the size should be dyamic with the zoom there is an OpenLayers example on this sort of
style = new OpenLayers.Style(
   OpenLayers.Util.extend(
       OpenLayers.Feature.Vector.style.default,
       {
           pointRadius: "${calculateRadius}"
       }
   ),
   {
       context: {
           calculateRadius: function(f){
               var resize = 2.25*f.layer.map.getZoom();
               console.log(resize);
               return resize;
               }
           }
       }
   );

   sm = new OpenLayers.StyleMap({
   "default": style
   });

   var pointsLayer = new OpenLayers.Layer.Vector("Targets", {styleMap: sm});


   //px are right/left
   //py are top/bottom

   var px, py;
   var pointFeatures = [];
   var pointGeometry;
   var pointFeature;

   var distance;
   var push;
   var adjPx;
   var adjPy;
var pointList = [];
   for(var i = 0; i < tgt.length; i++) {
       px = tgt[i][0];
       py = tgt[i][1];

       if (rightLeftDirty) {
           distance = centerLon - px;
           push = (distance/toCenter)*offset;
           adjPx = px + push;
           pointGeometry = new OpenLayers.Geometry.Point(adjPx, py);
       }
       else if (topBottomDirty) {
           distance = centerLat - py;
           push = (distance/toCenter)*offset;
           adjPy = py + push;
           pointGeometry = new OpenLayers.Geometry.Point(px, adjPy);
       }


var polygonFeature=returnPolygonFeature(pointGeometry);
pointFeatures.push(polygonFeature);


/*

       pointFeature = new OpenLayers.Feature.Vector(OpenLayers.Geometry.Polygon.createRegularPolygon(
   pointGeometry,
   0.001,
   5
));

       pointFeatures.push(pointFeature);  
*/
   }


   pointsLayer.addFeatures(pointFeatures);


   map.addLayers([tms,pointsLayer]);
   map.setCenter([centerLon, centerLat], 2);
}



var xPoint = [ 0, 9, 36, 36, 46, 65, 63, 77, 86, 80, 91, 91, 97,
109, 114, 112, 115, 112, 114, 109, 97, 91, 91, 80, 86, 77, 63, 65,
46, 36, 36, 9, 0 ];

var yPoint = [ 0, 4, 5, 8, 8, 24, 24, 35, 35, 7, 6, 4, 3, 15, 15,
1, 0, -1, -15, -15, -3, -4, -6, -7, -35, -35, -24, -24, -8, -8, -5,
-4, 0 ];
function returnPolygonFeature(point)
{

var pointList = [];
           for(var p=0; p<xPoint.length; ++p) {
               
               var newPoint = new OpenLayers.Geometry.Point(point.x + xPoint[p],
                                                            point.y + yPoint[p]);
               pointList.push(newPoint);
           }
           pointList.push(pointList[0]);

           var linearRing = new OpenLayers.Geometry.LinearRing(pointList);
linearRing.resize(0.00001, point);
           var polygonFeature = new OpenLayers.Feature.Vector(
               new OpenLayers.Geometry.Polygon([linearRing]));
             return polygonFeature;

}
