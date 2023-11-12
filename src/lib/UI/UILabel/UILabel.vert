#version 300 es
precision mediump float;

in vec3 a_vertex;
in vec3 a_color;
in vec2 a_glyph;

out vec3 v_color;
out vec2 v_glyph;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position =  u_viewProject * vec4(a_vertex, 1.0);

  v_color = a_color;
  v_glyph = a_glyph;
}
