import { injectable } from "inversify";

import { Inversify } from "@/Inversify";

@injectable()
export class AppSettings {
    public readonly ZNear = 1;

    public readonly ZFar = 500;

    public readonly Fovy = 60 / 180 * Math.PI;

    public AspectRatio = 1;
}

Inversify.bind(AppSettings).toSelf().inSingletonScope();
