#version 300 es
precision mediump float;

in vec2 v_icon;
in vec3 v_fillColor;
in vec3 v_iconColor;

out vec4 out_color;

uniform sampler2D u_icon;

void main() 
{
    vec4 text_color = texture(u_icon, v_icon);
    out_color = mix(vec4(v_fillColor, 1.0), vec4(v_iconColor - text_color.xzy, 1.0), text_color.w);
}
