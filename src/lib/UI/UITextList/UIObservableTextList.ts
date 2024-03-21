import { vec2 } from "gl-matrix";

import { Dimension } from "../UIComponent";
import { UIIcon } from "../UIIcon";
import { UIButtonStyle, UIIconButton } from "../UIIconButton/UIIconButton";
import { UILabel } from "../UILabel/UILabel";
import { UILabelRenderer } from "../UILabel/UILabelRenderer";
import { UIObservablePositioningGroup } from "../UIObservablePositioningGroup";
import { UICreator } from "../UIRenderer";

import { UITextList } from "./UITextList";

import { MathUtil } from "@/lib/math/MathUtil";
import { Observable, ObservableController, ObserverDetacher } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";

interface ScrollControls {
    scrollTopButton: UIIconButton;
    scrollBottomButton: UIIconButton;
}

export type UIObservableTextListDeleter = () => void;

export class UIObservableTextList implements UITextList {
    public visible = true;

    private scale = 1;

    private scroll = 0;

    private label: UILabel;

    private scrollControls: ScrollControls | null = null;

    private observable = new ObservableController<UIObservableTextList>();

    private readonly scrollButtonDimension: Dimension = { width: 10, height: 20 };

    private margin = 5;

    private readonly scrollButtonStyle: UIButtonStyle = {
        fillColor: [0.9254901960784314, 0.9411764705882353, 0.9450980392156862],
        outlineColor: [0.9254901960784314, 0.9411764705882353, 0.9450980392156862]
    };

