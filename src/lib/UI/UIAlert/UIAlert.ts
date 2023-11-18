import { UIComponent } from "../UIComponent";
import { UIIcon } from "../UIIcon";

import { Rgb } from "@/lib/Primitives";

export interface Dimension {
    width: number;
    height: number;
}

export interface UIAlertIconStyle {
    icon: UIIcon;
    color: Rgb;
}

export interface UIAlertText {
    text: string;
    color: Rgb;
    lineHeight: number;
}

export interface UIAlertStyle {
    fillColor: Rgb;
}

export interface UIAlert extends UIComponent {
    Dimension: Dimension,
    ZIndex: number;
    Icon: UIAlertIconStyle;
    Text: UIAlertText;
    Style: UIAlertStyle;

    Destroy(): void;
}
