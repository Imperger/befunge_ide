#version 300 es
precision mediump float;

in vec2 v_glyph;
in vec3 v_color;

out vec4 out_color;

uniform sampler2D u_glyph;

void main() 
{
      vec4 text_color = texture(u_glyph, v_glyph);
 
      out_color = vec4(v_color - text_color.xyz, text_color.w);
}
