import { inject, injectable } from 'inversify';

import { UIComponent } from '../UIComponent';
import { Dimension } from '../UIIconButton/UIIconButton';
import { UILabel } from '../UILabel/UILabel';
import { UICreator } from '../UIRednerer';

import { UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from './UIAlert';
import FUIAlertPanel from './UIALertPanel.frag';
import VUIAlertPanel from './UIAlertPanel.vert';
import { UIObservableAlert } from './UIObservableAlert';

import { AppSettings } from '@/app/AppSettings';
import { InjectionToken } from '@/app/InjectionToken';
import { Inversify } from '@/Inversify';
import { EnumSize } from "@/lib/EnumSize";
import { MemoryPoolTracker } from '@/lib/MemoryPoolTracker';
import { Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';
import { TypeSizeResolver } from "@/lib/renderer/TypeSizeResolver";

enum UIAlertIconComponent { X, Y, Z, R, G, B, Ux, Uy };

enum UIAlertPanelComponent { X, Y, Z, R, G, B };

class UIALertIconRenderer extends PrimitiveBuilder {
    private static readonly IndicesPerPrimitive = 6;

    private static readonly AttributesPerComponent = EnumSize(UIAlertIconComponent) * UIALertIconRenderer.IndicesPerPrimitive;
}

@injectable()
export class UIAlertRenderer extends PrimitivesRenderer {
    private readonly IndicesPerPrimitive;

    private readonly AttributesPerComponent;

    private readonly zFarIncluded = 0.1;

    private uiRenderer!: UICreator;

    private settings: AppSettings;

    private alerts: UIObservableAlert[] = [];

    private vertexAttributesTracker: MemoryPoolTracker;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UIAlertPanelComponent);
        const indicesPerPrimitive = 6;

        super(gl,
            { fragment: FUIAlertPanel, vertex: VUIAlertPanel },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 0
            },
            {
                name: 'a_color',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 3 * floatSize
            }],
            { indicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.IndicesPerPrimitive = indicesPerPrimitive;
        this.AttributesPerComponent = EnumSize(UIAlertPanelComponent) * this.IndicesPerPrimitive;

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UIAlertRenderer) {
                const initialCapacity = 1;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.AttributesPerComponent * initialCapacity }, () => 0));
            }

            OnShrink(inUseIndices: number[]): void {
                const panelAttrs = new Array(this.renderer.AttributesPerComponent * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    for (let attribOffset = 0; attribOffset < this.renderer.AttributesPerComponent; ++attribOffset) {
                        panelAttrs[n * this.renderer.AttributesPerComponent + attribOffset] = this.renderer.attributes[offset * this.renderer.AttributesPerComponent + attribOffset];
                    }
                }

                this.renderer.UploadAttributes(panelAttrs);

                this.renderer.alerts.forEach(alert => {
                    const idx = inUseIndices.indexOf(alert.Offset);

                    if (idx === -1) {
                        throw new Error(`Can't find position for offset ${alert.Offset}`);
                    }

                    alert.Offset = idx;
                });
            }

            OnExtend(extendedCapacity: number): void {
                const extendedPanelAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.AttributesPerComponent },
                    (_, n) => n < this.renderer.attributes.length ? this.renderer.attributes[n] : 0);

                this.renderer.UploadAttributes(extendedPanelAttrs);
            }
        })(this);

        this.settings = Inversify.get(AppSettings);
    }

    Create(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        icon: UIAlertIconStyle,
        text: UIAlertText,
        style: UIAlertStyle,
        parent: UIComponent | null = null): UIAlert {

        const alertText = this.uiRenderer.CreateLabel(
            position,
            zIndex + 0.001,
            text.text,
            text.lineHeight,
            parent);

        const alert = new UIObservableAlert(
            position,
            dimension,
            zIndex,
            icon,
            text,
            style,
            this.vertexAttributesTracker.Allocate(),
            this.uiRenderer,
            (component: UIObservableAlert) => this.Destroy(component, alertText),
            parent);

        alert.Observable.Attach((component: UIObservableAlert) => this.UpdateComponent(component, alertText));

        this.alerts.push(alert);


        this.UpdateAttributes(alert);

        return alert;
    }

    get UIRenderer(): UICreator {
        return this.uiRenderer;
    }

    set UIRenderer(renderer: UICreator) {
        this.uiRenderer = renderer;
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    private UpdateComponent(component: UIObservableAlert, label: UILabel): void {
        label.Position = component.Position;
        label.Text = component.Text.text;
        label.LineHeight = component.Text.lineHeight;

        this.UpdateAttributes(component);
    }

    private UpdateAttributes(component: UIObservableAlert): void {
        this.UpdateComponentAttributes(
            this.ExtractPanelAttributes(component),
            component.Offset * this.AttributesPerComponent);
    }

    private ExtractPanelAttributes(component: UIObservableAlert): number[] {
        return PrimitiveBuilder.AABBRectangle(
            component.Position,
            component.Dimension,
            [
                [this.settings.ZFar - component.ZIndex - this.zFarIncluded],
                component.Style.fillColor
            ])
    }

    private Destroy(component: UIObservableAlert, alertText: UILabel): void {
        const toDestroyIdx = this.alerts.indexOf(component);

        if (toDestroyIdx === -1) {
            return;
        }

        this.alerts.splice(toDestroyIdx, 1)

        this.UpdateAttributes(component);

        this.vertexAttributesTracker.Free(component.Offset);

        alertText.Destroy();
    }
}

Inversify.bind(UIAlertRenderer).toSelf().inSingletonScope();
