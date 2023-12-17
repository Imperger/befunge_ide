#version 300 es
precision mediump float;

in vec2 a_vertex;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position =  u_viewProject * vec4(a_vertex, 500, 1.0) ;
}
