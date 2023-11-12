import { vec2 } from "gl-matrix";

import { UIComponent } from "../UIComponent";

import { SymbolStyle, UILabel } from "./UILabel";

import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";

export interface GlyphAllocator {
    Allocate: (component: UIObservableLabel) => number;
    Free: (idx: number) => void;
}

export class UIObservableLabel implements UIComponent, UILabel {
    private static DefaultSymbolStyle = { color: [0, 0, 0] as Rgb };

    private scale = 1;

    private symbolsStyle: SymbolStyle[];

    private offsets: number[] = [];

    private observable = new ObservableController<UIObservableLabel>();

    constructor(
        private position: Vec2,
        private text: string,
        private lineHeight: number,
        private zIndex: number,
        private glyphAllocator: GlyphAllocator,
        private parent: UIComponent | null
    ) {
        this.symbolsStyle = [];
        this.ResizeSymbolStyles();

        this.AdjustPoolMemory();

        parent?.Observable.Attach(() => this.observable.Notify(this));
    }

    StyleRange(begin: number, end: number, style: SymbolStyle): void {
        for (let n = begin; n < end; ++n) {
            this.symbolsStyle[n] = { ...style };
        }

        this.observable.Notify(this);
    }

    get Style(): SymbolStyle[] {
        return this.symbolsStyle;
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.observable.Notify(this);
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

        this.observable.Notify(this);
    }

    get LineHeight(): number {
        return this.lineHeight;
    }

    set LineHeight(lineHeight: number) {
        this.lineHeight = lineHeight;

        this.observable.Notify(this);
    }

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;

        this.observable.Notify(this);
    }

    get Scale(): number {
        return this.scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        this.observable.Notify(this);
    }

    get Offsets(): number[] {
        return this.offsets;
    }

    get Observable(): Observable<UIObservableLabel> {
        return this.observable;
    }

    Destroy(): void {
        this.Uninitialize();
    }

    private Uninitialize(): void {
        this.Text = '';
    }

    private ExtendPoolMemory(): void {
        let extraMemoryNeeded = this.text.length - this.offsets.length;
        while (extraMemoryNeeded-- > 0) {
            const offset = this.glyphAllocator.Allocate(this);
            this.offsets.push(offset);
        }
    }

    private ShrinkPoolMemory(): void {
        const excessOffsets = this.offsets.length - this.text.length;

        for (let n = 1; n <= excessOffsets; ++n) {
            const offset = this.offsets[this.offsets.length - n];

            this.glyphAllocator.Free(offset);
        }

        this.offsets.splice(this.offsets.length - excessOffsets, excessOffsets);
    }

    private AdjustPoolMemory(): void {
        if (this.text.length > this.offsets.length) {
            this.ExtendPoolMemory();
        } else if (this.text.length < this.offsets.length) {
            this.ShrinkPoolMemory();
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
