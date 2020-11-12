/*  GravityIsNotAForce - Visualising geodesics in general relativity
    Copyright (C) 2020 Tim J. Hutton

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

var canvas;
var ctx;
var spacetime_range;
var time_range_offset;
var vertical_vertical_view_angle;
var horizontal_vertical_view_angle;

// Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf :
// Pick the shape of funnel we want: (Eq. 46)
var sin_theta_zero = 0.8; // angle of slope at the bottom (controlled by a slider)
var r_0 = 1; // radius at the bottom
var delta_tau_real = 1; // proper time per circumference, in seconds (controlled by a slider)
// Compute k, delta and alpha (Eq. 47)
var x_0 = earth_radius / earth_schwarzschild_radius;
var sqr_x_0 = Math.pow(x_0, 2);
var a_e0 = 1 - 1 / x_0; // (Eq. 14, because using exterior metric)
var R_g = earth_schwarzschild_radius;
var k; // (these things are computed in computeJonssonShapeParameters())
var delta;
var alpha;
var sqrt_alpha;

class Geodesic {
    constructor(peak, color) {
        this.peak = peak;
        this.color = color;
    }
}

class Graph {
    constructor(screen_rect, transform, top_text, left_text, bottom_text) {
        this.screen_rect = screen_rect;
        this.transform = transform;
        this.top_text = top_text;
        this.left_text = left_text;
        this.bottom_text = bottom_text;
    }
}

function toDistanceFallenDistortedAxes(p)
{
    // return the corresponding location on the axes where the space dimension is shifted up by the distance fallen
    var time = p.x;
    var final_height = p.y;
    var time_mid = spacetime_range.center.x; // center of the current time window
    var time_diff = Math.abs(time - time_mid);
    return new P(time, findInitialHeight(time_diff, final_height, earth_mass));
}

function fromDistanceFallenDistortedAxes(p)
{
    // return the corresponding location on the orthogonal axes given the location on the ones where the space dimension is shifted up by the distance fallen
    var time = p.x;
    var height = p.y;
    var time_mid = spacetime_range.center.x; // center of the current time window
    var time_diff = Math.abs(time - time_mid);
    return new P(time, height - freeFallDistance(time_diff, height, earth_mass));
}

function getFreeFallPoints(peak_time, peak_height, min_height, planet_mass, n_pts = 100) {
    var fallTime = freeFallTime(peak_height, min_height, planet_mass);
    var pts = [];
    // from the left up
    for(var i=0;i<n_pts;i++) {
        var t = peak_time - fallTime + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(peak_time-t, peak_height, planet_mass);
        pts.push(new P(t,h));
    }
    // from the top down
    for(var i=0;i<=n_pts;i++) {
        var t = peak_time + i*fallTime/n_pts;
        var h = peak_height - freeFallDistance(t - peak_time, peak_height, planet_mass);
        pts.push(new P(t,h));
    }
    return pts;
}

function fitTimeRange(time_range_offset) {
    // pick the time range to allow for a free-fall from the max height to the min height
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    // time_range_offset slides the time window left and right by multiples of the existing time range
    spacetime_range.p.x = -fall_time + fall_time*time_range_offset;
    spacetime_range.size.x = fall_time * 2;
    console.log(spacetime_range.size.x);
}

function computeJonssonShapeParameters() {
    // Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf
    // Compute k, delta and alpha (Eq. 47)
    k = delta_tau_real * light_speed / ( 2 * Math.PI * Math.sqrt(a_e0) * R_g );
    delta = Math.pow(k / ( 2 * sin_theta_zero * sqr_x_0 ), 2);
    alpha = Math.pow(r_0, 2) / ( 4 * Math.pow(x_0, 4) * Math.pow(sin_theta_zero, 2) + Math.pow(k, 2) );
    sqrt_alpha = Math.sqrt(alpha);

    // DEBUG
    //var h = 2.6;
    //var a = new P(0, earth_radius + h);
    //var b = new P(0.001, earth_radius + h);
    //geodesic_pts = getGeodesicPoints(a, b, 2000);
}

function JonssonEmbeddingRadius(delta_x) {
    // Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf

    // compute the radius at this point (Eg. 48)
    return k * sqrt_alpha / Math.sqrt( delta_x / sqr_x_0 + delta );
}

function JonssonEmbeddingDeltaZ(delta_x) {
    // Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf

    // integrate over x to find delta_z (Eg. 49)
    var term1 = Math.pow(k, 2) / ( 4 * Math.pow(x_0, 4) );
    return sqrt_alpha * simpsons_integrate( 0, delta_x, 1000,
        x => {
            var term2 = 1 / ( x / sqr_x_0 + delta );
            return term2 * Math.sqrt( 1 - term1 * term2 );
        });
}

function JonssonEmbedding(p) {
    // Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf

    var theta = 2 * Math.PI * p.x / delta_tau_real; // convert time in seconds to angle
    var x = p.y / earth_schwarzschild_radius;
    var delta_x = x - x_0;

    var radius = JonssonEmbeddingRadius(delta_x);
    var delta_z = JonssonEmbeddingDeltaZ(delta_x);
    
    return new P(radius * Math.cos(theta), radius * Math.sin(theta), delta_z);
}

function getJonssonEmbeddingSurfaceNormalFromSpacetime(p) {
    var theta = 2 * Math.PI * p.x / delta_tau_real; // convert time in seconds to angle
    var x = p.y / earth_schwarzschild_radius;
    var delta_x = x - x_0;
    return getJonssonEmbeddingSurfaceNormal(delta_x, theta);
}

function getJonssonEmbeddingSurfaceNormal(delta_x, theta) {
    var term1 = delta_x / sqr_x_0 + delta;
    var dr_dx = - k * sqrt_alpha / (2 * sqr_x_0 * Math.pow(term1, 3 / 2)); // derivative of Eq. 48 wrt. delta_x
    var dz_dx = sqrt_alpha * Math.sqrt(1 - Math.pow(k, 2) / (4 * Math.pow(x_0, 4) * term1)) / term1; // from Eq. 49
    var dz_dr = dz_dx / dr_dx;
    var normal = normalize(new P(-dz_dr, 0, 1)); // in the XZ plane
    return rotateXY(normal, theta);
}

function getJonssonEmbeddingDeltaXFromDeltaZ(delta_z) {
    var delta_x_max = earth_radius * 2 / earth_schwarzschild_radius - x_0;
    return bisection_search(delta_z, 0, delta_x_max, 1e-6, 100, delta_x => JonssonEmbeddingDeltaZ(delta_x));
}

function getSurfaceNormalAtJonssonEmbeddingPoint(p) {
    var delta_z = p.z;
    var delta_x = getJonssonEmbeddingDeltaXFromDeltaZ(delta_z);
    var theta = Math.atan2(p.y, p.x);
    return getJonssonEmbeddingSurfaceNormal(delta_x, theta);
}

function getGeodesicPoints(a, b, max_points) {
    // Walk along the embedding following the geodesic until we hit delta_x = 0 or have enough points
    var ja = JonssonEmbedding(a);
    var jb = JonssonEmbedding(b);
    var pts = [ja, jb]; // TODO: eventually we want the spacetime coordinates for the points, not the embedding ones
    for(var iPt = 0; iPt < max_points; iPt++) {
        var n = getSurfaceNormalAtJonssonEmbeddingPoint(jb);
        var incoming_segment = sub(jb, ja);
        var norm_vec = normalize(cross(incoming_segment, n));
        var theta = bisection_search(0, Math.PI / 2 , 3 * Math.PI / 2, 1e-6, 200, theta => {
            var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
            // decide if this point is inside or outside the funnel
            var actual_radius = len(new P(jc.x, jc.y));
            var delta_z = Math.max(0, jc.z); // not sure what to do here
            var delta_x = getJonssonEmbeddingDeltaXFromDeltaZ(delta_z);
            var expected_radius = JonssonEmbeddingRadius(delta_x);
            return expected_radius - actual_radius;
        });
        var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
        if( jc.z < 0 ) { 
            console.log('jc.z < 0');
            break;
        }
        pts.push(jc);
        ja = jb;
        jb = jc;
        // TODO: find the spacetime coordinates that correspond to this point on the embedding
    }
    return pts;
}

function testEmbeddingByPathLengths() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure their arc length on the embedding - the one for the correct g should be the shortest
    var time_to_fall = 1; // pick a time
    for(var dm = -earth_mass *0.7; dm < earth_mass / 2; dm += earth_mass / 20) {
        var planet_mass = earth_mass + dm;
        var h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        var pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 100).map(JonssonEmbedding);
        var length = 0;
        for(var iPt = 1; iPt < pts.length; iPt++) {
            length += dist(pts[iPt], pts[iPt-1]);
        }
        console.log(dm, h, length);
    }
    throw new Error(); // to stop the rest of the script
}

function testEmbeddingByPathTurning() {
    // generate trajectories that start and end at the same points, for different values of g
    // measure how much they deviate from the plane that includes the surface normal
    var time_to_fall = 1; // pick a time
    [/*-earth_mass * 0.1, 0,*/ earth_mass * 0.1].forEach( dm => {
        var planet_mass = earth_mass + dm;
        var h = findInitialHeight(time_to_fall, earth_radius, planet_mass);
        var pts = getFreeFallPoints(0, h, earth_radius, planet_mass, 200);
        var sum_turns = 0;
        var sum_abs_turns = 0;
        for(var iPt = 1; iPt < pts.length-1; iPt++) {
            var p = JonssonEmbedding(pts[iPt]);
            var n = JonssonEmbeddingSurfaceNormal(pts[iPt]);
            var pre = JonssonEmbedding(pts[iPt-1]);
            var post = JonssonEmbedding(pts[iPt+1]);
            var incoming_segment = sub(p, pre);
            var outgoing_segment = sub(post, p);
            var norm_vec = normalize(cross(incoming_segment, n));
            var turning_angle = Math.asin(dot(outgoing_segment, norm_vec) / len(outgoing_segment));
            sum_turns += turning_angle;
            sum_abs_turns += Math.abs(turning_angle);
            console.log(turning_angle);
        }
    });
    throw new Error(); // to stop the rest of the script
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    var lowest_height = earth_radius;
    //var highest_allowed_top = moon_distance;
    var highest_allowed_top = earth_radius + 10000;
    var lowest_allowed_top = lowest_height + 500;

    spacetime_range = new Rect( new P(-0.5, lowest_height), new P(1, 3));

    /*var heightRangeSlider = document.getElementById("heightRangeSlider");
    spacetime_range.size.y = lowest_allowed_top + (highest_allowed_top-lowest_allowed_top) * Math.pow(heightRangeSlider.value / 100.0, 3) - lowest_height;
    heightRangeSlider.oninput = function() {
        spacetime_range.size.y = lowest_allowed_top + (highest_allowed_top-lowest_allowed_top) * Math.pow(heightRangeSlider.value / 100.0, 3) - lowest_height;
        console.log("spacetime_range.size.y: ",spacetime_range.size.y);
        fitTimeRange(time_range_offset);
        draw();
    }*/

    /*var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    time_range_offset = 1 - 2 * timeTranslationSlider.value / 100.0;
    timeTranslationSlider.oninput = function() {
        time_range_offset = 1 - 2 * timeTranslationSlider.value / 100.0;
        fitTimeRange(time_range_offset);
        draw();
    }*/
    //time_range_offset = 0;
    //fitTimeRange(time_range_offset);

    var verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
    vertical_view_angle = 0 - 10 * verticalViewAngleSlider.value / 100.0;
    verticalViewAngleSlider.oninput = function() {
        vertical_view_angle = 0 - 10 * verticalViewAngleSlider.value / 100.0;
        draw();
    }

    var horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");
    horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    horizontalViewAngleSlider.oninput = function() {
        horizontal_view_angle = Math.PI + 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        draw();
    }

    var slopeSlider = document.getElementById("slopeSlider");
    sin_theta_zero = 0.999 * slopeSlider.value / 100.0;
    slopeSlider.oninput = function() {
        sin_theta_zero = 0.999 * slopeSlider.value / 100.0;
        computeJonssonShapeParameters();
        draw();
    }

    var timeWrappingSlider = document.getElementById("timeWrappingSlider");
    delta_tau_real = 3 - 2.2 * timeWrappingSlider.value / 100.0;
    timeWrappingSlider.oninput = function() {
        delta_tau_real = 3 - 2.2 * timeWrappingSlider.value / 100.0;
        computeJonssonShapeParameters();
        draw();
    }

    //fitTimeRange(time_range_offset);

    computeJonssonShapeParameters();
    draw();
}

