import { injectable } from "inversify";

import { Inversify } from "@/Inversify";

interface Dimension {
    Width: number;
    Height: number;
}

@injectable()
export class AppSettings {
    public readonly ZNear = 1;

    public readonly ZFar = 500;

    public readonly Fovy = 60 / 180 * Math.PI;

    public AspectRatio = 1;

    public ViewDimension: Dimension = { Width: 800, Height: 600 };

    public ExecutionTimeout = 1000;

    public MaxOutputLength = 1000;
}

Inversify.bind(AppSettings).toSelf().inSingletonScope();
