import { NotNull } from "../NotNull";
import { Vec2 } from "../Primitives";

interface AtlasFontOptions {
    Name: string;
    Size: number;
}

interface AtlasOptions {
    ASCIIRange: { Start: string, End: string },
    Font: AtlasFontOptions
}

interface UV {
    A: Vec2;
    B: Vec2;
}

export class FontAtlas {
    constructor(
        private readonly startSymbolCode: number,
        public readonly Columns: number,
        public readonly Rows: number,
        public readonly GlyphCount: number,
        public readonly Image: ImageData) { }

    LookupUV(symbol: string): UV {
        if (symbol.length === 0) {
            throw new Error("Symbol can't be empty string");
        }

        const symbolCode = symbol.charCodeAt(0);
        const glyphIdx = symbolCode - this.startSymbolCode;

        if (glyphIdx < 0 || glyphIdx >= this.GlyphCount) {
            throw new Error("The font atlas doesn't contain glyph for given symbol");
        }

        const column = glyphIdx % this.Columns;
        const row = Math.floor(glyphIdx / this.Columns);

        const glyphWidth = 1 / this.Columns;
        const glyphHeight = 1 / this.Rows;

        const leftTop: Vec2 = {
            x: glyphWidth * column,
            y: glyphHeight * row
        };

        return {
            A: leftTop,
            B: { x: leftTop.x + glyphWidth, y: leftTop.y + glyphHeight }
        };
    }
}

class FontAtlasBuilderImpl {
    private options!: AtlasOptions;
    private context!: CanvasRenderingContext2D;

    Build(options: AtlasOptions): FontAtlas {
        this.options = options;

        const startCode = options.ASCIIRange.Start.charCodeAt(0);
        const endCode = options.ASCIIRange.End.charCodeAt(0);

        if (startCode > endCode) {
            throw new Error('options.ASCIIRange.Start symbol must precede options.ASCIIRange.End');
        }

        const glyphCount = endCode - startCode + 1;
        const columnCount = Math.ceil(Math.sqrt(glyphCount));
        const rowCount = Math.ceil(glyphCount / columnCount);
        const glyphCellSize = this.GlyphCellSize();

        const canvas = this.SetupCanvas(columnCount * glyphCellSize, rowCount * glyphCellSize);
        this.FillCanvasWithGlyphs(glyphCount, columnCount);

        return new FontAtlas(
            startCode,
            columnCount,
            rowCount,
            glyphCount,
            this.context.getImageData(0, 0, canvas.width, canvas.height)
        );
    }

    private SetupCanvas(width: number, height: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d') ?? NotNull('Failed to get context');
        context.font = `${this.options.Font.Size}px ${this.options.Font.Name}`;
        context.fillStyle = '#000';

        this.context = context;

        return canvas;
    }

    private FillCanvasWithGlyphs(glyphCount: number, columnCount: number): void {
        for (let n = 0; n < glyphCount; ++n) {
            const col = n % columnCount;
            const row = Math.floor(n / columnCount);

            const glyphCellSize = this.GlyphCellSize();
            const halfGlyphCellSize = glyphCellSize / 2;
            const cellCenter: Vec2 = { x: col * glyphCellSize + halfGlyphCellSize, y: row * glyphCellSize + halfGlyphCellSize };
            const symbol = String.fromCharCode(this.options.ASCIIRange.Start.charCodeAt(0) + n);

            const drawPosition = this.CenteredToBaseLine(cellCenter, symbol);

            this.context.fillText(symbol, drawPosition.x, drawPosition.y);
        }
    }

    private GlyphCellSize(): number {
        return Math.ceil(this.options.Font.Size / 10) * 10;
    }

    private CenteredToBaseLine(pos: Vec2, symbol: string): Vec2 {
        const metrics = this.context.measureText(symbol);

        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        return {
            x: pos.x - metrics.width / 2,
            y: pos.y - metrics.actualBoundingBoxDescent + height / 2
        };
    }
}

export class FontAtlasBuilder {
    static Build(options: AtlasOptions): FontAtlas {
        return new FontAtlasBuilderImpl().Build(options);
    }
}