function drawNormal(p, color, camera) {
    var jp = JonssonEmbedding(p);
    var jn = JonssonEmbeddingSurfaceNormal(p);
    var pts = [jp, add(jp, scalar_mul(jn, 0.1))].map(p => camera.project(p));
    drawLine(pts, color);
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    var x_axis = getLinePoints(spacetime_range.min, new P(spacetime_range.xmax, spacetime_range.ymin), 200);
    var y_axis = getLinePoints(new P(0, spacetime_range.ymin), new P(0, spacetime_range.ymax), 200);
    var minor_axes = [];
    var y_step = Math.pow(10, Math.floor(Math.log10(spacetime_range.size.y)))/5;
    for(var y = spacetime_range.ymin; y<=spacetime_range.ymax; y+= y_step) {
        minor_axes.push(getLinePoints(new P(spacetime_range.xmin, y), new P(spacetime_range.xmax, y), 200));
    }

    var x_step = 0.1;
    for(var x = x_step; x<=spacetime_range.xmax; x+= x_step) {
        minor_axes.push(getLinePoints(new P(x, spacetime_range.ymin), new P(x, spacetime_range.ymax), 200));
    }
    for(var x = -x_step; x>=spacetime_range.xmin; x-= x_step) {
        minor_axes.push(getLinePoints(new P(x, spacetime_range.ymin), new P(x, spacetime_range.ymax), 200));
    }
    var fall_time = freeFallTime(spacetime_range.ymax, spacetime_range.ymin, earth_mass);
    var geodesics = [new Geodesic(new P(0, spacetime_range.ymin+2.6), 'rgb(100,100,200)'),
                     new Geodesic(new P(0, spacetime_range.ymin+0.5), 'rgb(200,100,100)'),
                     new Geodesic(new P(0, spacetime_range.ymin+0.2), 'rgb(200,100,200)'),
                     new Geodesic(new P(0, spacetime_range.ymin+1.3), 'rgb(100,200,100)')];
    /*for(var i=0;i<=10;i++) {
        geodesics.push( new Geodesic(new P(0, spacetime_range.ymin+i*spacetime_range.size.y/10.0), 'rgb(150,150,150)') );
    }*/

    var n_graphs = 2;
    var margin = 40;
    var size = Math.min(canvas.height-margin*2, (canvas.width-margin*(n_graphs+1)) / n_graphs);
    var rect1 = new Rect( new P(margin+(margin+size)*0,50), new P(size,size));
    var rect2 = new Rect( new P(margin+(margin+size)*1,50), new P(size,size));
    var rect3 = new Rect( new P(margin+(margin+size)*2,50), new P(size,size));
    var rect4 = new Rect( new P(margin+(margin+size)*3,50), new P(size,size));
    var distanceFallenTransform = new Transform( toDistanceFallenDistortedAxes, fromDistanceFallenDistortedAxes );
    var flipY = p => new P(p.x, spacetime_range.ymax - p.y + spacetime_range.ymin);
    var flipYTransform = new Transform( flipY, flipY );

    // define the Klein pseudosphere transforms
    /*var circle = new Circle(new P(rect4.center.x, rect4.ymin), rect4.size.x); // TODO: make own space
    var invert = p => circle.invert(p);
    var inversionTransform = new Transform( invert, invert );
    var x_extent = 1;
    var y_extent = 1;
    var spacing = 100;
    var kp_input_rect = new Rect(new P(circle.p.x-circle.r*x_extent,circle.p.y+circle.r), new P(2*circle.r*x_extent,circle.r*y_extent));
    var circle2 = new Circle(rect4.center, rect4.size.x/2); // the half-plane (~kp_input_rect) transformed into this circle
    var poincareToKleinTransform = new Transform( p => poincareToKlein(p, circle2), p => kleinToPoincare(p, circle2) ); // TODO: doesn't work as expected
    var kleinPseudosphereAxes = new Graph( rect4, new ComposedTransform( new LinearTransform2D(spacetime_range, kp_input_rect),
                        inversionTransform, /poincareToKleinTransform/ ), "Poincare-pseudosphere", "", "" ); // TODO add transform to rect4
                        */

    // define the 3D transforms
    /*var toPseudosphereCoords = new LinearTransform2D(spacetime_range, new Rect(new P(-2,0), new P(4,1.5)));
    var identityTransform = p => new P(p.x, p.y, p.z);
    var pseudosphereTransform = new Transform(pseudosphere, identityTransform); // TODO: need camera ray intersection for the reverse
    var camera = new Camera(new P(-10,-0.5,-vertical_view_angle), new P(0,0,-0.5), new P(0,0,-1), 1500, rect3.center);
    var cameraTransform = new Transform( p => camera.project(p), identityTransform );
    var pseudosphereAxes = new Graph( rect3, new ComposedTransform( toPseudosphereCoords, pseudosphereTransform, cameraTransform), "Pseudosphere", "", "" );*/

    // define the Jonsson embedding transforms
    var identityTransform = p => new P(p.x, p.y, p.z);
    var JonssonEmbeddingTransform = new Transform( p => JonssonEmbedding(p), identityTransform );
    var camera = new Camera(new P(10*Math.cos(-horizontal_view_angle),10*Math.sin(-horizontal_view_angle),-3-vertical_view_angle),
                            new P(0,0,0.5), new P(0,0,1), 2000, rect2.center);
    var cameraTransform = new Transform( p => camera.project(p), identityTransform );
    var JonssonEmbeddingAxes = new Graph( rect2, new ComposedTransform( JonssonEmbeddingTransform, cameraTransform),
                                          "Jonsson embedding", "", "");

    // draw the graphs
    var standardAxes = new Graph( rect1, new ComposedTransform( flipYTransform, new LinearTransform2D(spacetime_range, rect1) ),
                                  "time "+rightArrow,
                                  "[Earth surface "+rightArrow+" "+(spacetime_range.size.y).toFixed(1)+"m above Earth surface]", "" );
    var distanceFallenAxes = new Graph( rect2, new ComposedTransform( distanceFallenTransform, flipYTransform,
                                        new LinearTransform2D(spacetime_range, rect2) ),
                                        "time "+rightArrow, "space & time "+rightArrow, "" );
    [ standardAxes, /*distanceFallenAxes,*/ JonssonEmbeddingAxes, /*pseudosphereAxes, kleinPseudosphereAxes*/ ].forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.xmin, graph.screen_rect.ymin, graph.screen_rect.size.x, graph.screen_rect.size.y);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw axes
        var axes_color = 'rgb(210,210,210)';
        minor_axes.forEach( axes => { drawLine(axes.map(graph.transform.forwards), axes_color); } );
        var axes_color = 'rgb(50,50,50)';
        drawLine(x_axis.map(graph.transform.forwards), axes_color);
        drawLine(y_axis.map(graph.transform.forwards), axes_color);

        // indicate scale
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        var t_step = 0.1;
        for(var t = spacetime_range.xmin + t_step; t <= spacetime_range.xmax - t_step; t+=t_step) {
            drawText(graph.transform.forwards(new P(t, spacetime_range.ymin)), t.toFixed(1)+"s");
        }
        var h_step = 1;
        for(var h = spacetime_range.ymin + h_step; h < spacetime_range.ymax; h+=h_step) {
            drawText(graph.transform.forwards(new P(0, h)), (h-earth_radius).toFixed(2)+"m");
        }

        // draw some geodesics
        geodesics.forEach(geodesic => {
            var pts = getFreeFallPoints(geodesic.peak.x, geodesic.peak.y, spacetime_range.p.y, earth_mass, 500);
            pts = pts.map(graph.transform.forwards);
            drawLine(pts, geodesic.color);
            fillSpacedCircles(pts, 1.5, geodesic.color);
        });

        ctx.restore(); // restore the original clip

        // show the graph labels
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(graph.bottom_text, graph.screen_rect.center.x, graph.screen_rect.ymax + 15);
        ctx.fillText(graph.top_text,    graph.screen_rect.center.x, graph.screen_rect.ymin - 15);
        ctx.save();
        ctx.translate(graph.screen_rect.xmin - 15, graph.screen_rect.center.y);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = "center";
        ctx.fillText(graph.left_text, 0, 0);
        ctx.restore();
    });
    
    // DEBUG: draw a constructed geodesic
    //var screen_geodesic_pts = geodesic_pts.map(p => camera.project(p));
    //drawLine(screen_geodesic_pts, 'rgb(255,0,0)');
}

window.onload = init;
