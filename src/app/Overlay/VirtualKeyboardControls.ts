import { inject, injectable } from "inversify";

import { Inversify } from "@/Inversify";
import { EnumSize } from "@/lib/EnumSize";
import { Observable, ObservableController } from "@/lib/Observable";
import { Rgb, Vec2 } from "@/lib/Primitives";
import { Dimension } from "@/lib/UI/UIComponent";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { HorizontalAnchor, UIObservablePositioningGroup } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextButton } from "@/lib/UI/UITextButton/UITextButton";

enum KeyboardShiftMode { Lovercase, Uppercase, Secondary };

interface KeyboardStateFetcher {
    shift: () => KeyboardShiftMode;
    ascii: () => boolean;
}

class KeyboardButtonLayout {
    private symbols: string[];

    constructor(
        private keyboardState: KeyboardStateFetcher,
        primary: string,
        secondary?: string) {
        this.symbols = secondary === undefined ?
            [primary] :
            [secondary, primary];
    }

    get Caption(): string {
        let primary = this.symbols[this.symbols.length - 1];
        primary = this.IsUppercase ? primary.toUpperCase() : primary.toLowerCase();

        if (this.keyboardState.shift() !== KeyboardShiftMode.Secondary && this.keyboardState.ascii()) {
            primary = primary.charCodeAt(0).toString();
        }

        if (this.HasSecondary) {
            let secondary = this.symbols[0];

            if (this.keyboardState.shift() === KeyboardShiftMode.Secondary && this.keyboardState.ascii()) {
                secondary = secondary.charCodeAt(0).toString();
            }

            return `${secondary}\n${primary}`;
        } else {
            return primary;
        }
    }

    get Symbol(): string {
        const symbol = this.symbols[this.Index];

        return this.IsUppercase ? symbol.toUpperCase() : symbol.toLowerCase();
    }

    get CaptionDelimiter(): number {
        return this.keyboardState.shift() === KeyboardShiftMode.Secondary && this.keyboardState.ascii() ?
            this.symbols[0].charCodeAt(0).toString().length :
            this.symbols[0].length;
    }

    get HasSecondary(): boolean {
        return this.symbols.length > 1;
    }

    private get Index(): number {
        return +(this.keyboardState.shift() === KeyboardShiftMode.Lovercase ||
            this.keyboardState.shift() === KeyboardShiftMode.Uppercase) % this.symbols.length;
    }

    private get IsUppercase(): boolean {
        return this.keyboardState.shift() === KeyboardShiftMode.Uppercase;
    }
}

type ButtonDeleter = () => void;

interface SymbolButtonDescriptor {
    button: UITextButton;
    layout: KeyboardButtonLayout;
}

@injectable()
export class VirtualKeyboardControls {
    private readonly fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
    private readonly outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
    private zIndex = 5;

    private toggleKeyboardGroup: UIObservablePositioningGroup;
    private toggleKeyboard = false;
    private toggleKeyboardButton!: UIIconButton;
    private shiftIconColor = {
        lovercase: [0.17254901960784313, 0.24313725490196078, 0.3137254901960784] as Rgb,
        uppercase: [0.08235294117647059, 0.396078431372549, 0.7529411764705882] as Rgb,
        secondary: [0.5568627450980392, 0.26666666666666666, 0.6784313725490196] as Rgb
    };

    private buttonCaptionColor = {
        inactive: [0.7411764705882353, 0.7411764705882353, 0.7411764705882353] as Rgb,
        active: [0.17254901960784313, 0.24313725490196078, 0.3137254901960784] as Rgb
    };

    private asciiToggleOutlineColor = {
        inactive: [0.4980392156862745, 0.5490196078431373, 0.5529411764705883] as Rgb,
        active: [0, 0, 0] as Rgb
    };

