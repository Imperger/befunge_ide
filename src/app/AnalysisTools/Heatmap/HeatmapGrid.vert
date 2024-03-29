#version 300 es
precision mediump float;

in vec2 a_vertex;
in vec2 a_uvCoord;
in vec4 a_color;

out vec2 v_uvCoord;
out vec4 v_color;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position = u_viewProject * vec4(a_vertex, 0.1, 1.0);

  v_uvCoord = a_uvCoord;
  v_color = a_color;
}
