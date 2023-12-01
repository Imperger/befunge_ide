import { injectable } from "inversify";

import { AsyncConstructable, AsyncConstructorActivator } from "../DI/AsyncConstructorActivator";
import { TextureAtlas, TextureAtlasBuilder, UV } from "../renderer/TextureAtlas";

import { Inversify } from "@/Inversify";

export enum UIIcon {
    Open, Save, ArrowRight, ArrowDown, ArrowLeft, ArrowUp, Debugger,
    Play, PlayDebug,
    ExclamationCircle, ExclamationTriangle, CheckCircle,
    Breakpoint, ArrowThinAll, ArrowThinRight, ArrowThinDown, ArrowThinLeft, ArrowThinUp,
    Delete, Stop
};

export interface UVExtra extends UV {
    aspectRatio: number;
}

export interface IconExtra<TId> {
    id: TId;
    aspectRatio: number;
}

@injectable()
export class UIIconAtlas implements AsyncConstructable {
    private atlas!: TextureAtlas<UIIcon>;
    private iconExtras: IconExtra<UIIcon>[] = [];

    async AsyncConstructor(): Promise<void> {
        await this.BuildAtlas();
    }

    LookupUV(id: UIIcon): UVExtra {
        switch (id) {
            case UIIcon.ArrowLeft:
                {
                    const uv = this.atlas.LookupUV(UIIcon.ArrowRight);
                    return {
                        A: { x: uv.B.x, y: uv.B.y },
                        B: { x: uv.A.x, y: uv.A.y },
                        aspectRatio: this.ExtractAspectRatio(UIIcon.ArrowRight)
                    };
                }
            case UIIcon.ArrowUp:
                {
                    const uv = this.atlas.LookupUV(UIIcon.ArrowDown);
                    return {
                        A: { x: uv.B.x, y: uv.B.y },
                        B: { x: uv.A.x, y: uv.A.y },
                        aspectRatio: this.ExtractAspectRatio(UIIcon.ArrowDown)
                    };
                }
            case UIIcon.ArrowThinLeft:
                {
                    const uv = this.atlas.LookupUV(UIIcon.ArrowThinRight);
                    return {
                        A: { x: uv.B.x, y: uv.B.y },
                        B: { x: uv.A.x, y: uv.A.y },
                        aspectRatio: this.ExtractAspectRatio(UIIcon.ArrowThinRight)
                    };
                }
            case UIIcon.ArrowThinDown:
                {
                    const uv = this.atlas.LookupUV(UIIcon.ArrowThinUp);
                    return {
                        A: { x: uv.B.x, y: uv.B.y },
                        B: { x: uv.A.x, y: uv.A.y },
                        aspectRatio: this.ExtractAspectRatio(UIIcon.ArrowThinUp)
                    };
                }
            default:
                return { ...this.atlas.LookupUV(id), aspectRatio: this.ExtractAspectRatio(id) };
        }
    }

    get Image(): ImageData {
        return this.atlas.Image;
    }

    private ExtractAspectRatio(id: UIIcon): number {
        return this.iconExtras.find(x => x.id === id)!.aspectRatio;
    }

    private async BuildAtlas(): Promise<void> {
        const builder = new TextureAtlasBuilder<UIIcon>();

        const icons = [
            {
                id: UIIcon.ArrowRight,
                filename: 'ui_icons/arrow_right.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ArrowDown,
                filename: 'ui_icons/arrow_down.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Debugger,
                filename: 'ui_icons/bug.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Open,
                filename: 'ui_icons/open.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Save,
                filename: 'ui_icons/save.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Play,
                filename: 'ui_icons/play.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.PlayDebug,
                filename: 'ui_icons/play_debug.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ExclamationCircle,
                filename: 'ui_icons/exclamation_circle.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ExclamationTriangle,
                filename: 'ui_icons/exclamation_triangle.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.CheckCircle,
                filename: 'ui_icons/check_circle.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Breakpoint,
                filename: 'ui_icons/breakpoint.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ArrowThinAll,
                filename: 'ui_icons/arrow_thin_all.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ArrowThinUp,
                filename: 'ui_icons/arrow_thin_up.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ArrowThinRight,
                filename: 'ui_icons/arrow_thin_right.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Delete,
                filename: 'ui_icons/trash_can.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.Stop,
                filename: 'ui_icons/stop.svg',
                dimension: { width: 128, height: 128 }
            }
        ];

        for (const icon of icons) {
            builder.Add(icon.id, icon.filename, icon.dimension);
            this.iconExtras.push({ id: icon.id, aspectRatio: icon.dimension.width / icon.dimension.height });
        }

        this.atlas = await builder.Build();
    }
}

Inversify.bind(UIIconAtlas).toSelf().inSingletonScope().onActivation(AsyncConstructorActivator);
