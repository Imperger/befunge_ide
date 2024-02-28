import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { Inversify } from "@/Inversify";
import { ExceptionTrap } from "@/lib/ExceptionTrap";
import { FontGlyphCollection, FontGlyphCollectionFactory } from "@/lib/font/FontGlyphCollection";
import { Rgb } from "@/lib/Primitives";
import { SelfBind } from "@/lib/SelfBind";
import { UIEditableTextList } from "@/lib/UI/UIEditableTextList/UIEditableTextList";
import { UIIcon } from "@/lib/UI/UIIcon";
import { UIIconButton } from "@/lib/UI/UIIconButton/UIIconButton";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextList } from "@/lib/UI/UITextList/UITextList";

@injectable()
export class IOControls {
    private group!: UIObservablePositioningGroup;

    private outputTextList: UITextList;
    private inputEditableTextList: UIEditableTextList;

    private inputButton: UIIconButton;
    private outputButton: UIIconButton;

    private fontGlyphCollection: FontGlyphCollection | null = null;

    private readonly maxPanelWidth = 800;

    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(InjectionToken.FontGlyphCollectionFactory) private fontGlyphCollectionFactory: FontGlyphCollectionFactory) {
        const fillColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
        const outlineColor: Rgb = [0.4980392156862745, 0.5490196078431373, 0.5529411764705883];
        const btnIconColor: Rgb = [0.17254901960784313, 0.24313725490196078, 0.3137254901960784];

        const margin = 10;
        const btnSideLength = 25;
        const textListHeight = 100;

        this.group = new UIObservablePositioningGroup({ x: 145, y: 10 }, { vertical: VerticalAnchor.Bottom });
        this.inputButton = this.uiRenderer.CreateButton(
            { x: 0, y: textListHeight + margin / 2 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Input, color: btnIconColor },
            _sender => this.SwitchTab(true),
            this.group);


        this.outputButton = this.uiRenderer.CreateButton(
            { x: btnSideLength + margin, y: textListHeight + margin / 2 },
            { width: btnSideLength, height: btnSideLength },
            1,
            { fillColor, outlineColor },
            { icon: UIIcon.Output, color: btnIconColor },
            _sender => this.SwitchTab(false),
            this.group);
        this.outputButton.Disable = true;

        this.outputTextList = this.uiRenderer.CreateTextList(
            { x: 0, y: 0 },
            { width: this.maxPanelWidth, height: textListHeight },
            1,
            '',
            32,
            this.group);

        this.inputEditableTextList = this.uiRenderer.CreateEditableTextList(
            { x: 0, y: 0 },
            { width: this.maxPanelWidth, height: textListHeight },
            1,
            '',
            32,
            this.group);
        this.inputEditableTextList.Visible = false;
    }

    private SwitchTab(inputTab: boolean): void {
        this.inputButton.Disable = inputTab;
        this.outputButton.Disable = !inputTab;

        this.inputEditableTextList.Visible = inputTab;
        this.outputTextList.Visible = !inputTab;

        if (this.outputTextList.Visible) {
            this.outputTextList.ScrollToTop();
        }
    }

    get Output(): string {
        return this.outputTextList.Text;
    }

    set Output(text: string) {
        this.outputTextList.Text = this.NewLineFormatter(text);

        this.outputTextList.ScrollToTop();
    }

    get Input(): string {
        return this.inputEditableTextList.Text;
    }

    Resize(): void {
        this.inputEditableTextList.Dimension = {
            width: this.PanelWidth,
            height: this.inputEditableTextList.Dimension.height / this.inputEditableTextList.Scale
        };

        this.outputTextList.Dimension = {
            width: this.PanelWidth,
            height: this.inputEditableTextList.Dimension.height / this.inputEditableTextList.Scale
        };

        this.group.Resize();
    }


    get PanelWidth(): number {
        const widthToFit = this.settings.ViewDimension.Width - this.group.AbsolutePosition.x;
        return Math.min(this.maxPanelWidth, widthToFit) / this.group.Scale;
    }

    private NewLineFormatter(str: string): string {
        const fontGlyphCollection = this.RetrieveFontGlyphCollection();

        const strArr = [...str];
        const padding = 20 * this.group.Scale;

        for (let n = 0, width = padding; n < strArr.length; ++n) {
            const symbol = strArr[n];

            if (symbol === '\n') {
                width = padding;
                continue;
            }

            const glyph = ExceptionTrap
                .Try(SelfBind(fontGlyphCollection, 'Lookup'), symbol)
                .CatchFn(SelfBind(fontGlyphCollection, 'Lookup'), '?');
            if (width + glyph.width > this.outputTextList.Dimension.width) {
                width = padding;
                strArr.splice(n, 0, '\n');
            } else {
                width += glyph.width;
            }
        }

        return strArr.join('');
    }

    private RetrieveFontGlyphCollection(): FontGlyphCollection {
        if (this.fontGlyphCollection !== null && this.fontGlyphCollection.LineHeight === this.outputTextList.LineHeight * this.outputTextList.Scale) {
            return this.fontGlyphCollection;
        }

        this.fontGlyphCollection = this.fontGlyphCollectionFactory({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: this.outputTextList.LineHeight * this.outputTextList.Scale } });

        return this.fontGlyphCollection;
    }
}

Inversify.bind(IOControls).toSelf().inSingletonScope();
