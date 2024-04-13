import { inject, injectable } from 'inversify';

import { UIIconAtlas } from '../UIIcon';
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
import { ArrayHelper } from '@/lib/ArrayHelper';
import { MemoryPoolTracker } from '@/lib/MemoryPoolTracker';
import { Vec2 } from '@/lib/Primitives';
import { PrimitiveBuilder } from '@/lib/renderer/PrimitiveBuilder';
import { PrimitivesRenderer } from "@/lib/renderer/PrimitivesRenderer";
import { Mat4 } from '@/lib/renderer/ShaderProgram';


@injectable()
class UIAlertIconRenderer extends PrimitivesRenderer {
    constructor(@inject(InjectionToken.WebGLRenderingContext) gl: WebGL2RenderingContext) {

        super(gl,
            { fragment: FUIALertIcon, vertex: VUIAlertIcon },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_fillColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_iconColor',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_icon',
                size: 2,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES });
    }

    set ViewProjection(mat: Mat4 | Float32Array) {
        this.shader.SetUniformMatrix4fv('u_viewProject', mat);
    }
}

Inversify.bind(UIAlertIconRenderer).toSelf().inSingletonScope();

@injectable()
export class UIAlertRenderer extends PrimitivesRenderer {
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

        super(gl,
            { fragment: FUIAlertPanel, vertex: VUIAlertPanel },
            [{
                name: 'a_vertex',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            },
            {
                name: 'a_color',
                size: 3,
                type: gl.FLOAT,
                normalized: false
            }],
            { indicesPerPrimitive: 6, basePrimitiveType: gl.TRIANGLES });

        this.vertexAttributesTracker = new (class extends MemoryPoolTracker {
            constructor(private renderer: UIAlertRenderer) {
                const initialCapacity = 1;
                super(initialCapacity);

                renderer.UploadAttributes(Array.from({ length: renderer.ComponentsPerPrimitive * initialCapacity }, () => 0));
                renderer.alertIcon.UploadAttributes(Array.from({ length: this.renderer.alertIcon.ComponentsPerPrimitive * initialCapacity }, () => 0));
            }

            OnShrink(inUseIndices: number[]): void {
                const panelAttrs = new Array(this.renderer.ComponentsPerPrimitive * inUseIndices.length).fill(0);
                const alertIconComponents = new Array(this.renderer.alertIcon.ComponentsPerPrimitive * inUseIndices.length).fill(0);

                for (let n = 0; n < inUseIndices.length; ++n) {
                    const offset = inUseIndices[n];

                    const panelComponents = this.renderer.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        panelAttrs,
                        n * this.renderer.ComponentsPerPrimitive,
                        panelComponents,
                        0,
                        panelComponents.length);


                    const alertIconComponents = this.renderer.alertIcon.PrimitiveComponents(offset);
                    ArrayHelper.Copy(
                        alertIconComponents,
                        n * this.renderer.alertIcon.ComponentsPerPrimitive,
                        alertIconComponents,
                        0,
                        alertIconComponents.length);
                }

                this.renderer.UploadAttributes(panelAttrs);
                this.renderer.alertIcon.UploadAttributes(alertIconComponents);

                this.renderer.alerts.forEach(alert => {
                    const idx = inUseIndices.indexOf(alert.Offset);

                    if (idx === -1) {
                        throw new Error(`Can't find position for offset ${alert.Offset}`);
                    }

                    alert.Offset = idx;
                });
            }

            OnExtend(extendedCapacity: number): void {
                const panelComponents = this.renderer.PrimitiveComponentsRange(0, this.renderer.TotalPrimitives);

                const extendedPanelAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.ComponentsPerPrimitive },
                    (_, n) => n < panelComponents.length ? panelComponents[n] : 0);

                this.renderer.UploadAttributes(extendedPanelAttrs);


                const alertIconsComponents = this.renderer.PrimitiveComponentsRange(0, this.renderer.TotalPrimitives);

                const extendedAlertIconAttrs = Array.from(
                    { length: extendedCapacity * this.renderer.alertIcon.ComponentsPerPrimitive },
                    (_, n) => n < alertIconsComponents.length ? alertIconsComponents[n] : 0);

                this.renderer.alertIcon.UploadAttributes(extendedAlertIconAttrs);
            }
        })(this);
    }

    Create(position: Vec2,
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

        const iconSideLength = alertText.Dimension.height / alertText.Scale;
        const alert = new UIObservableAlert(
            position,
            {
                width: iconSideLength + 3 * this.iconMargin + alertText.Dimension.width / alertText.Scale,
                height: iconSideLength + 2 * this.iconMargin
            },
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
            x: component.Position.x + 2 * this.iconMargin + (component.Dimension.height / component.Scale - 2 * this.iconMargin),
            y: component.Position.y + (component.Dimension.height / component.Scale - label.Dimension.height / label.Scale) / 2
        };
    }

    private UpdateAttributes(component: UIObservableAlert): void {
        this.UpdatePrimitiveComponents(
            this.ExtractPanelAttributes(component),
            component.Offset * this.ComponentsPerPrimitive);

        if (component.IsDestroyed) {
            const emptyAttrs = new Array(this.alertIcon.ComponentsPerPrimitive).fill(0);

            this.alertIcon.UpdatePrimitiveComponents(
                emptyAttrs,
                component.Offset * this.alertIcon.ComponentsPerPrimitive);
        } else {
            this.alertIcon.UpdatePrimitiveComponents(
                this.ExtractIconAttributes(component),
                component.Offset * this.alertIcon.ComponentsPerPrimitive);
        }
    }

    private ExtractPanelAttributes(component: UIObservableAlert): number[] {
        return PrimitiveBuilder.AABBRectangle(
            component.AbsolutePosition,
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