    private readonly scrollButtonIconColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];

    private parentDetacher: ObserverDetacher | null = null;

    constructor(
        private position: Vec2,
        private dimension: Dimension,
        private zIndex: number,
        text: string,
        lineHeight: number,
        private borderWidth: number,
        public Offset: number,
        private labelRenderer: UILabelRenderer,
        private uiRenderer: UICreator,
        private deleter: UIObservableTextListDeleter,
        private parent: UIObservablePositioningGroup | null
    ) {
        this.label = this.labelRenderer.Create(
            {
                x: position.x + this.BorderWidth,
                y: position.y
            },
            zIndex,
            text,
            lineHeight,
            parent);

        this.parentDetacher = parent?.Observable.Attach(() => this.observable.Notify(this)) ?? null;

        this.ScheduleUpdateScrollControlsPresence();
    }

    get Position(): Vec2 {
        return this.position;
    }

    set Position(position: Vec2) {
        this.position = position;

        this.observable.Notify(this);
    }

    get Dimension(): Dimension {
        return {
            width: this.dimension.width * this.Scale,
            height: this.dimension.height * this.Scale
        };
    }

    set Dimension(dimension: Dimension) {
        this.dimension = dimension;

        this.observable.Notify(this);
        this.ScheduleUpdateScrollControlsPresence();
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
        return this.label.Text;
    }

    set Text(text: string) {
        this.label.Text = text;

        this.scroll = 0;
        this.label.Position = {
            x: this.position.x + this.BorderWidth,
            y: this.position.y
        }

        this.observable.Notify(this);
        this.ScheduleUpdateScrollControlsPresence();
    }

    get ZIndex(): number {
        return this.zIndex;
    }

    set ZIndex(zIndex: number) {
        this.zIndex = zIndex;

        this.label.ZIndex = zIndex;

        this.observable.Notify(this);
    }

    get LineHeight(): number {
        return this.label.LineHeight;
    }

    set LineHeight(lineHeight: number) {
        this.label.LineHeight = lineHeight;

        this.observable.Notify(this);
        this.ScheduleUpdateScrollControlsPresence();
    }

    get BorderWidth(): number {
        return this.borderWidth * this.Scale;
    }

    set BorderWidth(width: number) {
        this.borderWidth = width;

        this.observable.Notify(this);
    }

    get Visible(): boolean {
        return this.visible;
    }

    set Visible(value: boolean) {
        this.visible = value;

        this.ScheduleUpdateScrollControlsPresence();

        this.observable.Notify(this);
    }

    get Scale(): number {
        return this.parent === null ? this.scale : this.scale * this.parent.Scale;
    }

    set Scale(scale: number) {
        this.scale = scale;

        if (this.parent === null) {
            this.label.Scale = scale;
        }

        this.ScheduleUpdateScrollControlsPresence();

        if (this.scrollControls !== null) {
            this.scrollControls.scrollTopButton.Scale = scale;
            this.scrollControls.scrollBottomButton.Scale = scale;
        }


        this.observable.Notify(this);
    }

    get Observable(): Observable<UIObservableTextList> {
        return this.observable;
    }

    private get IsContentOverflow(): boolean {
        return this.label.Dimension.height > this.Dimension.height;
    }

    ScrollToTop(): void {
        queueMicrotask(() => {
            if (this.visible && this.IsContentOverflow) {
                this.scroll = 0;
                this.ScrollAligned(this.MinScroll);
            }
        });
    }

    Destroy(): void {
        this.parent?.RemoveChild(this);

        if (this.parentDetacher !== null) {
            this.parentDetacher();
        }

        this.deleter();
    }

    private ScheduleUpdateScrollControlsPresence(): void {
        queueMicrotask(() => this.UpdateScrollControlsPresence());
    }

    private UpdateScrollControlsPresence(): void {
        if (this.visible && this.IsContentOverflow) {
            if (this.scrollControls === null) {
                this.scrollControls = {
                    scrollTopButton: this.CreateTopScrollButton(),
                    scrollBottomButton: this.CreateBottomScrollButton()
                };

                if (this.parent === null) {
                    this.scrollControls.scrollBottomButton.Scale = this.Scale;
                    this.scrollControls.scrollTopButton.Scale = this.Scale;
                }

                this.ScrollAligned(0);
            }

            this.scrollControls.scrollBottomButton.Position = {
                x: this.ScrollButtonX,
                y: this.ScrollBottomButtonY
            };

            this.scrollControls.scrollTopButton.Position = {
                x: this.ScrollButtonX,
                y: this.ScrollTopButtonY
            };
        } else {
            if (this.scrollControls !== null) {
                this.scrollControls.scrollTopButton.Destroy();
                this.scrollControls.scrollBottomButton.Destroy();
                this.scrollControls = null;
            }
        }
    }

    private get ScrollButtonX(): number {
        return this.Position.x + this.dimension.width - this.borderWidth - this.scrollButtonDimension.width - this.margin;
    }

    private get ScrollTopButtonY(): number {
        return this.Position.y + this.dimension.height - this.scrollButtonDimension.height - this.borderWidth - this.margin;
    }

    private get ScrollBottomButtonY(): number {
        return this.Position.y + this.BorderWidth + this.margin;
    }

    private CreateTopScrollButton(): UIIconButton {
        return this.uiRenderer.CreateIconButton(
            {
                x: this.ScrollButtonX,
                y: this.ScrollTopButtonY
            },
            this.scrollButtonDimension,
            1,
            this.scrollButtonStyle,
            { color: this.scrollButtonIconColor, icon: UIIcon.ArrowUp },
            (_component: UIIconButton) => this.ScrollAligned(-this.LineHeight),
            this.parent
        );
    }

    private CreateBottomScrollButton(): UIIconButton {
        return this.uiRenderer.CreateIconButton(
            {
                x: this.ScrollButtonX,
                y: this.ScrollBottomButtonY
            },
            this.scrollButtonDimension,
            1,
            this.scrollButtonStyle,
            { color: this.scrollButtonIconColor, icon: UIIcon.ArrowDown },
            (_component: UIIconButton) => this.ScrollAligned(this.LineHeight),
            this.parent
        );
    }

    get MinScroll(): number {
        return this.Position.y - this.label.Dimension.height / this.label.Scale + this.dimension.height - 2 * this.borderWidth;
    }

    get MaxScroll(): number {
        return this.Position.y;
    }

    ScrollAligned(offset: number): void {
        if (!this.IsContentOverflow) {
            return;
        }

        this.scroll += offset;

        this.scroll = MathUtil.Clamp(this.scroll, this.MinScroll, this.MaxScroll);

        this.UpdateScrollButtonDisability();

        this.label.Position = { ...this.label.Position, y: this.scroll };
    }

    private UpdateScrollButtonDisability(): void {
        if (this.scroll === this.MinScroll) {
            this.scrollControls!.scrollTopButton.Disable = true;
        } else if (this.scrollControls!.scrollTopButton.Disable) {
            this.scrollControls!.scrollTopButton.Disable = false;
        }

        if (this.scroll === this.MaxScroll) {
            this.scrollControls!.scrollBottomButton.Disable = true;
        } else if (this.scrollControls!.scrollBottomButton.Disable) {
            this.scrollControls!.scrollBottomButton.Disable = false;
        }
    }
}
