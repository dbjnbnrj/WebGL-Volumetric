#ifdef GL_ES
precision highp float;
#endif

//---------------------------------------------------------
// MACROS
//---------------------------------------------------------

#define EPS       0.0001
#define PI        3.14159265
#define HALFPI    1.57079633
#define ROOTTHREE 1.73205081

#define EQUALS(A,B) ( abs((A)-(B)) < EPS )
#define EQUALSZERO(A) ( ((A)<EPS) && ((A)>-EPS) )


//---------------------------------------------------------
// CONSTANTS
//---------------------------------------------------------

// 32 48 64 96 128
#define MAX_STEPS 100
//#define uTMK 20.0
#define TM_MIN 0.05


//---------------------------------------------------------
// SHADER VARS
//---------------------------------------------------------

varying vec3 vPos0; // position in world coords
varying vec3 vPos1; // position in object coords
varying vec2 vUv;
varying vec3 vPos1n; // normalized 0 to 1, for texture lookup


void main() {
  // in world coords, just for now
  vec3 ro = vPos1n;
  
  gl_FragColor.rgb = vPos1n;
  gl_FragColor.a = 1.0;
}

