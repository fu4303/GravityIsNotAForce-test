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

var graphs;
var trajectories;
var spacetime_range;
var isDragging;
var dragTrajectory;
var dragEnd;

function resetMarkers() {
    trajectories.forEach( trajectory => {
        for(var iEnd = 0; iEnd < 2; iEnd++) {
            trajectory.end_sizes[iEnd] = trajectory.default_end_sizes[iEnd];
            trajectory.end_colors[iEnd] = trajectory.color;
        }
    });
}

function findClosestEnd(mousePos, graph, radius) {
    var withinRadius = false;
    var whichTrajectory;
    var whichEnd;
    var d_min = Number.MAX_VALUE;
    trajectories.forEach( trajectory => {
        for(var iEnd = 0; iEnd < 2; iEnd++) {
            var d = dist(mousePos, graph.transform.forwards(trajectory.ends[iEnd]));
            if( d < radius && d < d_min) {
                d_min = d;
                withinRadius = true;
                whichTrajectory = trajectory;
                whichEnd = iEnd;
            }
        }
    });
    return [withinRadius, whichTrajectory, whichEnd];
}

function onMouseMove( evt ) {
    var mousePos = getMousePos(evt);
    var targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        if(isDragging) {
            // move the handle being dragged
            dragTrajectory.ends[dragEnd] = targetGraph.transform.backwards(mousePos);
        }
        else {
            // indicate which marker is being hovered over
            resetMarkers();
            const [isHovering, hoveredTrajectory, hoveredEnd] = findClosestEnd(mousePos, targetGraph, 20);
            if(isHovering) {
                hoveredTrajectory.end_sizes[hoveredEnd] = hoveredTrajectory.hover_size;
                hoveredTrajectory.end_colors[hoveredEnd] = hoveredTrajectory.hover_color;
            }
        }
        draw();
    }
}

function onMouseDown( evt ) {
    var mousePos = getMousePos(evt);
    var targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        [isDragging, dragTrajectory, dragEnd] = findClosestEnd(mousePos, targetGraph, 20);
        if(isDragging) {
            dragTrajectory.end_sizes[dragEnd] = dragTrajectory.hover_size;
            dragTrajectory.end_colors[dragEnd] = dragTrajectory.hover_color;
        }
    }
}

function onMouseUp( evt ) {
    isDragging = false;
    draw();
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    isDragging = false;

    spacetime_range = new Rect(new P(-4,-10), new P(8,80));

    var timeTranslationSlider = document.getElementById("timeTranslationSlider");
    var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
    spacetime_range.p.x = -4 + timeTranslation;
    timeTranslationSlider.oninput = function() {
        var timeTranslation = 2 - 4 * timeTranslationSlider.value / 100.0;
        spacetime_range.p.x = -4 + timeTranslation;
        draw();
    }

    trajectories = [];
    trajectories.push(new Trajectory(new P(0.0, 44.1), new P(3.0, 0.0), 'rgb(255,100,100)', 'rgb(200,100,100)'));
    trajectories.push(new Trajectory(new P(-1.0, 0.0), new P(2.0, 0.0), 'rgb(0,200,0)', 'rgb(0,160,0)'));
    trajectories.push(new Trajectory(new P(-3.0, 0.0), new P(1.0, 0.0), 'rgb(100,100,255)', 'rgb(100,100,200)'));

    graphs = [];
    graphs.push(new GraphT1S1(new Rect(new P(40,440), new P(400,-400)), earth_surface_gravity, "time "+rightArrow, "space "+rightArrow));
    graphs.push(new GraphT1S1(new Rect(new P(480,440), new P(400,-400)), earth_surface_gravity/2, "", ""));
    graphs.push(new GraphT1S1(new Rect(new P(920,440), new P(400,-400)), 0.0, "", ""));

    var frameAccelerationSlider = document.getElementById("frameAccelerationSlider");
    graphs[1].frame_acceleration = earth_surface_gravity - earth_surface_gravity * frameAccelerationSlider.value / 100.0;
    frameAccelerationSlider.oninput = function() {
        graphs[1].frame_acceleration = earth_surface_gravity - earth_surface_gravity * this.value / 100.0;
        draw();
    }

    draw();

    canvas.addEventListener( 'mousemove', onMouseMove, false );
    canvas.addEventListener( 'mousedown', onMouseDown, false );
    canvas.addEventListener( 'mouseup',   onMouseUp, false );
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    // draw each graph
    graphs.forEach( graph => {
        drawSpaceTime(graph);
    });

    // label the space and time directions
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(graphs[0].rect.p.x/2, graphs[0].rect.center.y);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText(graphs[0].left_text, 0, 0);
    ctx.restore();
    ctx.fillText(graphs[0].top_text, graphs[0].rect.center.x, graphs[0].rect.ymin/2);
}

function drawSpaceTime(graph) {
    ctx.save(); // save the clip region for the moment

    // fill background with white
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.beginPath();
    ctx.rect(graph.rect.p.x, graph.rect.p.y, graph.rect.size.x, graph.rect.size.y);
    ctx.fill();
    ctx.clip(); // clip to this rect until reset

    // draw minor axes
    ctx.strokeStyle = 'rgb(240,240,240)';
    var space_extra = 80; // extend space axes beyond just the minimum area
    var time_step = 1;
    var space_step = 10;
    for(var t = Math.ceil(spacetime_range.xmin); t<=Math.floor(spacetime_range.xmax); t+=time_step) {
        if(t==0.0) { continue; }
        drawLine(getLinePoints(new P(t, spacetime_range.ymin-space_extra), new P(t, spacetime_range.ymax+space_extra)).map(graph.transform.forwards));
    }
    for(var s = Math.ceil(spacetime_range.ymin-space_extra); s<=Math.floor(spacetime_range.ymax+space_extra); s+=space_step) {
        if(s==0.0) { continue; }
        drawLine(getLinePoints(new P(spacetime_range.xmin, s), new P(spacetime_range.xmax, s)).map(graph.transform.forwards));
    }
    // draw major axes
    ctx.strokeStyle = 'rgb(150,150,150)';
    drawLine(getLinePoints(new P(spacetime_range.xmin, 0.0), new P(spacetime_range.xmax, 0.0)).map(graph.transform.forwards));
    drawLine(getLinePoints(new P(0.0, spacetime_range.ymin-space_extra), new P(0.0, spacetime_range.ymax+space_extra)).map(graph.transform.forwards));

    // label axes
    ctx.fillStyle = 'rgb(100,100,100)';
    ctx.font = "13px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var horizOffset = -0.1;
    drawText(graph.transform.forwards(new P(horizOffset, 50.0)), "50m");
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var vertOffset = -2.0;
    for(var t = Math.ceil(spacetime_range.xmin); t<=Math.floor(spacetime_range.xmax); t+=time_step) {
        drawText(graph.transform.forwards(new P(t, vertOffset)), t.toFixed(0)+"s");
    }

    // draw trajectories in free-fall
    trajectories.forEach( trajectory => {
        drawGeodesic(trajectory, graph);
    });

    ctx.restore(); // reset the clip

    // show the frame acceleration as text
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Frame acceleration = "+graph.frame_acceleration.toFixed(1)+" ms"+sup_minus2,
        graph.rect.center.x, (graph.rect.ymax+canvas.height)/2);
}

window.onload = init;
