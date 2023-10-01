import { TextureAtlas, TextureAtlasBuilder, UV } from "../renderer/TextureAtlas";

export enum UIIcon { OPEN, SAVE, ARROW_RIGHT, ARROW_DOWN, ARROW_LEFT, ARROW_UP, DEBUGGER };

export interface UVExtra extends UV {
    aspectRatio: number;
}

export interface IconExtra<TId> {
    id: TId;
    aspectRatio: number;
}


export class UIIconAtlas {
    private atlas!: TextureAtlas<UIIcon>;
    private iconExtras: IconExtra<UIIcon>[] = [];

    private constructor() { }

    LookupUV(id: UIIcon): UVExtra {
        switch (id) {
            case UIIcon.ARROW_LEFT:
                {
                    const uv = this.atlas.LookupUV(UIIcon.ARROW_RIGHT);
                    return {
                        A: { x: uv.B.x, y: uv.B.y },
                        B: { x: uv.A.x, y: uv.A.y },
                        aspectRatio: this.ExtractAspectRatio(UIIcon.ARROW_RIGHT)
                    };
                }
            case UIIcon.ARROW_UP:
                {
                    const uv = this.atlas.LookupUV(UIIcon.ARROW_DOWN);
                    return {
                        A: { x: uv.B.x, y: uv.B.y },
                        B: { x: uv.A.x, y: uv.A.y },
                        aspectRatio: this.ExtractAspectRatio(UIIcon.ARROW_DOWN)
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
                id: UIIcon.ARROW_RIGHT,
                filename: 'ui_icons/arrow_right.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.ARROW_DOWN,
                filename: 'ui_icons/arrow_down.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.DEBUGGER,
                filename: 'ui_icons/bug.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.OPEN,
                filename: 'ui_icons/open.svg',
                dimension: { width: 128, height: 128 }
            },
            {
                id: UIIcon.SAVE,
                filename: 'ui_icons/save.svg',
                dimension: { width: 128, height: 128 }
            }
        ];

        for (const icon of icons) {
            builder.Add(icon.id, icon.filename, icon.dimension);
            this.iconExtras.push({ id: icon.id, aspectRatio: icon.dimension.width / icon.dimension.height });
        }

        this.atlas = await builder.Build();
    }

    static async Create(): Promise<UIIconAtlas> {
        const atlas = new UIIconAtlas();

        await atlas.BuildAtlas();

        return atlas;
    }
}
