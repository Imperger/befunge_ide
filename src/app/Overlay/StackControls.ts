import { EscapeString } from "@/lib/font/EscapeString";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextList } from "@/lib/UI/UITextList/UITextList";

export class StackControls {
    private group: UIObservablePositioningGroup;

    private stackTextList: UITextList;

    constructor(private uiRenderer: UIRenderer) {
        this.group = new UIObservablePositioningGroup(
            {
                x: 10,
                y: 650
            },
            { vertical: VerticalAnchor.Top }
        );

        this.stackTextList = this.uiRenderer.CreateTextList(
            { x: 0, y: 0 },
            { width: 130, height: 300 },
            1,
            '',
            32,
            this.group
        );
    }

    ScrollToTop(): void {
        this.stackTextList.ScrollToTop();
    }

    Resize(): void {
        this.group.Resize();
    }

    set Stack(stack: number[]) {
        this.stackTextList.Text = [...stack]
            .reverse()
            .map(x => `${x} (${EscapeString(String.fromCharCode(x))})`)
            .join('\n')
    }
}
