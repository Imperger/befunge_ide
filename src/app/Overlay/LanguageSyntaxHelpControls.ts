import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";
import { InjectionToken } from "../InjectionToken";

import { Inversify } from "@/Inversify";
import { ArrayHelper } from "@/lib/ArrayHelper";
import { ExceptionTrap } from "@/lib/ExceptionTrap";
import { FontGlyphCollectionFactory } from "@/lib/font/FontGlyphCollection";
import { Rgb } from "@/lib/Primitives";
import { SelfBind } from "@/lib/SelfBind";
import { HorizontalAnchor, UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextList } from "@/lib/UI/UITextList/UITextList";

@injectable()
export class LanguageSyntaxHelpControls {
    private group: UIObservablePositioningGroup;
    private display: UITextList | null = null;
    private lineHeight = 24;
    private maxWidth = 1024;
    private defaultTextColor: Rgb = [0.9254901960784314, 0.9411764705882353, 0.9450980392156862];
    private helpString!: string;
    private instructionPaddingEnd!: number;

    constructor(
        @inject(AppSettings) private settings: AppSettings,
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(InjectionToken.FontGlyphCollectionFactory) private fontGlyphCollectionFactory: FontGlyphCollectionFactory) {
        this.group = new UIObservablePositioningGroup(
            { x: 0, y: 0 },
            { vertical: VerticalAnchor.Bottom, horizontal: HorizontalAnchor.Middle });

        this.BuildHelpString();
    }

    private BuildHelpString(): void {
        const instructions = [
            { instruction: '0-9', description: 'Push this number onto the stack.' },
            { instruction: '+', description: 'Addition: Pop a and b, then push a+b.' },
            { instruction: '-', description: 'Subtraction: Pop a and b, then push b-a.' },
            { instruction: '*', description: 'Multiplication: Pop a and b, then push a*b.' },
            { instruction: '/', description: 'Integer division: Pop a and b, then push b/a, rounded towards 0.' },
            { instruction: '%', description: 'Modulo: Pop a and b, then push the remainder of the integer division of b/a.' },
            { instruction: '!', description: 'Logical NOT: Pop a value. If the value is zero, push 1; otherwise, push zero.' },
            { instruction: '`', description: 'Greater than: Pop a and b, then push 1 if b>a, otherwise zero.' },
            { instruction: '>', description: 'Start moving right.' },
            { instruction: '<', description: 'Start moving left.' },
            { instruction: '^', description: 'Start moving up.' },
            { instruction: 'v', description: 'Start moving down.' },
            { instruction: '?', description: 'Start moving in a random cardinal direction.' },
            { instruction: '_', description: 'Pop a value; move right if value=0, left otherwise.' },
            { instruction: '|', description: 'Pop a value; move down if value=0, up otherwise.' },
            { instruction: '"', description: 'Start string mode: push each character\'s ASCII value all the way up to the next "' },
            { instruction: ':', description: 'Duplicate value on top of the stack.' },
            { instruction: '\\', description: 'Swap two values on top of the stack.' },
            { instruction: '$', description: 'Pop value from the stack and discard it.' },
            { instruction: '.', description: 'Pop value and output as an integer followed by a space.' },
            { instruction: ',', description: 'Pop value and output as ASCII character.' },
            { instruction: '#', description: 'Bridge: Skip next cell.' },
            { instruction: 'p', description: 'A "put" call (a way to store a value for later use). Pop y, x, and v, then change the character at (x,y) in the program to the character with ASCII value v' },
            { instruction: 'g', description: 'A "get" call (a way to retrieve data in storage). Pop y and x, then push ASCII value of the character at that position in the program.' },
            { instruction: '&', description: 'Ask user for a number and push it.' },
            { instruction: '~', description: 'Ask user for a character and push its ASCII value.' },
            { instruction: '@', description: 'End program.' },
            { instruction: '" "', description: 'No-op. Does nothing' }
        ];

        this.instructionPaddingEnd = ArrayHelper
            .Max(instructions, (a, b) => a.instruction.length < b.instruction.length)
            .instruction.length;

        this.helpString = instructions
            .map(x => ` ${x.instruction.padEnd(this.instructionPaddingEnd)} ${x.description}`)
            .join('\n');
    }

    private NewLineFormatter(str: string): string {
        const fontGlyphCollection = this.fontGlyphCollectionFactory(
            {
                ASCIIRange: { Start: ' ', End: '~' },
                Font: { Name: 'Roboto', Size: this.lineHeight * this.group.Scale }
            });

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
            if (width + glyph.width > this.display!.Dimension.width) {
                width = padding;
                strArr.splice(n, 0, ...['\n', ' '.repeat(this.instructionPaddingEnd + 2)]);
            } else {
                width += glyph.width;
            }
        }

        return strArr.join('');
    }

    ToggleHelp(): void {
        if (this.display === null) {
            this.display = this.uiRenderer.CreateTextList(
                { x: 0, y: 0 },
                {
                    width: Math.min(this.maxWidth, this.settings.ViewDimension.Width) / this.group.Scale,
                    height: this.settings.ViewDimension.Height / this.group.Scale * 0.75
                },
                1,
                '',
                this.lineHeight,
                this.group);

            this.display.Text = this.NewLineFormatter(this.helpString)
        } else {
            this.display.Destroy();
            this.display = null;
        }
    }
}

Inversify.bind(LanguageSyntaxHelpControls).toSelf().inSingletonScope();
