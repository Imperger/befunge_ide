import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";

import { Inversify } from "@/Inversify";
import { Rgb } from "@/lib/Primitives";
import { UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from "@/lib/UI/UIAlert/UIAlert";
import { UIIcon } from "@/lib/UI/UIIcon";
import { HorizontalAnchor, UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

@injectable()
export class SnackbarControls {
    private group: UIObservablePositioningGroup;

    private snackbar: UIAlert | null = null;

    private contentColor: Rgb = [0.9, 0.9, 0.9];

    private lineHeight = 24;

    private hideTimer = -1;

    constructor(
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(AppSettings) private settings: AppSettings) {
        this.group = new UIObservablePositioningGroup(
            { x: 0, y: 0 },
            { vertical: VerticalAnchor.Bottom, horizontal: HorizontalAnchor.Middle });
    }

    Show(icon: UIAlertIconStyle, text: UIAlertText, style: UIAlertStyle, timeout: number): void {
        if (this.snackbar !== null) {
            this.Hide();
        }

        this.snackbar = this.uiRenderer.CreateAlert(
            { x: 0, y: 0 },
            1,
            icon,
            text,
            style,
            this.group);

        this.LimitToViewportWidth();

        this.hideTimer = setTimeout(() => this.Hide(), timeout);
    }

    private LimitToViewportWidth(): void {
        const alertWidth = this.group.Dimension.width;
        if (alertWidth > this.settings.ViewDimension.Width) {
            const targetScale = this.settings.ViewDimension.Width / alertWidth;
            this.group.Scale = targetScale;
        }
    }

    ShowError(msg: string, timeout = 5000): void {
        this.Show(
            { icon: UIIcon.ExclamationCircle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.83, 0.18, 0.18] },
            timeout
        );
    }

    ShowWarning(msg: string, timeout = 5000): void {
        this.Show(
            { icon: UIIcon.ExclamationTriangle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.93, 0.42, 0.01] },
            timeout
        );
    }

    ShowInformation(msg: string, timeout = 5000): void {
        this.Show(
            { icon: UIIcon.ExclamationCircle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.1, 0.53, 0.82] },
            timeout
        );
    }

    ShowSuccess(msg: string, timeout = 5000): void {
        this.Show(
            { icon: UIIcon.ExclamationCircle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.18, 0.49, 0.2] },
            timeout
        );
    }

    Hide(): void {
        this.snackbar?.Destroy();
        this.snackbar = null;
        clearTimeout(this.hideTimer);
    }

    Resize(): void {
        this.group.Resize();
    }
}

Inversify.bind(SnackbarControls).toSelf().inSingletonScope();
