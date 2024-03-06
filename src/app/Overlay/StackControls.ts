import { inject, injectable } from "inversify";

import { AppSettings } from "../AppSettings";

import { Inversify } from "@/Inversify";
import { EscapeString } from "@/lib/font/EscapeString";
import { UIObservablePositioningGroup, VerticalAnchor } from "@/lib/UI/UIObservablePositioningGroup";
import { UIRenderer } from "@/lib/UI/UIRenderer";
import { UITextList } from "@/lib/UI/UITextList/UITextList";

@injectable()
export class StackControls {
    private group: UIObservablePositioningGroup;

    private stackTextList: UITextList;

    constructor(
        @inject(UIRenderer) private uiRenderer: UIRenderer,
        @inject(AppSettings) private settings: AppSettings) {
        this.group = new UIObservablePositioningGroup(
            {
                x: 10,
                y: 480
            },
            { vertical: VerticalAnchor.Top }
        );

        this.stackTextList = this.uiRenderer.CreateTextList(
            { x: 0, y: 0 },
            { width: 130, height: 300 },
            1,
            '',
            32,
            this.group);

        this.stackTextList.Visible = false;
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

    get Visible(): boolean {
        return this.stackTextList.Visible;
    }

    set Visible(visible: boolean) {
        this.stackTextList.Visible = visible;
    }
}

Inversify.bind(StackControls).toSelf().inSingletonScope();
