import { inject, injectable } from "inversify";

import { DebugControlsLayout } from "./Layouts/DebugControlsLayout";

import { Inversify } from "@/Inversify";
import { PCDirection } from "@/lib/befunge/CPU/CPU";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb } from "@/lib/Primitives";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { HorizontalAnchor, UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

export interface PCDirectionCondition {
    Direction?: PCDirection;
}

export interface HeatmapToggleButtonState {
    isShown: boolean;
}

@injectable()
export class DebugControls {
    private static readonly DefaultButtonFillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
    private static readonly DefaultButtonOutlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
    private static readonly ToggleButtonOutlineColor: Rgb = [0, 0, 0];
    private static readonly DefaultButtonIconColor: Rgb = [0.40784313725490196, 0.6235294117647059, 0.2196078431372549];
    private static readonly DebugModeButtonIconColor: Rgb = [0.9411764705882353, 0.6392156862745098, 0.0392156862745098];
    private static readonly BreakpointButtonIconColor: Rgb = [0.8980392156862745, 0.2235294117647059, 0.20784313725490197];
    private static readonly ProfilerButtonIconColor: Rgb = [0.11764705882352941, 0.5647058823529412, 1];

    private group: UIObservablePositioningGroup;

    private executeButton: UIIconButton;

    private debugButton: UIIconButton;
    private debugMenuGroup: UIObservablePositioningGroup | null = null;

    private breakpointMenuButton: UIIconButton;
    private isBreakpointMenuOpen = false;
    private breakpointMenuGroup: UIObservablePositioningGroup | null = null;

    private heatmapButton: UIIconButton;

    private readonly executeObservable = new ObservableController<void>();

    private readonly debugObservable = new ObservableController<boolean>();

    private readonly cellBreakpointObservable = new ObservableController<PCDirectionCondition>();
    private readonly cellBreakpointDeleteObservable = new ObservableController<void>();

    private isHeatmapShown = false;
    private readonly heatmapObservable = new ObservableController<HeatmapToggleButtonState>();

    private debugMode = false;

    public DeactivateButton = false;

    constructor(
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(DebugControlsLayout) private layout: DebugControlsLayout) {
        this.group = new UIObservablePositioningGroup(
            { x: 0, y: 60 },
            { vertical: VerticalAnchor.Top, horizontal: HorizontalAnchor.Middle });

        const margin = 10;
        const buttonSideLength = 50;

        this.executeButton = this.uiRenderer.CreateButton(
            { x: 0, y: 0 },
            { width: buttonSideLength, height: buttonSideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.Play, color: DebugControls.DefaultButtonIconColor },
            _sender => this.executeObservable.Notify(),
            this.group
        );

        this.debugButton = this.uiRenderer.CreateButton(
            { x: buttonSideLength + margin, y: 0 },
            { width: buttonSideLength, height: buttonSideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.PlayDebug, color: DebugControls.DefaultButtonIconColor },
            _sender => this.debugObservable.Notify(true),
            this.group
        );

        this.breakpointMenuButton = this.uiRenderer.CreateButton(
            { x: 2 * buttonSideLength + 2 * margin, y: 0 },
            { width: buttonSideLength, height: buttonSideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.Breakpoint, color: DebugControls.BreakpointButtonIconColor },
            _sender => this.ToggleBreakpointMenuButton(),
            this.group
        );

        this.heatmapButton = this.uiRenderer.CreateButton(
            { x: 3 * buttonSideLength + 3 * margin, y: 0 },
            { width: buttonSideLength, height: buttonSideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.Heatmap, color: DebugControls.ProfilerButtonIconColor },
            sender => this.ToggleHeatmap(sender),
            this.group
        );

        this.layout.DebugGroup = this.group;
    }

    Resize(): void {
        this.group.Resize();
        this.breakpointMenuGroup?.Resize();
        this.debugMenuGroup?.Resize();
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

            const margin = 10;
            const sideLength = 50;

            if (mode) {
                this.debugMenuGroup = new UIObservablePositioningGroup(
                    {
                        x: this.debugButton.AbsolutePosition.x / this.group.Scale,
                        y: this.group.Position.y + margin + sideLength
                    },
                    { vertical: VerticalAnchor.Top });

                const stopDebuggingButton = this.uiRenderer.CreateButton(
                    { x: 0, y: 0 },
                    { width: sideLength, height: sideLength },
                    1,
                    { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
                    { icon: UIIcon.Stop, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
                    _sender => this.debugObservable.Notify(false),
                    this.debugMenuGroup);
            } else {
                this.debugMenuGroup?.Destroy();
                this.debugMenuGroup = null;
            }

            this.executeButton.Disable = mode;
            this.heatmapButton.Disable = mode;
        }

        this.debugMode = mode;
    }

    get IsHeatmapShown(): boolean {
        return this.isHeatmapShown;
    }

    get Execute(): Observable<void> {
        return this.executeObservable;
    }

    get Debug(): Observable<boolean> {
        return this.debugObservable;
    }

    get CellBreakopint(): Observable<PCDirectionCondition> {
        return this.cellBreakpointObservable;
    }

    get CellBreakpointDelete(): Observable<void> {
        return this.cellBreakpointDeleteObservable;
    }

    get Heatmap(): Observable<HeatmapToggleButtonState> {
        return this.heatmapObservable;
    }

    private ToggleBreakpointMenuButton(): void {
        if (this.isBreakpointMenuOpen) {
            this.CloseCellBreakpointDirectionMenu();
        } else {
            this.ShowCellBreakpointDirectionMenu();
        }
    }

    private ShowCellBreakpointDirectionMenu(): void {
        this.isBreakpointMenuOpen = true;

        this.breakpointMenuButton.Icon = { icon: UIIcon.Breakpoint, color: [0.4588235294117647, 0.4588235294117647, 0.4588235294117647] };

        const margin = 10;
        const sideLength = 50;
        const totalButtons = 5 + +this.DeactivateButton;
        this.breakpointMenuGroup = new UIObservablePositioningGroup(
            {
                x: this.breakpointMenuButton.AbsolutePosition.x / this.breakpointMenuButton.Scale,
                y: this.group.Position.y + totalButtons * margin + totalButtons * sideLength
            },
            { vertical: VerticalAnchor.Top });

        const breakpointAnyDirectionButton = this.uiRenderer.CreateButton(
            { x: 0, y: 0 },
            { width: sideLength, height: sideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.ArrowThinAll, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
            _sender => this.NotifyWithPCLocationCondition({}),
            this.breakpointMenuGroup);

        const breakpointLeftDirectionButton = this.uiRenderer.CreateButton(
            { x: 0, y: margin + sideLength },
            { width: sideLength, height: sideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.ArrowThinLeft, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
            _sender => this.NotifyWithPCLocationCondition({ Direction: PCDirection.Left }),
            this.breakpointMenuGroup);

        const breakpointUpDirectionButton = this.uiRenderer.CreateButton(
            { x: 0, y: 2 * margin + 2 * sideLength },
            { width: sideLength, height: sideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.ArrowThinUp, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
            _sender => this.NotifyWithPCLocationCondition({ Direction: PCDirection.Up }),
            this.breakpointMenuGroup);

        const breakpointRightDirectionButton = this.uiRenderer.CreateButton(
            { x: 0, y: 3 * margin + 3 * sideLength },
            { width: sideLength, height: sideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.ArrowThinRight, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
            _sender => this.NotifyWithPCLocationCondition({ Direction: PCDirection.Right }),
            this.breakpointMenuGroup);

        const breakpointDownDirectionButton = this.uiRenderer.CreateButton(
            { x: 0, y: 4 * margin + 4 * sideLength },
            { width: sideLength, height: sideLength },
            1,
            { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
            { icon: UIIcon.ArrowThinDown, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
            _sender => this.NotifyWithPCLocationCondition({ Direction: PCDirection.Down }),
            this.breakpointMenuGroup);

        if (this.DeactivateButton) {
            const breakpointDeactivateButton = this.uiRenderer.CreateButton(
                { x: 0, y: 5 * margin + 5 * sideLength },
                { width: sideLength, height: sideLength },
                1,
                { fillColor: DebugControls.DefaultButtonFillColor, outlineColor: DebugControls.DefaultButtonOutlineColor },
                { icon: UIIcon.Delete, color: [0.8980392156862745, 0.2235294117647059, 0.20784313725490197] },
                _sender => this.NotifyWithCellBreakpointDeactivation(),
                this.breakpointMenuGroup);
        }
    }

    private NotifyWithPCLocationCondition(direction: PCDirectionCondition): void {
        this.CloseCellBreakpointDirectionMenu();

        this.cellBreakpointObservable.Notify(direction);
    }

    private NotifyWithCellBreakpointDeactivation(): void {
        this.CloseCellBreakpointDirectionMenu();

        this.cellBreakpointDeleteObservable.Notify();
    }

    private CloseCellBreakpointDirectionMenu(): void {
        this.isBreakpointMenuOpen = false;

        this.breakpointMenuButton.Icon = { icon: UIIcon.Breakpoint, color: DebugControls.BreakpointButtonIconColor };

        this.breakpointMenuGroup?.Destroy();
        this.breakpointMenuGroup = null;
    }

    private ToggleHeatmap(component: UIIconButton): void {
        this.isHeatmapShown = !this.isHeatmapShown;

        const feedback: HeatmapToggleButtonState = { isShown: this.isHeatmapShown };
        this.heatmapObservable.Notify(feedback);

        if (feedback.isShown === this.isHeatmapShown) {

            const outlineColor = this.isHeatmapShown ?
                DebugControls.ToggleButtonOutlineColor :
                DebugControls.DefaultButtonOutlineColor;

            component.Style = { ...component.Style, outlineColor };

            if (this.isHeatmapShown) {
                this.CloseCellBreakpointDirectionMenu();
            }

            this.executeButton.Disable = this.isHeatmapShown;
            this.debugButton.Disable = this.isHeatmapShown;
            this.breakpointMenuButton.Disable = this.isHeatmapShown;
        }

        this.isHeatmapShown = feedback.isShown;
    }
}

Inversify.bind(DebugControls).toSelf().inSingletonScope();
