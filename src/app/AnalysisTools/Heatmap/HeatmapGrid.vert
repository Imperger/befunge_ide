#version 300 es
precision highp float;
precision highp int;

in vec2 a_vertex;
in vec2 a_uvCoord;
in vec4 a_color;
in uint a_hitsFlow;

out vec2 v_uvCoord;
out vec4 v_color;
flat out uint v_hitsFlow;

uniform mat4 u_viewProject;

void main() {
  gl_Position = u_viewProject * vec4(a_vertex, 0.1f, 1.0f);

  v_uvCoord = a_uvCoord;
  v_color = a_color;
  v_hitsFlow = a_hitsFlow;
}
