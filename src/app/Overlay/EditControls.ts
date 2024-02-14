import { inject, injectable } from "inversify";

import { Inversify } from "@/Inversify";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { Dimension } from "@/lib/UI/UIComponent";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

@injectable()
export class EditControls {
    private group: UIObservablePositioningGroup;

    private selectButton: UIIconButton;
    private cutButton: UIIconButton;
    private copyButton: UIIconButton;
    private pasteButton: UIIconButton;
    private deleteButton: UIIconButton;

    private selectObservable = new ObservableController<void>();
    private cutObservable = new ObservableController<void>();
    private copyObservable = new ObservableController<void>();
    private pasteObservable = new ObservableController<void>();
    private deleteObservable = new ObservableController<void>();

    constructor(@inject(UIRenderer) private uiRenderer: UIRenderer) {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        const buttonIconColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];

        const margin = 10;
        const btnSideLength = 30;

        this.group = new UIObservablePositioningGroup(
            { x: 9 * margin + 6 * btnSideLength, y: margin + btnSideLength },
            { vertical: VerticalAnchor.Top }
        );

        this.selectButton = this.uiRenderer.CreateButton({ x: 0, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Select, color: buttonIconColor },
            _sender => this.selectObservable.Notify(),
            this.group
        );

        this.cutButton = this.uiRenderer.CreateButton({ x: margin + btnSideLength, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Cut, color: buttonIconColor },
            _sender => this.cutObservable.Notify(),
            this.group
        );

        this.copyButton = this.uiRenderer.CreateButton({ x: 2 * margin + 2 * btnSideLength, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Copy, color: buttonIconColor },
            _sender => this.copyObservable.Notify(),
            this.group
        );

        this.pasteButton = this.uiRenderer.CreateButton({ x: 3 * margin + 3 * btnSideLength, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Paste, color: buttonIconColor },
            _sender => this.pasteObservable.Notify(),
            this.group
        );

        this.deleteButton = this.uiRenderer.CreateButton({ x: 4 * margin + 4 * btnSideLength, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.EditDelete, color: buttonIconColor },
            _sender => this.deleteObservable.Notify(),
            this.group
        );
    }

    Resize(): void {
        this.group.Resize();
    }

    get SelectObservable(): Observable<void> {
        return this.selectObservable;
    }

    get CutObservable(): Observable<void> {
        return this.cutObservable;
    }

    get CopyObservable(): Observable<void> {
        return this.copyObservable;
    }

    get PasteObservable(): Observable<void> {
        return this.pasteObservable;
    }

    get DeleteObservable(): Observable<void> {
        return this.deleteObservable;
    }

    get Position(): Vec2 {
        return this.group.AbsolutePosition;
    }

    get Dimension(): Dimension {
        return this.group.Dimension;
    }
}

Inversify.bind(EditControls).toSelf().inSingletonScope();
