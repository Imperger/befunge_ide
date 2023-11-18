#version 300 es
precision mediump float;

in vec3 a_vertex;
in vec3 a_fillColor;
in vec3 a_iconColor;
in vec2 a_icon;

out vec2 v_icon;
out vec3 v_fillColor;
out vec3 v_iconColor;

uniform mat4 u_viewProject;

void main() 
{
  gl_Position =  u_viewProject * vec4(a_vertex, 1.0) ;

  v_icon = a_icon;
  v_fillColor = a_fillColor;
  v_iconColor = a_iconColor;
}
