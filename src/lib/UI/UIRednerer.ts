import { ArrayHelper } from "../ArrayHelper";
import { Intersection } from "../math/Intersection";
import { Vec2 } from "../Primitives";
import { Mat4 } from "../renderer/ShaderProgram";

import { UIComponent } from "./UIComponent";
import { Dimension, UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton/UIIconButton";
import { UIIconButtonRenderer } from "./UIIconButton/UIIconButtonRenderer";
import { TouchCallback } from "./UIIconButton/UIObservableIconButton";

export class UIRenderer {
    private iconButtonsRenderer!: UIIconButtonRenderer;

    private constructor(private gl: WebGL2RenderingContext) {
        this.labelsRenderer = new UILabelRenderer(gl);
    }

    static async Create(gl: WebGL2RenderingContext): Promise<UIRenderer> {
        const renderer = new UIRenderer(gl);

        renderer.iconButtonsRenderer = await UIIconButtonRenderer.Create(gl);

        return renderer;
    }

    CreateButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback,
        parent: UIComponent | null = null): UIIconButton {
        const iconButton = this.iconButtonsRenderer.Create(position, dimension, zIndex, style, iconStyle, touchCallback, parent);

        return iconButton;
    }

    Touch(e: MouseEvent): boolean {
        return this.TouchButtons(e.offsetX, this.gl.canvas.height - e.offsetY) || false;
    }

    private TouchButtons(x: number, y: number): boolean {
        const intersected = this.iconButtonsRenderer.IconButtons
            .filter(btn => Intersection.AABBRectanglePoint(
                { x: btn.AbsolutePosition.x, y: btn.AbsolutePosition.y, width: btn.Dimension.width, height: btn.Dimension.height },
                { x, y }));

        if (intersected.length === 0) {
            return false;
        }

        ArrayHelper
            .Max(intersected, (a: UIIconButton, b: UIIconButton) => a.ZIndex < b.ZIndex)
            .Touch();

        return true;
    }


    Draw(): void {
        this.iconButtonsRenderer.Draw();
    }

    set ViewProjection(projection: Mat4 | Float32Array) {
        this.iconButtonsRenderer.ViewProjection = projection;
    }
}