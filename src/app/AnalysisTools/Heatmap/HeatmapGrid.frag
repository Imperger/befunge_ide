#version 300 es
precision mediump float;

in vec2 v_uvCoord;
in vec4 v_color;

uniform float u_time;

out vec4 out_color;

// https://thebookofshaders.com/13/

// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com

float random(in vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898f, 78.233f))) *
        43758.5453123f);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise(in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0f, 0.0f));
    float c = random(i + vec2(0.0f, 1.0f));
    float d = random(i + vec2(1.0f, 1.0f));

    vec2 u = f * f * (3.0f - 2.0f * f);

    return mix(a, b, u.x) +
        (c - a) * u.y * (1.0f - u.x) +
        (d - b) * u.x * u.y;
}

#define NUM_OCTAVES 5

float fbm(in vec2 _st) {
    float v = 0.0f;
    float a = 0.364;
    vec2 shift = vec2(100.0f);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5f), sin(0.5f), -sin(0.5f), cos(0.50f));
    for(int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0f + shift;
        a *= 0.684;
    }
    return v;
}

void main() {
    vec2 st = v_uvCoord;
    ;
    // st += st * abs(sin(u_time*0.1)*3.0);
    vec3 color = vec3(0.0f);

    vec2 q = vec2(0.f);
    q.x = fbm(st + 0.00f * u_time);
    q.y = fbm(st + vec2(1.0f));

    vec2 r = vec2(0.f);
    r.x = fbm(st + 1.0f * q + vec2(1.7f, 9.2f) + 0.15f * u_time);
    r.y = fbm(st + 1.0f * q + vec2(8.3f, 2.8f) + 0.126f * u_time);

    float f = fbm(st + r);

    color = mix(vec3(0.101961f, 0.619608f, 0.666667f), vec3(0.666667f, 0.666667f, 0.498039f), clamp((f * f) * 4.0f, 0.0f, 1.0f));

    color = mix(color, vec3(0.990,0.976,0.986), clamp(length(q), 0.0f, 1.0f));

    color = mix(color, v_color.rgb, clamp(length(r.x), 0.0f, 1.0f));

    out_color = vec4((f * f * f + .6f * f * f + .5f * f) * color, v_color.a);
}