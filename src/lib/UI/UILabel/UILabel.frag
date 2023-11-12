#version 300 es
precision mediump float;

in vec3 v_color;
in vec2 v_glyph;

out vec4 out_color;

uniform sampler2D u_icon;

void main() 
{
    vec4 text_color = texture(u_icon, v_glyph);

    out_color = mix(vec4(1.0, 0, 0, 1.0), vec4(v_color - text_color.xzy, 1.0), text_color.w);
}
