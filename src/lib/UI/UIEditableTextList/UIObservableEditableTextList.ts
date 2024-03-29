import { MyInputEvent } from "../InputReceiver";
import { Dimension } from "../UIComponent";
import { SymbolStyle } from "../UILabel/UILabel";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";
import { UICreator } from "../UIRenderer";
import { ContainerStyle, UITextList } from "../UITextList/UITextList";

import { UIEditableTextList } from "./UIEditableTextList";

import { Observable, ObservableController } from "@/lib/Observable";
import { Vec2 } from "@/lib/Primitives";

export type UIObservableEditableTextListDeleter = () => void;

export class UIObservableEditableTextList implements UIEditableTextList {
    public visible = true;

    private onVanish = new ObservableController<void>();

    private textList: UITextList;

    private hasFocus = false;

    private onUpdate = new ObservableController<UIObservableEditableTextList>();

    constructor(
        position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
        containerStyle: ContainerStyle,
        lineHeight: number,
        uiRenderer: UICreator,
        private deleter: UIObservableEditableTextListDeleter,
        parent: UIObservablePositioningGroup | null
    ) {
        this.textList = uiRenderer.CreateTextList(
            position,
            dimension,
            zIndex,
            text,
            containerStyle,
            lineHeight,
            parent);
    }

    StyleRange(begin: number, end: number, style: SymbolStyle): void {
        this.textList.StyleRange(begin, end, style);
    }

    get OnVanish(): Observable<void> {
        return this.onVanish;
    }

    OnInput(e: MyInputEvent): void {
        const keyCode = e.key.charCodeAt(0);

        if (e.key === 'Backspace' && this.Text.length > 0) {
            const toDelete = 1 + +(this.Text[this.Text.length - 1] === '\n' && this.Text.length > 1);
            this.Text = this.Text.slice(0, this.Text.length - toDelete)
        } else if (e.key.length === 1 && keyCode >= ' '.charCodeAt(0) && keyCode <= '~'.charCodeAt(0)) {
            this.Text = this.Text + e.key;
        } else if (e.key === 'Enter') {
            this.Text = this.Text + '\n';
        }
    }

    get Position(): Vec2 {
        return this.textList.Position;
    }

    set Position(position: Vec2) {
        this.textList.Position = position;
    }

    get Dimension(): Dimension {
        return this.textList.Dimension;
    }

    set Dimension(dimension: Dimension) {
        this.textList.Dimension = dimension;
    }

    get AbsolutePosition(): Vec2 {
        return this.textList.AbsolutePosition;
    }

    get Text(): string {
        return this.textList.Text;
    }

    set Text(text: string) {
        this.textList.Text = text;
    }

    get ZIndex(): number {
        return this.textList.ZIndex;
    }

    set ZIndex(zIndex: number) {
        this.textList.ZIndex = zIndex;
    }

    get LineHeight(): number {
        return this.textList.LineHeight;
    }

    set LineHeight(lineHeight: number) {
        this.textList.LineHeight = lineHeight;
    }

    get ContainerStyle(): ContainerStyle {
        return this.textList.ContainerStyle;
    }

    set ContainerStyle(style: ContainerStyle) {
        this.textList.ContainerStyle = style;
    }

    get Scale(): number {
        return this.textList.Scale;
    }

    set Scale(scale: number) {
        this.textList.Scale = scale;
    }

    get Visible(): boolean {
        return this.visible;
    }

    set Visible(value: boolean) {
        this.visible = value;

        if (!value) {
            this.onVanish.Notify();
        }

        this.textList.Visible = value;
    }

    get Observable(): Observable<UIObservableEditableTextList> {
        return this.onUpdate;
    }

    get HasFocus(): boolean {
        return this.hasFocus;
    }

    Focus(): void {
        this.hasFocus = true;
    }

    Blur(): void {
        this.hasFocus = false;
    }

    ScrollToTop(): void {
        this.textList.ScrollToTop();
    }

    ScrollAligned(offset: number): void {
        this.textList.ScrollAligned(offset);
    }

    Destroy(): void {
        this.onVanish.Notify();

        this.onVanish.DetachAll();
        this.onUpdate.DetachAll();

        this.deleter();

        this.textList.Destroy();
    }
}
