#version 300 es
precision mediump float;

in vec3 a_vertex;
in vec4 a_fill_color;

out vec4 v_fill_color;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position =  u_viewProject * vec4(a_vertex, 1.0);
  v_fill_color = a_fill_color;
}
