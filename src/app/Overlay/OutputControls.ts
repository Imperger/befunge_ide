import { inject, injectable } from "inversify";

import { InjectionToken } from "../InjectionToken";

import { Inversify } from "@/Inversify";
import { ExceptionTrap } from "@/lib/ExceptionTrap";
import { FontGlyphCollection, FontGlyphCollectionFactory } from "@/lib/font/FontGlyphCollection";
import { SelfBind } from "@/lib/SelfBind";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextList } from "@/lib/UI/UITextList/UITextList";

@injectable()
export class OutputControls {
    private group!: UIObservablePositioningGroup;

    private outputTextList!: UITextList;

    private charactersPerLine = 24;

    private fontGlyphCollection: FontGlyphCollection | null = null;

    constructor(
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(InjectionToken.FontGlyphCollectionFactory) private fontGlyphCollectionFactory: FontGlyphCollectionFactory) {
        this.group = new UIObservablePositioningGroup({ x: 145, y: 10 }, { vertical: VerticalAnchor.Bottom });

        this.outputTextList = this.uiRenderer.CreateTextList(
            { x: 0, y: 0 },
            { width: 800, height: 200 },
            1,
            '',
            64,
            this.group);
    }

    get Output(): string {
        return this.outputTextList.Text;
    }

    set Output(text: string) {
        this.outputTextList.Text = this.NewLineFormatter(text);

        this.outputTextList.ScrollToTop();
    }

    Resize(): void {
        this.group.Resize();
    }

    private NewLineFormatter(str: string): string {
        const fontGlyphCollection = this.RetrieveFontGlyphCollection();

        const strArr = [...str];

        for (let n = 0, width = 0; n < str.length; ++n) {
            const symbol = strArr[n];

            if (symbol === '\n') {
                width = 0;
                continue;
            }

            const glyph = ExceptionTrap
                .Try(SelfBind(fontGlyphCollection, 'Lookup'), symbol)
                .CatchFn(SelfBind(fontGlyphCollection, 'Lookup'), '?');

            if (width + glyph.width > this.outputTextList.Dimension.width) {
                width = 0;
                strArr.splice(n, 0, '\n');
            } else {
                width += glyph.width;
            }
        }

       return strArr.join('');
    }

    private RetrieveFontGlyphCollection(): FontGlyphCollection {
        if (this.fontGlyphCollection !== null && this.fontGlyphCollection.LineHeight === this.outputTextList.LineHeight) {
            return this.fontGlyphCollection;
        }

        this.fontGlyphCollection = this.fontGlyphCollectionFactory({ ASCIIRange: { Start: ' ', End: '~' }, Font: { Name: 'Roboto', Size: this.outputTextList.LineHeight } });

        return this.fontGlyphCollection;
    }
}

Inversify.bind<OutputControls>(OutputControls).toSelf().inSingletonScope();
