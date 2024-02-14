import { EditionDirection } from "../CodeEditor/CodeEditorService";

import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

interface EditDirection {
    group: UIObservablePositioningGroup;
    left: UIIconButton;
    up: UIIconButton;
    right: UIIconButton;
    down: UIIconButton;
}

export class EditDirectionControls {
    private static CurrentDirectionInactiveIconColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];
    private static CurrentDirrectionActiveIconColor: Rgb = [0.1607843137254902, 0.5019607843137255, 0.7254901960784313];

    private group: UIObservablePositioningGroup;
    private editDirectionControls!: EditDirection;
    private currentDirectionControl!: UIIconButton;

    private editDirectionObservable = new ObservableController<EditionDirection>();

    constructor(private uiRenderer: UIRenderer) {
        const buttonMargin = 5;
        const [buttonWidth, btnHeight] = [37.5, 25];

        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];

        this.group = new UIObservablePositioningGroup(
            {
                x: 10,
                y: 2 * buttonWidth + 3 * buttonMargin + btnHeight + 50
            },
            { vertical: VerticalAnchor.Top });

        this.editDirectionControls = {
            group: this.group,
            left: this.uiRenderer.CreateButton(
                { x: 0, y: buttonWidth + buttonMargin },
                { width: buttonWidth, height: btnHeight },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ArrowLeft, color: EditDirectionControls.CurrentDirectionInactiveIconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Left),
                this.group),
            up: this.uiRenderer.CreateButton(
                { x: buttonWidth + buttonMargin / 2 - btnHeight / 2, y: buttonWidth + 2 * buttonMargin + btnHeight },
                { width: btnHeight, height: buttonWidth },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ArrowUp, color: EditDirectionControls.CurrentDirectionInactiveIconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Up),
                this.group),
            right: this.uiRenderer.CreateButton(
                { x: buttonWidth + buttonMargin, y: buttonWidth + buttonMargin },
                { width: buttonWidth, height: btnHeight },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ArrowRight, color: EditDirectionControls.CurrentDirrectionActiveIconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Right),
                this.group),
            down: this.uiRenderer.CreateButton(
                { x: buttonWidth + buttonMargin / 2 - btnHeight / 2, y: 0 },
                { width: btnHeight, height: buttonWidth },
                1,
                { fillColor, outlineColor },
                { icon: UIIcon.ArrowDown, color: EditDirectionControls.CurrentDirectionInactiveIconColor },
                sender => this.UpdateEditDirection(sender, EditionDirection.Down),
                this.group)
        };

        this.currentDirectionControl = this.editDirectionControls.right;
    }

    get EditDirectionObservable(): Observable<EditionDirection> {
        return this.editDirectionObservable;
    }

    Resize(): void {
        this.group.Resize();
    }

    ForceEditDirection(direction: EditionDirection): void {
        this.currentDirectionControl.Icon = {
            ...this.currentDirectionControl.Icon,
            color: EditDirectionControls.CurrentDirectionInactiveIconColor
        };

        const control = direction === EditionDirection.Left ? this.editDirectionControls.left :
            direction === EditionDirection.Up ? this.editDirectionControls.up :
                direction === EditionDirection.Right ? this.editDirectionControls.right :
                    this.editDirectionControls.down;

        control.Icon = {
            ...control.Icon,
            color: EditDirectionControls.CurrentDirrectionActiveIconColor
        };

        this.currentDirectionControl = control;
    }

    private UpdateEditDirection(sender: UIIconButton, direction: EditionDirection): void {
        if (sender === this.currentDirectionControl) {
            return;
        }

        this.currentDirectionControl.Icon = {
            ...this.currentDirectionControl.Icon,
            color: EditDirectionControls.CurrentDirectionInactiveIconColor
        };

        sender.Icon = {
            ...sender.Icon,
            color: EditDirectionControls.CurrentDirrectionActiveIconColor
        };

        this.currentDirectionControl = sender;
        this.editDirectionObservable.Notify(direction)
    }
}
