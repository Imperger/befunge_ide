import { Intersection } from "../math/Intersection";
import { Vec2 } from "../Primitives";
import { Mat4 } from "../renderer/ShaderProgram";

import { Dimension, UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton/UIIconButton";
import { UIIconButtonRenderer } from "./UIIconButton/UIIconButtonRenderer";
import { TouchCallback } from "./UIIconButton/UIObservableIconButton";

export class UIRenderer {
    private iconButtonsRenderer!: UIIconButtonRenderer;

    private iconButtons: UIIconButton[] = [];

    private constructor(private gl: WebGL2RenderingContext) { }

    static async Create(gl: WebGL2RenderingContext, zFar: number): Promise<UIRenderer> {
        const renderer = new UIRenderer(gl);

        renderer.iconButtonsRenderer = await UIIconButtonRenderer.Create(gl, zFar)

        return renderer;
    }

    CreateButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle,
        touchCallback: TouchCallback): UIIconButton {
        const iconButton = this.iconButtonsRenderer.Create(position, dimension, zIndex, style, iconStyle, touchCallback);

        this.iconButtons.push(iconButton);

        return iconButton;
    }

    Touch(e: MouseEvent): boolean {
        return this.TouchButtons(e.offsetX, this.gl.canvas.height - e.offsetY) || false;
    }

    private TouchButtons(x: number, y: number): boolean {
        const intersected = this.iconButtons
            .filter(btn => Intersection.AABBRectanglePoint(
                { x: btn.Position.x, y: btn.Position.y, width: btn.Dimension.width, height: btn.Dimension.height },
                { x, y }))
            .sort((a, b) => b.ZIndex - a.ZIndex);

        if (intersected.length === 0) {
            return false;
        }

        intersected[0].Touch();

        return true;
    }


    Draw(): void {
        this.iconButtonsRenderer.Draw();
    }

    set ViewProjection(projection: Mat4 | Float32Array) {
        this.iconButtonsRenderer.ViewProjection = projection;
    }
}