    private buttonContentColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];

    private keyboardGroup: UIObservablePositioningGroup;
    private symbolButtons: SymbolButtonDescriptor[] = [];
    private buttonDimension = { width: 30, height: 60 };
    private readonly symbolMargin = 5;

    private spacebarButton!: UITextButton;

    private buttonDeleter: ButtonDeleter[] = [];

    private shiftWidth = 50;
    private shiftMode = KeyboardShiftMode.Lovercase;

    private asciiMode = false;

    private digitsSymbolRow!: KeyboardButtonLayout[];
    private firstSymbolRow!: KeyboardButtonLayout[];
    private secondSymbolRow!: KeyboardButtonLayout[];
    private thirdSymbolRow!: KeyboardButtonLayout[];

    private observable = new ObservableController<string>();

    constructor(@inject(UIRenderer) private uiRenderer: UIRenderer) {
        this.toggleKeyboardGroup = new UIObservablePositioningGroup({ x: 10, y: 10 });

        this.toggleKeyboardButton = this.uiRenderer.CreateIconButton(
            { x: 0, y: 0 },
            { width: 30, height: 30 },
            this.zIndex,
            { fillColor: this.fillColor, outlineColor: this.outlineColor },
            { icon: UIIcon.Keyboard, color: this.shiftIconColor.lovercase },
            (_sender: UIIconButton) => this.ToggleKeyboard(),
            this.toggleKeyboardGroup);

        this.keyboardGroup = new UIObservablePositioningGroup(
            { x: 0, y: this.symbolMargin },
            { horizontal: HorizontalAnchor.Middle });

        this.SetupKeyboardLayouts();

        this.observable.Attach(_symbol => this.TouchFeedback());
    }

    private SetupKeyboardLayouts(): void {
        const keyboardStateFetcher = {
            shift: () => this.shiftMode,
            ascii: () => this.asciiMode
        };

        this.digitsSymbolRow = [
            new KeyboardButtonLayout(keyboardStateFetcher, '1', '!'),
            new KeyboardButtonLayout(keyboardStateFetcher, '2', '?'),
            new KeyboardButtonLayout(keyboardStateFetcher, '3', ','),
            new KeyboardButtonLayout(keyboardStateFetcher, '4', '.'),
            new KeyboardButtonLayout(keyboardStateFetcher, '5', '\\'),
            new KeyboardButtonLayout(keyboardStateFetcher, '6', '`'),
            new KeyboardButtonLayout(keyboardStateFetcher, '7'),
            new KeyboardButtonLayout(keyboardStateFetcher, '8'),
            new KeyboardButtonLayout(keyboardStateFetcher, '9'),
            new KeyboardButtonLayout(keyboardStateFetcher, '0')
        ];

        this.firstSymbolRow = [
            new KeyboardButtonLayout(keyboardStateFetcher, 'q', '%'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'w', '^'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'e', '~'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'r', '|'),
            new KeyboardButtonLayout(keyboardStateFetcher, 't', '['),
            new KeyboardButtonLayout(keyboardStateFetcher, 'y', ']'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'u', '<'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'i', '>'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'o', '{'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'p', '}')
        ];

        this.secondSymbolRow = [
            new KeyboardButtonLayout(keyboardStateFetcher, 'a', '@'),
            new KeyboardButtonLayout(keyboardStateFetcher, 's', '#'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'd', '&'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'f', '*'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'g', '-'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'h', '+'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'j', '='),
            new KeyboardButtonLayout(keyboardStateFetcher, 'k', '('),
            new KeyboardButtonLayout(keyboardStateFetcher, 'l', ')')
        ];

        this.thirdSymbolRow = [
            new KeyboardButtonLayout(keyboardStateFetcher, 'z', '_'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'x', '$'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'c', '"'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'v', '\''),
            new KeyboardButtonLayout(keyboardStateFetcher, 'b', ':'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'n', ';'),
            new KeyboardButtonLayout(keyboardStateFetcher, 'm', '/')
        ];
    }

    private ToggleKeyboard(): void {
        this.toggleKeyboard = !this.toggleKeyboard;

        this.toggleKeyboardButton.Icon = {
            icon: this.toggleKeyboardButton.Icon.icon,
            color: this.toggleKeyboard ? this.shiftIconColor.uppercase : this.shiftIconColor.lovercase
        };

        this.toggleKeyboard ?
            this.SpawnKeyboard() :
            this.HideKeyboard();
    }

    private SpawnKeyboard(): void {
        this.CreateSymbolRow({ x: 0, y: 4 * this.buttonDimension.height + 5 * this.symbolMargin },
            this.digitsSymbolRow);

        this.CreateSymbolRow(
            { x: 0, y: 3 * this.buttonDimension.height + 4 * this.symbolMargin },
            this.firstSymbolRow);

        this.CreateSymbolRow(
            { x: this.buttonDimension.width / 2, y: 2 * this.buttonDimension.height + 3 * this.symbolMargin },
            this.secondSymbolRow);

        this.CreateSymbolRow(
            { x: this.shiftWidth + this.symbolMargin, y: this.buttonDimension.height + 2 * this.symbolMargin },
            this.thirdSymbolRow);

        this.CreateBottomRow();
    }

    private CreateSymbolRow(position: Vec2, layouts: KeyboardButtonLayout[]): void {
        for (let n = 0; n < layouts.length; ++n) {
            const layout = layouts[n];
            const button = this.uiRenderer.CreateTextButton(
                {
                    x: position.x + (this.buttonDimension.width + this.symbolMargin) * n,
                    y: position.y
                },
                {
                    width: this.buttonDimension.width,
                    height: this.buttonDimension.height
                },
                this.zIndex,
                { fillColor: this.fillColor, outlineColor: this.outlineColor },
                { text: layout.Caption, lineHeight: 16, color: this.buttonContentColor },
                (_sender: UITextButton) => this.observable.Notify(layouts[n].Symbol),
                this.keyboardGroup);

            this.StyleButtonCaption(button, layout, true);

            this.symbolButtons.push({ button, layout });
            this.buttonDeleter.push(() => button.Destroy());
        }
    }

    private CreateBottomRow(): void {
        const shift = this.uiRenderer.CreateIconButton(
            {
                x: 0,
                y: this.buttonDimension.height + 2 * this.symbolMargin
            },
            { width: this.shiftWidth, height: this.buttonDimension.height },
            this.zIndex,
            { fillColor: this.fillColor, outlineColor: this.outlineColor },
            { icon: UIIcon.Shift, color: this.buttonContentColor },
            (sender: UIIconButton) => this.ToggleShift(sender),
            this.keyboardGroup);

        this.buttonDeleter.push(() => shift.Destroy());


        this.spacebarButton = this.uiRenderer.CreateTextButton(
            {
                x: this.shiftWidth + this.symbolMargin,
                y: this.symbolMargin
            },
            {
                width: this.thirdSymbolRow.length * this.buttonDimension.width + this.symbolMargin * (this.thirdSymbolRow.length - 1),
                height: this.buttonDimension.height
            },
            this.zIndex,
            { fillColor: this.fillColor, outlineColor: this.outlineColor },
            { text: '', lineHeight: 16, color: this.buttonContentColor },
            (_sender: UITextButton) => this.observable.Notify(' '),
            this.keyboardGroup);

        this.buttonDeleter.push(() => this.spacebarButton.Destroy());


        const backspace = this.uiRenderer.CreateIconButton(
            {
                x: this.shiftWidth + this.thirdSymbolRow.length * this.buttonDimension.width + (this.thirdSymbolRow.length + 1) * this.symbolMargin,
                y: this.buttonDimension.height + 2 * this.symbolMargin
            },
            { width: this.shiftWidth, height: this.buttonDimension.height },
            this.zIndex,
            { fillColor: this.fillColor, outlineColor: this.outlineColor },
            { icon: UIIcon.Backspace, color: this.buttonContentColor },
            (_sender: UIIconButton) => this.observable.Notify('Backspace'),
            this.keyboardGroup);

        this.buttonDeleter.push(() => backspace.Destroy());


        const asciiCodes = this.uiRenderer.CreateTextButton(
            {
                x: 0,
                y: this.symbolMargin
            },
            { width: this.shiftWidth, height: this.buttonDimension.height },
            this.zIndex,
            { fillColor: this.fillColor, outlineColor: this.outlineColor },
            { text: 'ASCII', lineHeight: 16, color: this.buttonContentColor },
            (sender: UITextButton) => this.ToggleASCII(sender),
            this.keyboardGroup);

        this.buttonDeleter.push(() => asciiCodes.Destroy());


        const enter = this.uiRenderer.CreateIconButton(
            {
                x: this.shiftWidth + this.thirdSymbolRow.length * this.buttonDimension.width + (this.thirdSymbolRow.length + 1) * this.symbolMargin,
                y: this.symbolMargin
            },
            { width: this.shiftWidth, height: this.buttonDimension.height },
            this.zIndex,
            { fillColor: this.fillColor, outlineColor: this.outlineColor },
            { icon: UIIcon.Enter, color: this.buttonContentColor },
            (_sender: UIIconButton) => this.observable.Notify('Enter'),
            this.keyboardGroup);

        this.buttonDeleter.push(() => enter.Destroy());
    }

    private ToggleShift(sender: UIIconButton): void {
        this.TouchFeedback();

        this.shiftMode = (this.shiftMode + 1) % EnumSize(KeyboardShiftMode);

        const color = [
            this.shiftIconColor.lovercase,
            this.shiftIconColor.uppercase,
            this.shiftIconColor.secondary
        ][this.shiftMode];

        sender.Icon = { ...sender.Icon, color };

        this.UpdateSymbolButtonsCaptions();
    }

    private ToggleASCII(sender: UITextButton): void {
        this.TouchFeedback();

        this.asciiMode = !this.asciiMode;

        this.spacebarButton.Caption = {
            ...this.spacebarButton.Caption,
            text: this.asciiMode ? ' '.charCodeAt(0).toString() : ''
        };


        sender.Style = {
            ...sender.Style,
            outlineColor: this.asciiToggleOutlineColor[this.asciiMode ? 'active' : 'inactive']
        };

        this.UpdateSymbolButtonsCaptions();
    }

    private UpdateSymbolButtonsCaptions(): void {
        this.symbolButtons.forEach(descriptor => {
            const { button, layout } = descriptor;

            button.Caption = { ...button.Caption, text: layout.Caption };

            switch (this.shiftMode) {
                case KeyboardShiftMode.Lovercase:
                case KeyboardShiftMode.Uppercase:
                    this.StyleButtonCaption(button, layout, true);
                    break;
                case KeyboardShiftMode.Secondary:
                    this.StyleButtonCaption(button, layout, false);
                    break;
            }
        });
    }

    private StyleButtonCaption(button: UITextButton, layout: KeyboardButtonLayout, primary: boolean): void {
        if (layout.HasSecondary) {
            const [primaryColor, secondaryColor] = primary ?
                [this.buttonCaptionColor.inactive, this.buttonCaptionColor.active] :
                [this.buttonCaptionColor.active, this.buttonCaptionColor.inactive];

            button.StyleCaptionRange(0, layout.CaptionDelimiter, { color: primaryColor });
            button.StyleCaptionRange(layout.CaptionDelimiter + 1, button.Caption.text.length, { color: secondaryColor });
        } else {
            button.StyleCaptionRange(0, button.Caption.text.length, { color: this.buttonCaptionColor.active });
        }
    }

    private HideKeyboard(): void {
        this.buttonDeleter.forEach(destroy => destroy());
        this.buttonDeleter.length = 0;

        this.symbolButtons.length = 0;

        this.shiftMode = KeyboardShiftMode.Lovercase;
    }

    private TouchFeedback(): void {
        navigator.vibrate(30);
    }

    get Observable(): Observable<string> {
        return this.observable;
    }

    get AbsolutePosition(): Vec2 {
        return this.keyboardGroup.AbsolutePosition;
    }

    get Dimension(): Dimension {
        return this.keyboardGroup.Dimension;
    }

    Resize(): void {
        this.toggleKeyboardGroup.Resize();
        this.keyboardGroup.Resize();
    }
}

Inversify.bind(VirtualKeyboardControls).toSelf().inSingletonScope();
