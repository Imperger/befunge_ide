import { inject, injectable } from 'inversify';

import { UIIconAtlas } from '../UIIcon';
import { Dimension } from '../UIIconButton/UIIconButton';
import { UILabel } from '../UILabel/UILabel';
import { UIObservablePositioningGroup } from '../UIObservablePositioningGroup';
import { UICreator } from '../UIRenderer';

import { UIAlert, UIAlertIconStyle, UIAlertStyle, UIAlertText } from './UIAlert';
import FUIALertIcon from './UIALertIcon.frag';
import VUIAlertIcon from './UIAlertIcon.vert';
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

enum UIAlertIconComponent { X, Y, Z, fillR, fillG, fillB, iconR, iconG, iconB, Ux, Uy };

enum UIAlertPanelComponent { X, Y, Z, R, G, B };

@injectable()
class UIAlertIconRenderer extends PrimitivesRenderer {
    public readonly IndicesPerPrimitive = 6;

    public readonly AttributesPerComponent;

    constructor(@inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext) {
        const floatSize = TypeSizeResolver.Resolve(gl.FLOAT);
        const stride = floatSize * EnumSize(UIAlertPanelComponent);
        const indicesPerPrimitive = 6;

        super(gl,
            { fragment: FUIALertIcon, vertex: VUIAlertIcon },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 0
            },
            {
                name: 'a_fillColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 3 * floatSize
            },
            {
                name: 'a_iconColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 6 * floatSize
            },
            {
                name: 'a_icon',
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride,
                offset: 9 * floatSize
            }],
            { indicesPerPrimitive, basePrimitiveType: gl.TRIANGLES });

        this.IndicesPerPrimitive = indicesPerPrimitive;
        this.AttributesPerComponent = EnumSize(UIAlertIconComponent) * this.IndicesPerPrimitive;
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }

    get Attributes(): Float32Array {
        return this.attributes;
    }

}

Inversify.bind(UIAlertIconRenderer).toSelf().inSingletonScope();

@injectable()
export class UIAlertRenderer extends PrimitivesRenderer {
    private readonly IndicesPerPrimitive;

    private readonly AttributesPerComponent;

    private readonly zFarIncluded = 0.1;

    private uiRenderer!: UICreator;

    private alerts: UIObservableAlert[] = [];

    private vertexAttributesTracker: MemoryPoolTracker;

    private panelContentZOffset = 0.001;

    private readonly iconMargin = 10;

    constructor(
        @inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext,
        @inject(UIAlertIconRenderer) private alertIcon: UIAlertIconRenderer,
        @inject(InjectionToken.IconAtlas) private iconAtlas: UIIconAtlas,
        @inject(InjectionToken.IconAtlasTexture) private iconAtlasTexture: WebGLTexture,
        @inject(AppSettings) private settings: AppSettings) {
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
                renderer.alertIcon.UploadAttributes(Array.from({ length: this.renderer.alertIcon.AttributesPerComponent * initialCapacity }, () => 0));
            }

