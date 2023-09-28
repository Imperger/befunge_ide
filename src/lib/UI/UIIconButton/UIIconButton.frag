#version 300 es
precision mediump float;

vec2 UndefinedUV = vec2(-1.0, -1.0);

in vec2 v_icon;
in vec3 v_fillColor;
in vec3 v_iconColor;

out vec4 out_color;

uniform sampler2D u_icon;

void main() 
{
      if (v_icon.xy == UndefinedUV) {
            out_color = vec4(v_fillColor, 1.0);
      } else {
            vec4 text_color = texture(u_icon, v_icon);
            out_color = mix(vec4(v_fillColor, 1.0), vec4(v_iconColor - text_color.xzy, 1.0), text_color.w);
      }
}
