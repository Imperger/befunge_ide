import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

export class FileControls {
    private group: UIObservablePositioningGroup;

    private openButton: UIIconButton;
    private saveButton: UIIconButton;

    private openFromDiskObservable = new ObservableController<void>();

    private saveToDiskObservable = new ObservableController<void>();

    constructor(private uiRenderer: UIRenderer) {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        const openButtonIconColor: Rgb = [0.9411764705882353, 0.6392156862745098, 0.0392156862745098];
        const saveButtonIconColor: Rgb = [0.08235294117647059, 0.396078431372549, 0.7529411764705882];
        const margin = 10;
        const btnSideLength = 30;

        this.group = new UIObservablePositioningGroup(
            { x: margin, y: margin + btnSideLength },
            { vertical: VerticalAnchor.Top });

        this.openButton = this.uiRenderer.CreateButton({ x: 0, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Open, color: openButtonIconColor },
            _sender => this.openFromDiskObservable.Notify(),
            this.group
        );

        this.saveButton = this.uiRenderer.CreateButton({ x: btnSideLength + margin, y: 0 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Save, color: saveButtonIconColor },
            _sender => this.saveToDiskObservable.Notify(),
            this.group
        );
    }

    Resize(): void {
        this.group.Resize();
    }

    get OpenFromDiskObservable(): Observable<void> {
        return this.openFromDiskObservable;
    }

    get SaveToDiskObservable(): Observable<void> {
        return this.saveToDiskObservable;
    }
}