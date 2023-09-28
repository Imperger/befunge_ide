import { Package, RectangleRowPacker } from "../math/RectanglePacker";
import { NotNull } from "../NotNull";
import { Vec2 } from "../Primitives";

interface Dimension {
    width: number;
    height: number;
}

export interface UV {
    A: Vec2;
    B: Vec2;
}

interface ImageToPack<TId> {
    id: TId;
    filename: string;
    width: number;
    height: number;
}

export class TextureAtlas<TId> {
    protected static readonly UndefinedUV = { A: { x: -1, y: -1 }, B: { x: -1, y: -1 } };

    protected pack!: Package<ImageToPack<TId>>;

    constructor(public readonly Image: ImageData, pack: Package<ImageToPack<TId>>) {
        this.ClonePackage(pack);
        this.NormalizePackage();
    }

    LookupUV(id: TId): UV {
        const found = this.pack.items.find(x => x.target.id === id);

        if (found === undefined) {
            return TextureAtlas.UndefinedUV;
        }

        return {
            A: { x: found.position.x, y: found.position.y },
            B: { x: found.position.x + found.target.width, y: found.position.y + found.target.height }
        };
    }

    static IsUndefinedUV(uv: UV): boolean {
        return uv === TextureAtlas.UndefinedUV;
    }

    private ClonePackage(pack: Package<ImageToPack<TId>>): void {
        this.pack = {
            dimension: { ...pack.dimension },
            items: pack.items.map(x => ({ position: { ...x.position }, target: { ...x.target } }))
        };
    }

    private NormalizePackage(): void {
        this.pack.items.forEach(item => {
            item.position.x /= this.pack.dimension.width;
            item.position.y /= this.pack.dimension.height;
            item.target.width /= this.pack.dimension.width;
            item.target.height /= this.pack.dimension.height;
        });
    }
}

export class TextureAtlasBuilder<TId> {
    private images: ImageToPack<TId>[] = [];

    private context!: CanvasRenderingContext2D;

    Add(id: TId, filename: string, dimension: Dimension): void {
        this.images.push({ id, filename, ...dimension });
    }

    async Build(): Promise<TextureAtlas<TId>> {
        const packer = new RectangleRowPacker<ImageToPack<TId>>();
        this.images.forEach(img => packer.Add(img));
        const pack = packer.Pack();

        this.SetupCanvas(pack.dimension.width, pack.dimension.height);

        for (const packed of pack.items) {
            const img = await TextureAtlasBuilder.CreateImage(packed.target.filename);

            this.context.drawImage(img,
                packed.position.x, packed.position.y,
                packed.target.width, packed.target.height);
        }

        return new TextureAtlas(
            this.context.getImageData(0, 0, pack.dimension.width, pack.dimension.height),
            pack
        );
    }

    private SetupCanvas(width: number, height: number): void {
        const canvas = document.createElement('canvas');

        //document.body.appendChild(canvas);

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d') ?? NotNull('Failed to get context');

        this.context = context;
    }

    private static async CreateImage(src: string): Promise<HTMLImageElement> {
        const image = new Image();
        return new Promise((resolve, reject) => {
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Failed to create an image'));
            image.src = src;
        });
    }
}