            OnShrink(inUseIndices: number[]): void {
                const panelAttrs = new Array(this.renderer.AttributesPerComponent * inUseIndices.length).fill(0);
                const buttonOutlineAttrs = new Array(this.renderer.alertIcon.AttributesPerComponent * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    for (let attribOffset = 0; attribOffset < this.renderer.AttributesPerComponent; ++attribOffset) {
                        panelAttrs[n * this.renderer.AttributesPerComponent + attribOffset] = this.renderer.attributes[offset * this.renderer.AttributesPerComponent + attribOffset];
                    }

                    for (let attribOffset = 0; attribOffset < this.renderer.alertIcon.AttributesPerComponent; ++attribOffset) {
                        buttonOutlineAttrs[n * this.renderer.alertIcon.AttributesPerComponent + attribOffset] = this.renderer.alertIcon.Attributes[offset * this.renderer.alertIcon.AttributesPerComponent + attribOffset];
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

                const extendedAlertIconAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.alertIcon.AttributesPerComponent },
                    (_, n) => n < this.renderer.alertIcon.Attributes.length ? this.renderer.alertIcon.Attributes[n] : 0);

                this.renderer.alertIcon.UploadAttributes(extendedAlertIconAttrs);
            }
        })(this);
    }

    Create(position: Vec2,
        dimension: Dimension,
        zIndex: number,
        icon: UIAlertIconStyle,
        text: UIAlertText,
        style: UIAlertStyle,
        parent: UIObservablePositioningGroup | null = null): UIAlert {

        const alertText = this.uiRenderer.CreateLabel(
            position,
            zIndex + this.panelContentZOffset,
            text.text,
            text.lineHeight,
            parent);
        alertText.StyleRange(0, alertText.Text.length, { color: text.color })

        const alert = new UIObservableAlert(
            position,
            dimension,
            zIndex,
            icon,
            text,
            style,
            this.vertexAttributesTracker.Allocate(),
            (component: UIObservableAlert) => this.Destroy(component, alertText),
            parent);

        if (parent !== null) {
            parent.AppendChild(alert);
        }

        alert.Observable.Attach((component: UIObservableAlert) => this.UpdateComponent(component, alertText));

        this.alerts.push(alert);

        this.UpdateComponent(alert, alertText);

        return alert;
    }

    public Draw(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.iconAtlasTexture);

        super.Draw();
        this.alertIcon.Draw();
    }

    get UIRenderer(): UICreator {
        return this.uiRenderer;
    }

    set UIRenderer(renderer: UICreator) {
        this.uiRenderer = renderer;
    }

    get Alerts(): readonly UIAlert[] {
        return this.alerts;
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
        this.alertIcon.ViewProjection = mat;
    }

    private UpdateComponent(component: UIObservableAlert, label: UILabel): void {
        label.Position = this.LabelPosition(component, label);
        label.Text = component.Text.text;
        label.LineHeight = component.Text.lineHeight;
        this.UpdateAttributes(component);
    }

    private LabelPosition(component: UIObservableAlert, label: UILabel): Vec2 {
        return {
            x: component.Position.x + 2 * this.iconMargin + this.AlertIconSideLength(component),
            y: component.Position.y + component.Dimension.height / 2 - label.Dimension.height / 2
        };
    }

    private UpdateAttributes(component: UIObservableAlert): void {
        this.UpdateComponentAttributes(
            this.ExtractPanelAttributes(component),
            component.Offset * this.AttributesPerComponent);

        if (component.IsDestroyed) {
            const emptyAttrs = new Array(this.IndicesPerPrimitive * EnumSize(UIAlertIconComponent)).fill(0);

            this.alertIcon.UpdateComponentAttributes(
                emptyAttrs,
                component.Offset * this.alertIcon.AttributesPerComponent);
        } else {
            this.alertIcon.UpdateComponentAttributes(
                this.ExtractIconAttributes(component),
                component.Offset * this.alertIcon.AttributesPerComponent);
        }
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

    private ExtractIconAttributes(component: UIObservableAlert): number[] {
        const sideLength = this.AlertIconSideLength(component);
        const iconUV = this.iconAtlas.LookupUV(component.Icon.icon);

        return PrimitiveBuilder.AABBRectangle(
            { x: component.AbsolutePosition.x + this.iconMargin, y: component.AbsolutePosition.y + this.iconMargin },
            { width: sideLength, height: sideLength },
            [
                [this.settings.ZFar - component.ZIndex - this.panelContentZOffset - this.zFarIncluded],
                component.Style.fillColor,
                component.Icon.color,
                {
                    LeftBottom: [iconUV.A.x, iconUV.B.y],
                    LeftTop: [iconUV.A.x, iconUV.A.y],
                    RightTop: [iconUV.B.x, iconUV.A.y],
                    RightBottom: [iconUV.B.x, iconUV.B.y]
                }
            ]);
    }

    private AlertIconSideLength(component: UIObservableAlert): number {
        return component.Dimension.height - 2 * this.iconMargin;
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
