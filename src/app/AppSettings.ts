import { inject, injectable } from "inversify";

import { InjectionToken } from "./InjectionToken";

import { Inversify } from "@/Inversify";
import { MemoryLimit } from "@/lib/befunge/memory/MemoryLimit";
import { Rgb } from "@/lib/Primitives";

interface Dimension {
    Width: number;
    Height: number;
}

export interface ZCameraBoundary {
    min: number;
    max: number;
}

export interface Visual {
    editableCellStyle: Rgb;
}

@injectable()
export class AppSettings {
    constructor(@inject(InjectionToken.WebGLRenderingContext) private gl: WebGL2RenderingContext) {
        this.AspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    }

    public readonly ZNear = 1;

    public readonly ZFar = 500;

    public readonly Fovy = 60 / 180 * Math.PI;

    public readonly ZCameraBoundary: ZCameraBoundary = { min: 50, max: 250 };

    public AspectRatio = 1;

    public get DevicePixelRatio(): number {
        return window.devicePixelRatio;
    }

    public ViewDimension: Dimension = { Width: 800, Height: 600 };

    public ExecutionTimeout = 1000;

    public MaxOutputLength = 1000;

    public MemoryLimit: MemoryLimit = { Width: 80, Height: 25 };

    public Visual: Visual = { editableCellStyle: [0.21568627450980393, 0.2784313725490196, 0.30980392156862746] };
}

Inversify.bind(AppSettings).toSelf().inSingletonScope();
