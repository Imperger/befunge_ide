import { UIEditableTextList } from "@/lib/UI/UIEditableTextList/UIEditableTextList";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";

export class InputControls {
    private group: UIObservablePositioningGroup;

    private input: UIEditableTextList;

    constructor(private uiRenderer: UIRenderer) {
        const margin = 10;

        this.group = new UIObservablePositioningGroup(
            { x: 145 + 800 + margin, y: 10 },
            { vertical: VerticalAnchor.Bottom });

        this.input = this.uiRenderer.CreateEditableTextList(
            { x: 0, y: 0 },
            { width: 800, height: 200 },
            1,
            '',
            64,
            this.group
        );
    }

    Resize(): void {
        this.group.Resize();
    }

    get Text(): string {
        return this.input.Text;
    }
}
