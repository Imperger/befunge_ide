import { Dimension } from "../UIComponent";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";
import { UICreator } from "../UIRenderer";
import { UITextList } from "../UITextList/UITextList";

import { UIEditableTextList } from "./UIEditableTextList";

import { Observable, ObservableController } from "@/lib/Observable";
import { Vec2 } from "@/lib/Primitives";

export type UIObservableEditableTextListDeleter = () => void;

export class UIObservableEditableTextList implements UIEditableTextList {
    private textList: UITextList;

    private hasFocus = false;

    private observable = new ObservableController<UIObservableEditableTextList>();

    constructor(
        position: Vec2,
        dimension: Dimension,
        zIndex: number,
        text: string,
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
            lineHeight,
            parent);
    }

    OnInput(e: KeyboardEvent): void {
        const keyCode = e.key.charCodeAt(0);

        if (e.key === 'Backspace' && this.Text.length > 0) {
            this.Text = this.Text.slice(0, this.Text.length - 1)
        } else if (e.key.length === 1 && keyCode >= ' '.charCodeAt(0) && keyCode <= '~'.charCodeAt(0)) {
            this.Text = this.Text + e.key;
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

    get BorderWidth(): number {
        return this.textList.BorderWidth;
    }

    set BorderWdith(borderWidth: number) {
        this.textList.BorderWidth = borderWidth;
    }

    get Scale(): number {
        return this.textList.Scale;
    }

    set Scale(scale: number) {
        this.textList.Scale = scale;
    }

    get Observable(): Observable<UIObservableEditableTextList> {
        return this.observable;
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

    Destroy(): void {
        this.deleter();

        this.textList.Destroy();
    }
}
