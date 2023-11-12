import { UILabel } from "@/lib/UI/UILabel/UILabel";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRednerer";

export class OutputControls {
    private group!: UIObservablePositioningGroup;

    private outputLabel!: UILabel;

    constructor(private uiRenderer: UIRenderer) {
        this.group = new UIObservablePositioningGroup({ x: 10, y: 100 }, { vertical: VerticalAnchor.Bottom });

        this.outputLabel = this.uiRenderer.CreateLabel({ x: 0, y: 0 }, 1, '', 64, this.group);
    }

    get Output(): string {
        return this.outputLabel.Text;
    }

    set Output(text: string) {
        this.outputLabel.Text = text;
    }
}
