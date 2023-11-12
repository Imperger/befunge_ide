import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRednerer";

export class DebugControls {
    private group: UIObservablePositioningGroup;

    private executeButton: UIIconButton;

    private readonly executeObservable = new ObservableController<void>();

    constructor(private uiRenderer: UIRenderer) {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        const executionButtonIconColor: Rgb = [0.40784313725490196, 0.6235294117647059, 0.2196078431372549];
        this.group = new UIObservablePositioningGroup({ x: 800, y: 60 }, { vertical: VerticalAnchor.Top });

        this.executeButton = this.uiRenderer.CreateButton(
            { x: 0, y: 0 },
            { width: 50, height: 50 },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Play, color: executionButtonIconColor },
            _sender => this.ExecuteClick(),
            this.group
        );
    }

    Resize(): void {
        this.group.Resize();
    }

    get Execute(): Observable<void> {
        return this.executeObservable;
    }

    private ExecuteClick(): void {
        this.executeObservable.Notify();
    }
}
