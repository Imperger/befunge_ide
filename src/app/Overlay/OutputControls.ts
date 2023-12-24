import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextList } from "@/lib/UI/UITextList/UITextList";

export class OutputControls {
    private group!: UIObservablePositioningGroup;

    private outputTextList!: UITextList;

    private charactersPerLine = 24;

    constructor(private uiRenderer: UIRenderer) {
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

    private NewLineFormatter(str: string): string {
        return [...str]
            .reduce((out, char, n) => out + `${char}${(n !== 0 && n % this.charactersPerLine === 0 ? '\n' : '')}`, '');
    }
}
