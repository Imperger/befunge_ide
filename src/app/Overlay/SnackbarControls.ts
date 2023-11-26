import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";

import { Inversify } from "@/Inversify";
import { Rgb } from "@/lib/Primitives";
import { UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from "@/lib/UI/UIAlert/UIAlert";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIObservablePositioningGroup } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRednerer";

@injectable()
export class SnackbarControls {
    private group!: UIObservablePositioningGroup;

    private snackbar: UIAlert | null = null;

    private widthPercent = 0.25;

    private contentColor: Rgb = [0.9, 0.9, 0.9];

    private lineHeight = 32;

    private showTime = 5000;

    private hideTimer = -1;

    constructor(
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(AppSettings) private settings: AppSettings) { }

    Show(icon: UIAlertIconStyle, text: UIAlertText, style: UIAlertStyle): void {
        if (this.snackbar !== null) {
            this.Hide();
        }

        const width = this.settings.ViewDimension.Width * this.widthPercent;

        this.snackbar = this.uiRenderer.CreateAlert(
            { x: (this.settings.ViewDimension.Width - width) / 2, y: 0 },
            { width, height: 100 },
            1,
            icon,
            text,
            style);

        this.hideTimer = setTimeout(() => this.Hide(), this.showTime);
    }

    ShowError(msg: string): void {
        this.Show(
            { icon: UIIcon.ExclamationCircle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.83, 0.18, 0.18] }
        );
    }

    ShowWarning(msg: string): void {
        this.Show(
            { icon: UIIcon.ExclamationTriangle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.93, 0.42, 0.01] }
        );
    }

    ShowInformation(msg: string): void {
        this.Show(
            { icon: UIIcon.ExclamationCircle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.1, 0.53, 0.82] }
        );
    }

    ShowSuccess(msg: string): void {
        this.Show(
            { icon: UIIcon.ExclamationCircle, color: this.contentColor },
            { text: msg, lineHeight: this.lineHeight, color: this.contentColor },
            { fillColor: [0.18, 0.49, 0.2] }
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
