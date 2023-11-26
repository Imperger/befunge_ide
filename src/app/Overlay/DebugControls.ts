import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { HorizontalAnchor, UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRednerer";

export class DebugControls {
    private static DefaultButtonIconColor: Rgb = [0.40784313725490196, 0.6235294117647059, 0.2196078431372549];

    private static DebugModeButtonIconColor: Rgb = [0.9411764705882353, 0.6392156862745098, 0.0392156862745098];

    private group: UIObservablePositioningGroup;

    private executeButton: UIIconButton;

    private debugButton: UIIconButton;

    private readonly executeObservable = new ObservableController<void>();

    private readonly debugObservable = new ObservableController<void>();

    private debugMode = false;


    constructor(private uiRenderer: UIRenderer) {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        this.group = new UIObservablePositioningGroup({ x: 800, y: 60 }, { vertical: VerticalAnchor.Top, horizontal: HorizontalAnchor.Middle });

        const margin = 10;
        const buttonSideLength = 50;

        this.executeButton = this.uiRenderer.CreateButton(
            { x: 0, y: 0 },
            { width: buttonSideLength, height: buttonSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Play, color: DebugControls.DefaultButtonIconColor },
            _sender => this.executeObservable.Notify(),
            this.group
        );


        this.debugButton = this.uiRenderer.CreateButton(
            { x: buttonSideLength + margin, y: 0 },
            { width: buttonSideLength, height: buttonSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.PlayDebug, color: DebugControls.DefaultButtonIconColor },
            _sender => this.debugObservable.Notify(),
            this.group
        );
    }

    Resize(): void {
        this.group.Resize();
    }

    get DebugMode(): boolean {
        return this.debugMode;
    }

    set DebugMode(mode: boolean) {
        if (mode !== this.debugMode) {
            this.debugButton.Icon = {
                icon: UIIcon.PlayDebug,
                color: mode ? DebugControls.DebugModeButtonIconColor : DebugControls.DefaultButtonIconColor
            };
        }

        this.debugMode = mode;
    }

    get Execute(): Observable<void> {
        return this.executeObservable;
    }

    get Debug(): Observable<void> {
        return this.debugObservable;
    }
}
