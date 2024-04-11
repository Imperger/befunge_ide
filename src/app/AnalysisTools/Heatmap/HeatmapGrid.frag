#version 300 es
precision highp float;
precision highp int;

const float PI = 3.1415926535897932384626433832795f;
const float circleRadius = 0.03f;
const float sector = 1.f / 3.f;
const float subsector = 1.f / 9.f;

const float lowSpeed = 1.f / 5.f;
const float mediumSpeed = 1.f / 2.f;
const float highSpeed = 1.f;
const float speed[4] = float[](0.f, lowSpeed, mediumSpeed, highSpeed);

in vec2 v_uvCoord;
in vec4 v_color;
/*
* Each 2 bits describe frequency of hits flow in an direction.
* RR, DR, LR, UR,
* RD, DD, LD, UD,
* RL, DL, LL, UL,
* RU, DU, LU, UU
*/
flat in uint v_hitsFlow;

uniform float u_time;

out vec4 out_color;

void main() {
    if(v_color.a == 0.0f) {
        discard;
    }

    float columnWidth = 1.f / 32.f;
    uint bitIdx = uint(floor(v_uvCoord.x / columnWidth));
    float bit = float(v_hitsFlow >> bitIdx & uint(1));
    out_color = vec4(bit, 0, 0, 0.9f);

    uint rightRight = v_hitsFlow & uint(3);
    uint downRight = v_hitsFlow >> 2 & uint(3);
    uint leftRight = v_hitsFlow >> 4 & uint(3);
    uint upRight = v_hitsFlow >> 6 & uint(3);
    uint rightDown = v_hitsFlow >> 8 & uint(3);
    uint downDown = v_hitsFlow >> 10 & uint(3);
    uint leftDown = v_hitsFlow >> 12 & uint(3);
    uint upDown = v_hitsFlow >> 14 & uint(3);
    uint rightLeft = v_hitsFlow >> 16 & uint(3);
    uint downLeft = v_hitsFlow >> 18 & uint(3);
    uint leftLeft = v_hitsFlow >> 20 & uint(3);
    uint upLeft = v_hitsFlow >> 22 & uint(3);
    uint rightUp = v_hitsFlow >> 24 & uint(3);
    uint downUp = v_hitsFlow >> 26 & uint(3);
    uint leftUp = v_hitsFlow >> 28 & uint(3);
    uint upUp = v_hitsFlow >> 30 & uint(3);

    out_color = v_color;

    if(rightRight > uint(0)) {
        float x = fract(u_time * speed[rightRight] / sector);
        float y = 1.5f * sector;

        if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
            out_color = vec4(1, 1, 1, v_color.a);
            return;
        }
    }

    if(downRight > uint(0)) {
        {
            float x = 1.5f * sector;
            float y = mod(1.0f - fract(u_time * speed[downRight]), sector) + 2.0f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = mod(u_time * speed[downRight] * 0.5f * PI / sector, 0.5f * PI) + PI;
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += 2.f * sector;
            y += 2.f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = mod(fract(u_time * speed[downRight]), sector) + 2.0f * sector;
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(leftRight > uint(0)) {
        float x = fract(u_time * speed[leftRight] / sector);
        float y = 1.5f * sector;

        if(x < 1.5f * sector) {
            if(distance(vec2(1.f - x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        } else {
            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(upRight > uint(0)) {
        {
            float x = 1.5f * sector;
            float y = mod(fract(u_time * speed[upRight]), sector);

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = 0.5f * PI - mod(u_time * speed[upRight] * 0.5f * PI / sector, 0.5f * PI) + 0.5f * PI;
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += 2.f * sector;
            y += sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = mod(fract(u_time * speed[upRight]), sector) + 2.0f * sector;
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(rightDown > uint(0)) {
        {
            float x = mod(fract(u_time * speed[rightDown]), sector);
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = 0.5f * PI - mod(u_time * speed[rightDown] * 0.5f * PI / sector, 0.5f * PI);
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += sector;
            y += sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = 1.5f * sector;
            float y = mod(1.0f - fract(u_time * speed[rightDown]), sector);

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(downDown > uint(0)) {
        float x = 1.5f * sector;
        float y = fract(1.f - u_time * speed[downDown] / sector);

        if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
            out_color = vec4(1, 1, 1, v_color.a);
            return;
        }
    }

    if(leftDown > uint(0)) {
        {
            float x = mod(1.f - fract(u_time * speed[leftDown]), sector) + 2.0f * sector;
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = mod(u_time * speed[leftDown] * 0.5f * PI / sector, 0.5f * PI) + 0.5f * PI;
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += 2.f * sector;
            y += sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = 1.5f * sector;
            float y = mod(1.0f - fract(u_time * speed[leftDown]), sector);

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(upDown > uint(0)) {
        float x = 1.5f * sector;
        float y = fract(u_time * speed[upDown] / sector);

        if(y < 1.5f * sector) {
            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        } else {
            if(distance(vec2(x, 1.f - y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(rightLeft > uint(0)) {
        float x = fract(u_time * speed[rightLeft] / sector);
        float y = 1.5f * sector;

        if(x < 1.5f * sector) {
            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        } else {
            if(distance(vec2(1.5f * sector - (x - 1.5f * sector), y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(downLeft > uint(0)) {
        {
            float x = 1.5f * sector;
            float y = mod(1.0f - fract(u_time * speed[downLeft]), sector) + 2.0f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = 0.5f * PI - mod(u_time * speed[downLeft] * 0.5f * PI / sector, 0.5f * PI) + 1.5f * PI;
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += sector;
            y += 2.f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = mod(1.f - fract(u_time * speed[downLeft]), sector);
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(leftLeft > uint(0)) {
        float x = 1.f - fract(u_time * speed[leftLeft] / sector);
        float y = 1.5f * sector;

        if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
            out_color = vec4(1, 1, 1, v_color.a);
            return;
        }
    }

    if(upLeft > uint(0)) {
        {
            float x = 1.5f * sector;
            float y = mod(fract(u_time * speed[upLeft]), sector);

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = mod(u_time * speed[upLeft] * 0.5f * PI / sector, 0.5f * PI);
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += sector;
            y += sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = mod(1.f - fract(u_time * speed[upLeft]), sector);
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(rightUp > uint(0)) {
        {
            float x = 1.5f * sector;
            float y = mod(fract(u_time * speed[rightUp]), sector) + 2.0f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = mod(u_time * speed[rightUp] * 0.5f * PI / sector, 0.5f * PI) + 1.5f * PI;
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += sector;
            y += 2.f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = mod(fract(u_time * speed[rightUp]), sector);
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(downUp > uint(0)) {
        float x = 1.5f * sector;
        float y = fract(u_time * speed[downUp] / sector);

        if(y < 1.5f * sector) {
            if(distance(vec2(x, 1.f - y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        } else {
            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(leftUp > uint(0)) {
        {
            float x = 1.5f * sector;
            float y = mod(fract(u_time * speed[leftUp]), sector) + 2.0f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float t = 0.5f * PI - mod(u_time * speed[leftUp] * 0.5f * PI / sector, 0.5f * PI) + PI;
            float x = cos(t) * sector / 2.f;
            float y = sin(t) * sector / 2.f;

            x += 2.f * sector;
            y += 2.f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
        {
            float x = mod(1.0f - fract(u_time * speed[leftUp]), sector) + 2.0f * sector;
            float y = 1.5f * sector;

            if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
                out_color = vec4(1, 1, 1, v_color.a);
                return;
            }
        }
    }

    if(upUp > uint(0)) {
        float x = 1.5f * sector;
        float y = fract(u_time * speed[upUp] / sector);

        if(distance(vec2(x, y), v_uvCoord) <= circleRadius) {
            out_color = vec4(1, 1, 1, v_color.a);
            return;
        }
    }
}
