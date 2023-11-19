import { inject, injectable, interfaces } from "inversify";

import { NotNull } from "../NotNull";
import { Vec2 } from "../Primitives";
import { UV } from "../renderer/TextureAtlas";

import { FontAtlas } from "./FontAtlasBuilder";

import { InjectionToken } from "@/app/InjectionToken";
import { Inversify } from "@/Inversify";

interface GlyphMeshFontOptions {
    Name: string;
    Size: number;
}

interface GlyphMeshOptions {
    ASCIIRange: { Start: string, End: string },
    Font: GlyphMeshFontOptions
}

export interface GlyphMeshBlueprint {
    uv: UV; // exact glyph bound
    width: number;
    height: number;
    baselineOffset: Vec2;
}

interface AtlasCellDescriptor {
    uv: UV;
    sideLength: number;
}

interface GlyphBoundary {
    width: number;
    height: number;
    actualHeight: number;
    fontBoundingBoxDescent: number;
    actualBoundingBoxDescent: number;
}

export class FontGlyphCollection {
    constructor(private library: Map<string, GlyphMeshBlueprint>) { }

    Lookup(symbol: string): GlyphMeshBlueprint {
        if (symbol.length === 0) {
            throw new Error("Symbol can't be empty string");
        }

        const blueprint = this.library.get(symbol);

        if (blueprint === undefined) {
            throw new Error(`Failed to find glyph '${symbol}'`);
        }

        return blueprint;
    }
}

@injectable()
class FontGlyphCollectionBuilderImpl {
    private options!: GlyphMeshOptions;
    private context!: CanvasRenderingContext2D;

    private lib = new Map<string, GlyphMeshBlueprint>();

    constructor(@inject(InjectionToken.FontAtlas) private fontAtlas: FontAtlas) { }

    Build(options: GlyphMeshOptions): FontGlyphCollection {
        this.options = options;

        const startCode = options.ASCIIRange.Start.charCodeAt(0);
        const endCode = options.ASCIIRange.End.charCodeAt(0);

        if (startCode > endCode) {
            throw new Error('options.ASCIIRange.Start symbol must precede options.ASCIIRange.End');
        }


        const sideLength = this.GlyphCellSize();
        this.SetupCanvas(sideLength, sideLength);

        this.BuildBlueprints(endCode - startCode + 1);

        return new FontGlyphCollection(this.lib);
    }

    private SetupCanvas(width: number, height: number): void {
        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d') ?? NotNull('Failed to get context');
        context.font = `${this.options.Font.Size}px ${this.options.Font.Name}`;
        context.fillStyle = '#000';

        this.context = context;
    }

    private GlyphCellSize(): number {
        return Math.ceil(this.options.Font.Size / 10) * 10;
    }

    private BuildBlueprints(glyphCount: number) {
        for (let n = 0; n < glyphCount; ++n) {
            const symbol = String.fromCharCode(this.options.ASCIIRange.Start.charCodeAt(0) + n);
            const atlasUV = this.fontAtlas.LookupUV(symbol);
            const metrics = this.context.measureText(symbol);

            const width = metrics.width;
            const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

            const actualHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;

            const uv = this.AtlasCellToGlyphUV(
                { uv: atlasUV, sideLength: this.GlyphCellSize() },
                { width, height, actualHeight, fontBoundingBoxDescent: metrics.fontBoundingBoxDescent, actualBoundingBoxDescent: metrics.actualBoundingBoxDescent });

            const baselineOffset = {
                x: 0,
                y: metrics.fontBoundingBoxDescent - metrics.actualBoundingBoxDescent
            };

            this.lib.set(symbol, { uv, width, height, baselineOffset });
        }
    }

    private AtlasCellToGlyphUV(cell: AtlasCellDescriptor, glyph: GlyphBoundary): UV {
        const relA: Vec2 = {
            x: (cell.sideLength - glyph.width) / 2,
            y: (cell.sideLength - glyph.height) / 2
        };

        const relB: Vec2 = { x: relA.x + glyph.width, y: relA.y + glyph.height };

        const uvWidth = cell.uv.B.x - cell.uv.A.x;
        const uvHeight = cell.uv.B.y - cell.uv.A.y;

        return {
            A: {
                x: cell.uv.A.x + relA.x / cell.sideLength * uvWidth,
                y: cell.uv.A.y + relA.y / cell.sideLength * uvHeight
            },
            B: {
                x: cell.uv.A.x + relB.x / cell.sideLength * uvWidth,
                y: cell.uv.A.y + relB.y / cell.sideLength * uvHeight
            }
        };
    }
}

Inversify.bind(FontGlyphCollectionBuilderImpl).toSelf().inRequestScope();

export type FontGlyphCollectionFactory = (options: GlyphMeshOptions) => FontGlyphCollection;

Inversify
    .bind<interfaces.Factory<FontGlyphCollection>>(InjectionToken.FontGlyphCollectionFactory)
    .toFactory<FontGlyphCollection, [GlyphMeshOptions]>(ctx => (options: GlyphMeshOptions) => ctx.container.get(FontGlyphCollectionBuilderImpl).Build(options));
