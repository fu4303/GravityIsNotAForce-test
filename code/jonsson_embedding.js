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

// Following http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf

class JonssonEmbedding {
    constructor() {
        // Pick the shape of funnel we want: (Eq. 46)
        this.sin_theta_zero = 0.8; // angle of slope at the bottom (controlled by a slider)
        this.r_0 = 1; // radius at the bottom
        this.delta_tau_real = 1; // proper time per circumference, in seconds (controlled by a slider)
        // Precompute some values
        this.x_0 = earth_radius / earth_schwarzschild_radius;
        this.sqr_x_0 = Math.pow(this.x_0, 2);
        this.a_e0 = 1 - 1 / this.x_0; // (Eq. 14, because using exterior metric)
        // Precompute other values that depend on the funnel shape
        this.computeShapeParameters();
    }
    
    setSlopeAngle(val) {
        val = Math.min(0.999, Math.max(0.001, val)); // clamp to valid range
        this.sin_theta_zero = val;
        this.computeShapeParameters();
    }

    setTimeWrapping(val) {
        val = Math.max(0, val); // clamp to valid range
        this.delta_tau_real = val;
        this.computeShapeParameters();
    }

    computeShapeParameters() {
        // Compute k, delta and alpha (Eq. 47)
        this.k = this.delta_tau_real * light_speed / ( 2 * Math.PI * Math.sqrt(this.a_e0) * earth_schwarzschild_radius );
        this.delta = Math.pow(this.k / ( 2 * this.sin_theta_zero * this.sqr_x_0 ), 2);
        this.alpha = Math.pow(this.r_0, 2) / ( 4 * Math.pow(this.x_0, 4) * Math.pow(this.sin_theta_zero, 2) + Math.pow(this.k, 2) );
        // Precompute other values
        this.sqrt_alpha = Math.sqrt(this.alpha);
    }

    getRadiusFromDeltaX(delta_x) {
        // compute the radius at this point (Eg. 48)
        return this.k * this.sqrt_alpha / Math.sqrt( delta_x / this.sqr_x_0 + this.delta );
    }
    
    getDeltaZFromDeltaX(delta_x) {
        // integrate over x to find delta_z (Eg. 49)
        var term1 = Math.pow(this.k, 2) / ( 4 * Math.pow(this.x_0, 4) );
        return this.sqrt_alpha * simpsons_integrate( 0, delta_x, 1000,
            x => {
                var term2 = 1 / ( x / this.sqr_x_0 + this.delta );
                return term2 * Math.sqrt( 1 - term1 * term2 );
            });
    }
    
    getAngleFromTime(t) {
        return 2 * Math.PI * t / this.delta_tau_real; // convert time in seconds to angle in radians
    }
    
    getEmbeddingPointFromSpacetime(p) {
        var theta = this.getAngleFromTime(p.x);
        var x = p.y / earth_schwarzschild_radius;
        var delta_x = x - this.x_0;

        var radius = this.getRadiusFromDeltaX(delta_x);
        var delta_z = this.getDeltaZFromDeltaX(delta_x);
        
        return new P(radius * Math.cos(theta), radius * Math.sin(theta), delta_z);
    }
    
    getSurfaceNormalFromDeltaXAndTheta(delta_x, theta) {
        var term1 = delta_x / this.sqr_x_0 + this.delta;
        var dr_dx = - this.k * this.sqrt_alpha / (2 * this.sqr_x_0 * Math.pow(term1, 3 / 2)); // derivative of Eq. 48 wrt. delta_x
        var dz_dx = this.sqrt_alpha * Math.sqrt(1 - Math.pow(this.k, 2) / (4 * Math.pow(this.x_0, 4) * term1)) / term1; // from Eq. 49
        var dz_dr = dz_dx / dr_dx;
        var normal = normalize(new P(-dz_dr, 0, 1)); // in the XZ plane
        return rotateXY(normal, theta);
    }
    
    getSurfaceNormalFromSpacetime(p) {
        var theta = this.getAngleFromTime(p.x);
        var x = p.y / earth_schwarzschild_radius;
        var delta_x = x - this.x_0;
        return this.getSurfaceNormalFromDeltaXAndTheta(delta_x, theta);
    }
    
    getSurfaceNormalFromEmbeddingPoint(p) {
        var delta_z = p.z;
        var delta_x = getDeltaXFromDeltaZ(delta_z);
        var theta = Math.atan2(p.y, p.x);
        return this.getSurfaceNormalFromDeltaXAndTheta(delta_x, theta);
    }
    
    getDeltaXFromDeltaZ(delta_z) {
        var delta_x_max = earth_radius * 2 / earth_schwarzschild_radius - this.x_0;
        return bisection_search(delta_z, 0, delta_x_max, 1e-6, 100, delta_x => this.getDeltaZFromDeltaX(delta_x));
    }
    
    getGeodesicPoints(a, b, max_points) {
        // Walk along the embedding following the geodesic until we hit delta_x = 0 or have enough points
        var ja = this.getEmbeddingPointFromSpacetime(a);
        var jb = this.getEmbeddingPointFromSpacetime(b);
        var pts = [ja, jb]; // TODO: eventually we want the spacetime coordinates for the points, not the embedding ones
        for(var iPt = 0; iPt < max_points; iPt++) {
            var n = this.getSurfaceNormalFromEmbeddingPoint(jb);
            var incoming_segment = sub(jb, ja);
            var norm_vec = normalize(cross(incoming_segment, n));
            // search for optimal theta between 90 degrees and 270 degrees
            var theta = bisection_search(0, Math.PI / 2, 3 * Math.PI / 2, 1e-6, 200, theta => {
                var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
                // decide if this point is inside or outside the funnel
                var actual_radius = len(new P(jc.x, jc.y));
                var delta_z = Math.max(0, jc.z); // not sure what to do if jc.z < 0 here
                var delta_x = this.getDeltaXFromDeltaZ(delta_z);
                var expected_radius = this.getRadiusFromDeltaX(delta_x);
                return expected_radius - actual_radius;
            });
            var jc = rotateAroundPointAndVector(ja, jb, norm_vec, theta);
            if( jc.z < 0 ) { 
                // have hit the edge of the embedding
                break;
            }
            pts.push(jc);
            ja = jb;
            jb = jc;
            // TODO: find the spacetime coordinates that correspond to this point on the embedding
        }
        return pts;
    }
}
