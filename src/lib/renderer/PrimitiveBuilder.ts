import { Vec2 } from "../Primitives";

interface Dimension {
    width: number;
    height: number;
}

interface ObjectAttribute {
    LeftBottom: number[];
    LeftTop: number[];
    RightTop: number[];
    RightBottom: number[];
}

type Attribute = number[] | ObjectAttribute;

export class PrimitiveBuilder {
    static AABBRectangle(
        position: Vec2,
        dimension: Dimension,
        attributes: Attribute[]
    ): number[] {
        const leftBottom = [position.x, position.y];
        const leftTop = [position.x, position.y + dimension.height];
        const rightTop = [position.x + dimension.width, position.y + dimension.height];
        const rightBottom = [position.x + dimension.width, position.y];

        for (const attr of attributes) {
            if (Array.isArray(attr)) {
                leftBottom.push(...attr);
                leftTop.push(...attr);
                rightTop.push(...attr);
                rightBottom.push(...attr);
            } else {
                leftBottom.push(...attr.LeftBottom);
                leftTop.push(...attr.LeftTop);
                rightTop.push(...attr.RightTop);
                rightBottom.push(...attr.RightBottom);
            }
        }

        return [
            ...leftBottom,
            ...rightTop,
            ...leftTop,
            ...leftBottom,
            ...rightBottom,
            ...rightTop
        ];
    }

    static AABBFrame(
        position: Vec2,
        dimension: Dimension,
        borderWidth: number,
        attributes: Attribute[]): number[] {
        const borderTop = PrimitiveBuilder.AABBRectangle(
            { x: position.x, y: position.y + dimension.height - borderWidth },
            { width: dimension.width, height: borderWidth },
            attributes
        );

        const borderRight = PrimitiveBuilder.AABBRectangle(
            { x: position.x + dimension.width - borderWidth, y: position.y },
            { width: borderWidth, height: dimension.height - borderWidth },
            attributes
        );

        const borderBottom = PrimitiveBuilder.AABBRectangle(
            { x: position.x, y: position.y },
            { width: dimension.width - borderWidth, height: borderWidth },
            attributes
        );

        const borderLeft = PrimitiveBuilder.AABBRectangle(
            { x: position.x, y: position.y + borderWidth },
            { width: borderWidth, height: dimension.height - 2 * borderWidth },
            attributes
        );

        return [
            ...borderTop,
            ...borderRight,
            ...borderBottom,
            ...borderLeft
        ];
    }
}
