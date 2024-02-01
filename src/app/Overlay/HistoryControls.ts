import { inject, injectable } from "inversify";

import { AppHistory } from "../History/AppHistory";

import { Inversify } from "@/Inversify";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

@injectable()
export class HistoryControls {
    private group: UIObservablePositioningGroup;

    private undoButton: UIIconButton;
    private redoButton: UIIconButton;

    private undoObservable = new ObservableController<void>();

    private redoObservable = new ObservableController<void>();

    constructor(
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(AppHistory) private history: AppHistory) {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        const buttonIconColor: Rgb = [0.08235294117647059, 0.396078431372549, 0.7529411764705882];

        const margin = 10;
        const btnSideLength = 30;

        this.group = new UIObservablePositioningGroup(
            { x: 5 * margin + 3 * btnSideLength, y: margin + btnSideLength },
            { vertical: VerticalAnchor.Top });

        this.undoButton = this.uiRenderer.CreateButton({ x: 0, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Undo, color: buttonIconColor },
            _sender => this.undoObservable.Notify(),
            this.group
        );
        this.undoButton.Disable = true;

        this.redoButton = this.uiRenderer.CreateButton({ x: btnSideLength + margin, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Redo, color: buttonIconColor },
            _sender => this.redoObservable.Notify(),
            this.group
        );
        this.redoButton.Disable = true;

        this.history.UpdateObservable.Attach(() => this.UpdateButtonsAvailability());
    }

    Resize(): void {
        this.group.Resize();
    }

    get CanUndo(): boolean {
        return this.undoButton.Disable;
    }

    set CanUndo(value: boolean) {
        if (this.undoButton.Disable !== value) {
            this.undoButton.Disable = value;
        }
    }

    get CanRedo(): boolean {
        return this.redoButton.Disable;
    }

    set CanRedo(value: boolean) {
        if (this.redoButton.Disable !== value) {
            this.redoButton.Disable = value;
        }
    }

    get UndoObservable(): Observable<void> {
        return this.undoObservable;
    }

    get RedoObservable(): Observable<void> {
        return this.redoObservable;
    }

    private UpdateButtonsAvailability(): void {
        this.undoButton.Disable = !this.history.CanUndo;
        this.redoButton.Disable = !this.history.CanRedo;
    }
}

Inversify.bind(HistoryControls).toSelf().inSingletonScope();
