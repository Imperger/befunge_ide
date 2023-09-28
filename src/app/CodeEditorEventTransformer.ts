import { MouseButtons } from "@/lib/DOM/MouseButtons";

export abstract class CodeEditorEventTransformer {
    private isMovement = false;

    OnMouseMove(e: MouseEvent): void {
        if (e.buttons & MouseButtons.Left) {
            this.isMovement = true;

            this.OnCameraMove(e);
        }
    }

    OnMouseDown(_e: MouseEvent): void {
        this.isMovement = false;
    }

    OnMouseUp(e: MouseEvent): void {
        if (!this.isMovement) {
            this.OnSelect(e);
        }
    }

    OnWheel(e: WheelEvent): void {
        this.OnZoom(e);
    }

    OnKeyDown(e: KeyboardEvent): void {
        const keyCode = e.key.charCodeAt(0);

        if (e.key.length === 1 && keyCode >= ' '.charCodeAt(0) && keyCode <= '~'.charCodeAt(0)) {
            this.OnCellInput(e);
        }
    }

    abstract OnCameraMove(e: MouseEvent): void;

    abstract OnSelect(e: MouseEvent): void;

    abstract OnZoom(e: WheelEvent): void;

    abstract OnCellInput(e: KeyboardEvent): void;
}
