import { vec2 } from "gl-matrix";
import { injectable } from "inversify";

import { MouseButtons } from "@/lib/DOM/MouseButtons";
import { MathUtil } from "@/lib/math/MathUtil";
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

export interface MouseMovementEvent {
    startX: number;
    startY: number;
    movementX: number;
    movementY: number;
}

export interface MouseSelectEvent {
    offsetX: number;
    offsetY: number;
}

interface TouchTrace {
    id: number;
    x: number;
    y: number;
}

type OnPanFn = (e: MouseMovementEvent) => void;

class TouchPan {
    private touchPrev!: TouchTrace;

    constructor(private pan: OnPanFn) { }

    OnTouchStart(e: TouchEvent): void {
        const touch = e.targetTouches[0];
        this.touchPrev = {
            id: touch.identifier,
            x: touch.pageX,
            y: touch.pageY
        };
    }

    OnTouchMove(e: TouchEvent): void {
        if (e.targetTouches.item(0)?.identifier !== this.touchPrev.id) {
            return;
        }

        const touch = e.targetTouches[0];

        this.pan({
            startX: this.touchPrev.x * window.devicePixelRatio,
            startY: this.touchPrev.y * window.devicePixelRatio,
            movementX: (touch.pageX - this.touchPrev.x) * window.devicePixelRatio,
            movementY: (touch.pageY - this.touchPrev.y) * window.devicePixelRatio
        });

        this.touchPrev.x = touch.pageX;
        this.touchPrev.y = touch.pageY;
    }
}

type ZoomStartFn = () => void;

type ZoomProgressFn = (zoom: number) => void;

export class TouchZoom {
    private readonly prev: TouchTrace[] = [
        { id: -1, x: 0, y: 0 },
        { id: -1, x: 0, y: 0 }
    ];

    constructor(
        private zoomStart: ZoomStartFn,
        private zoomProgress: ZoomProgressFn
    ) { }

    public OnTouchStart(e: TouchEvent): void {
        if (e.targetTouches.length !== 2) {
            return;
        }

        this.zoomStart();

        this.UpdateTrace(e);
    }

    public OnTouchEnd(e: TouchEvent): void {
        [...e.targetTouches].forEach(touch => {
            const prevTouch = this.prev.find(x => x.id === touch.identifier);

            if (prevTouch) {
                prevTouch.id = -1;
            }
        });
    }

    public OnTouchMove(e: TouchEvent): void {
        if (
            e.targetTouches.length !== 2 ||
            !this.prev.every(trace => trace.id !== -1)
        ) {
            return;
        }

        e.preventDefault();

        const [p0, p1] = (
            e.targetTouches[0].identifier === this.prev[0].id
                ? [e.targetTouches[0], e.targetTouches[1]]
                : [e.targetTouches[1], e.targetTouches[0]]
        ).map(touch => ({ x: touch.pageX, y: touch.pageY }));

        const dist0 = MathUtil.Distance(this.prev[0], this.prev[1]);
        const dist1 = MathUtil.Distance(p0, p1);

        this.zoomProgress(dist0 / dist1);
    }

    private UpdateTrace(e: TouchEvent): void {
        for (let n = 0; n < e.targetTouches.length; ++n) {
            this.prev[n].id = e.targetTouches[n].identifier;
            this.prev[n].x = e.targetTouches[n].pageX;
            this.prev[n].y = e.targetTouches[n].pageY;
        }
    }
}

@injectable()
export abstract class AppEventTransformer {
    private readonly selectStrategy = new OnSelectStrategy(250, 3);

    private touchPan: TouchPan;
    private touchZoom: TouchZoom;

    constructor() {
        this.touchPan = new TouchPan((e: MouseMovementEvent) => this.OnPan(e));
        this.touchZoom = new TouchZoom(
            () => this.OnTouchZoomStart(),
            (zoom: number) => this.OnTouchZoom(zoom)
        );
    }

    OnMouseMove(e: MouseEvent): void {
        if (e.buttons & MouseButtons.Left) {
            this.OnPan({
                startX: e.offsetX * window.devicePixelRatio,
                startY: e.offsetY * window.devicePixelRatio,
                movementX: e.movementX * window.devicePixelRatio,
                movementY: e.movementY * window.devicePixelRatio
            });
        }
    }

    OnMouseDown(e: MouseEvent): void {
        this.selectStrategy.OnMouseDown(e);
    }

    OnMouseUp(e: MouseEvent): void {
        this.selectStrategy.OnMouseUp(e);

        if (this.selectStrategy.IsSelect) {
            this.OnSelect({
                offsetX: e.offsetX * window.devicePixelRatio,
                offsetY: e.offsetY * window.devicePixelRatio
            });
        }
    }

    OnTouchStart(e: TouchEvent): void {
        this.touchPan.OnTouchStart(e);
        this.touchZoom.OnTouchStart(e);
    }

    OnTouchMove(e: TouchEvent): void {
        this.touchPan.OnTouchMove(e);
        this.touchZoom.OnTouchMove(e);
    }

    OnTouchEnd(e: TouchEvent): void {
        this.touchZoom.OnTouchEnd(e);
    }

    abstract OnPan(e: MouseMovementEvent): void;

    abstract OnSelect(e: MouseSelectEvent): void;

    abstract OnTouchZoomStart(): void;

    abstract OnTouchZoom(zoom: number): void;
}
