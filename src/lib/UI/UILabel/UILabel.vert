#version 300 es
precision mediump float;

in vec3 a_vertex;
in vec3 a_color;
in vec2 a_glyph;

out vec3 v_color;
out vec2 v_glyph;

uniform mat4 u_viewProject;
uniform mat4 u_world;

void main() {
  gl_Position = u_viewProject * u_world * vec4(a_vertex, 1.0f);

  v_color = a_color;
  v_glyph = a_glyph;
}
