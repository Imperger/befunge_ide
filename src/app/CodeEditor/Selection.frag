#version 300 es
precision mediump float;

in vec2 v_glyph;
in vec3 v_color;

out vec4 out_color;

void main() 
{ 
      out_color = vec4(v_color, 1);
}
