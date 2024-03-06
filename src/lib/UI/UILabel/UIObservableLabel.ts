import { vec2 } from "gl-matrix";

import { Dimension, UIComponent } from "../UIComponent";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";

import { SymbolStyle, UILabel } from "./UILabel";

import { Observable, ObservableController, ObserverDetacher } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";

export interface GlyphAllocator {
    Allocate: (component: UIObservableLabel) => number;
    Free: (idx: number) => void;
}

export class UIObservableLabel implements UIComponent, UILabel {
    public static readonly NonPrintableOffset = -1;

    private static readonly NonPrintableSymbols = ['\r', '\n'];

    private static DefaultSymbolStyle = { color: [0, 0, 0] as Rgb };

    private scale = 1;

    private symbolsStyle: SymbolStyle[];

    private offsets: number[] = [];

    private observable = new ObservableController<UIObservableLabel>();

    public dimension: Dimension = { width: 0, height: 0 };

    private parentDetacher: ObserverDetacher | null = null;

    private updateNeeded = false;

    constructor(
        private position: Vec2,
        private text: string,
        private lineHeight: number,
        private zIndex: number,
        private glyphAllocator: GlyphAllocator,
        private parent: UIObservablePositioningGroup | null
    ) {
        this.symbolsStyle = [];
        this.ResizeSymbolStyles();

        this.AdjustPoolMemory();

        this.parentDetacher = parent?.Observable.Attach(() => this.DeferredNotify()) ?? null;
    }

    StyleRange(begin: number, end: number, style: SymbolStyle): void {
        for (let n = begin; n < end; ++n) {
            this.symbolsStyle[n] = { ...style };
        }

        this.DeferredNotify();
    }

    ReplaceOffset(old: number, offset: number): void {
        this.offsets[this.offsets.indexOf(old)] = offset;
    }

    get Style(): SymbolStyle[] {
        return this.symbolsStyle;
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.DeferredNotify();
    }

    get AbsolutePosition(): Vec2 {
        if (this.parent) {
            const parentPosition = [this.parent.AbsolutePosition.x, this.parent.AbsolutePosition.y] as const;
            const absolutePosition = vec2.add(vec2.create(), parentPosition, [this.Position.x * this.Scale, this.Position.y * this.Scale]);

            return { x: absolutePosition[0], y: absolutePosition[1] };
        } else {
            return this.Position;
        }
    }

    get Text(): string {
        return this.text;
    }

    set Text(text: string) {
        this.text = text;
        this.ResizeSymbolStyles();
        this.AdjustPoolMemory();

        this.DeferredNotify();
    }

    get LineHeight(): number {
        return this.lineHeight;
    }

    set LineHeight(lineHeight: number) {
        this.lineHeight = lineHeight;

        this.DeferredNotify();
    }

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;

        this.DeferredNotify();
    }

    get Scale(): number {
        return this.parent === null ? this.scale : this.scale * this.parent.Scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        this.DeferredNotify();
    }

    get Dimension(): Dimension {
        return { ...this.dimension };
    }

    UpdateTextDimension(dimension: Dimension): void {
        this.dimension = dimension;
    }

    get Offsets(): number[] {
        return this.offsets;
    }

    get Observable(): Observable<UIObservableLabel> {
        return this.observable;
    }

    private get PrintableTextLength(): number {
        return this.text
            .split('')
            .filter(char => !UIObservableLabel.NonPrintableSymbols.includes(char))
            .length;
    }

    private get PrintableOffsetLength(): number {
        return this.offsets
            .filter(x => x !== UIObservableLabel.NonPrintableOffset)
            .length;
    }

    Destroy(): void {
        this.Uninitialize();

        this.parent?.RemoveChild(this);

        if (this.parentDetacher !== null) {
            this.parentDetacher();
        }
    }

    private DeferredNotify(): void {
        if (!this.updateNeeded) {
            this.updateNeeded = true;
            queueMicrotask(() => this.Notify());
        }
    }

    private Notify(): void {
        this.observable.Notify(this);
        this.updateNeeded = false;
    }

    private Uninitialize(): void {
        this.Text = '';
    }

    private ExtendPoolMemory(): void {
        let extraMemoryNeeded = this.PrintableTextLength - this.PrintableOffsetLength;

        while (extraMemoryNeeded-- > 0) {
            const offset = this.glyphAllocator.Allocate(this);
            this.offsets.push(offset);
        }
    }

    private ShrinkPoolMemory(): void {
        const excessOffsets = this.PrintableOffsetLength - this.PrintableTextLength;

        for (let n = this.offsets.length - 1, released = 0; released < excessOffsets; --n) {
            const offset = this.offsets[n];

            if (offset !== UIObservableLabel.NonPrintableOffset) {
                this.glyphAllocator.Free(offset);
                this.offsets.splice(n, 1);

                ++released;
            }
        }
    }

    private AdjustPoolMemory(): void {
        if (this.PrintableTextLength > this.PrintableOffsetLength) {
            this.ExtendPoolMemory();
        } else if (this.PrintableTextLength < this.PrintableOffsetLength) {
            this.ShrinkPoolMemory();
        }

        if (this.text.length > this.offsets.length) {
            this.AddExtraNonPrintableOffsets();
        } else if (this.offsets.length > this.text.length) {
            this.RemoveExcessNonPrintableOffsets();
        }

        this.AdjustNonPrintableOffsets();
    }

    private AddExtraNonPrintableOffsets(): void {
        let extraNonPrintableOffsets = this.text.length - this.offsets.length;

        while (extraNonPrintableOffsets-- > 0) {
            this.offsets.push(UIObservableLabel.NonPrintableOffset);
        }
    }

    private RemoveExcessNonPrintableOffsets(): void {
        const excessOffsets = this.offsets.length - this.text.length;

        for (let n = this.offsets.length - 1, removed = 0; removed < excessOffsets; --n) {
            const offset = this.offsets[n];

            if (offset === UIObservableLabel.NonPrintableOffset) {
                this.offsets.splice(n, 1);

                ++removed;
            }
        }
    }

    private AdjustNonPrintableOffsets(): void {
        for (let charIdx = 0, offsetStartIdx = 0; charIdx < this.text.length; ++charIdx) {
            const symbol = this.text[charIdx];
            const offset = this.offsets[charIdx];

            if (UIObservableLabel.NonPrintableSymbols.includes(symbol) && offset !== UIObservableLabel.NonPrintableOffset) {
                const nonPrintableOffsetIdx = this.offsets
                    .slice(offsetStartIdx)
                    .findIndex((x, n) => x === UIObservableLabel.NonPrintableOffset && !UIObservableLabel.NonPrintableSymbols.includes(this.text[offsetStartIdx + n])) + offsetStartIdx;

                this.offsets[charIdx] = UIObservableLabel.NonPrintableOffset;
                this.offsets[nonPrintableOffsetIdx] = offset;

                offsetStartIdx = nonPrintableOffsetIdx + 1;
            }
        }
    }

    private ExtendSymbolStyles(): void {
        this.symbolsStyle = [...this.symbolsStyle, ...Array.from({ length: this.text.length }, () => ({ ...UIObservableLabel.DefaultSymbolStyle }))];
    }

    private ShrinkSymbolStyles(): void {
        this.symbolsStyle.splice(this.text.length, this.symbolsStyle.length - this.text.length);
    }

    private ResizeSymbolStyles(): void {
        if (this.text.length > this.symbolsStyle.length) {
            this.ExtendSymbolStyles();
        } else if (this.text.length < this.symbolsStyle.length) {
            this.ShrinkSymbolStyles();
        }
    }
}
