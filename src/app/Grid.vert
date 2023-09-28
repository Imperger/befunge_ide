#version 300 es
precision mediump float;

in vec4 a_vertex;
in vec3 a_color;
in vec2 a_glyph;

out vec2 v_glyph;
out vec3 v_color;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position = u_viewProject * a_vertex;

  v_glyph = a_glyph;
  v_color = a_color;
}
