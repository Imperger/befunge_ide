import { Vec2 } from "../Primitives";
import { Mat4 } from "../renderer/ShaderProgram";

import { Dimension, UIButtonStyle, UIIconButton, UIIconStyle } from "./UIIconButton/UIIconButton";
import { UIIconButtonRenderer } from "./UIIconButton/UIIconButtonRenderer";

export class UIRenderer {
    private buttons!: UIIconButtonRenderer;

    private constructor(private gl: WebGL2RenderingContext) { }

    static async Create(gl: WebGL2RenderingContext, zFar: number): Promise<UIRenderer> {
        const renderer = new UIRenderer(gl);

        renderer.buttons = await UIIconButtonRenderer.Create(gl, zFar)

        return renderer;
    }

    CreateButton(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        style: UIButtonStyle,
        iconStyle: UIIconStyle): UIIconButton {
        return this.buttons.Create(position, dimension, zIndex, style, iconStyle);
    }

    Draw(): void {
        this.buttons.Draw();
    }

    set ViewProjection(projection: Mat4 | Float32Array) {
        this.buttons.ViewProjection = projection;
    }
}