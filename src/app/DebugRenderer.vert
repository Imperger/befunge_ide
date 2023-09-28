#version 300 es
precision mediump float;

in vec4 a_vertex;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position = u_viewProject * a_vertex;
  gl_PointSize = 10.0;
}
