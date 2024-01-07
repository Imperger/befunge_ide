import { vec2 } from "gl-matrix";
import { injectable } from "inversify";

import { MouseButtons } from "@/lib/DOM/MouseButtons";
import { Vec2 } from "@/lib/Primitives";

class OnSelectStrategy {
    private mouseDownStart = 0;
    private lastMouseDownPosition: Vec2 = { x: 0, y: 0 };

    private isSelect = false;

    constructor(
        private releaseTimeout: number,
        private maxDistance: number) { }

    OnMouseDown(e: MouseEvent): void {
        this.mouseDownStart = Date.now();
        this.lastMouseDownPosition.x = e.offsetX;
        this.lastMouseDownPosition.y = e.offsetY;
    }

    OnMouseUp(e: MouseEvent): void {
        const distance = vec2.dist(
            [this.lastMouseDownPosition.x, this.lastMouseDownPosition.y],
            [e.offsetX, e.offsetY]);

        const elapsedTime = Date.now() - this.mouseDownStart;

        this.isSelect = distance <= this.maxDistance && elapsedTime <= this.releaseTimeout;
    }

    get IsSelect(): boolean {
        return this.isSelect;
    }
}

@injectable()
export abstract class AppEventTransformer {
    private readonly selectStrategy = new OnSelectStrategy(250, 3);

    OnMouseMove(e: MouseEvent): void {
        if (e.buttons & MouseButtons.Left) {
            this.OnCameraMove(e);
        }
    }

    OnMouseDown(e: MouseEvent): void {
        this.selectStrategy.OnMouseDown(e);
    }

    OnMouseUp(e: MouseEvent): void {
        this.selectStrategy.OnMouseUp(e);

        if (this.selectStrategy.IsSelect) {
            this.OnSelect(e);
        }
    }

    OnWheel(e: WheelEvent): void {
        this.OnZoom(e);
    }

    abstract OnCameraMove(e: MouseEvent): void;

    abstract OnSelect(e: MouseEvent): void;

    abstract OnZoom(e: WheelEvent): void;
}
