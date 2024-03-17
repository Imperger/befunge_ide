import { vec2 } from "gl-matrix";

import { ArrayHelper } from "../ArrayHelper";
import { Vec2 } from "../Primitives";

import { MathUtil } from "./MathUtil";

export interface Rectangle {
    lb: Vec2;
    rt: Vec2;
}

interface DistanceDiffResult {
    distance: number;
    diff: vec2;
}

export class Transformation {
    static MoveRectangleToPlaceInsideRectangle(movable: Rectangle, destination: Rectangle): Vec2 {
        const betweenByX = MathUtil.Between(movable.lb.x, destination.lb.x, destination.rt.x) &&
            MathUtil.Between(movable.rt.x, destination.lb.x, destination.rt.x);

        const betweenByY = MathUtil.Between(movable.lb.y, destination.lb.y, destination.rt.y) &&
            MathUtil.Between(movable.rt.y, destination.lb.y, destination.rt.y);

        if (betweenByX && betweenByY) return { x: 0, y: 0 };

        if (betweenByX) {
            const distanceToTop = Math.abs(movable.rt.y - destination.rt.y);
            const distanceToBottom = Math.abs(movable.lb.y - destination.lb.y);
            return {
                x: 0,
                y: distanceToTop < distanceToBottom ? -distanceToTop : distanceToBottom
            };
        }

        if (betweenByY) {
            const distanceToLeft = Math.abs(movable.lb.x - destination.lb.x);
            const distanceToRight = Math.abs(movable.rt.x - destination.rt.x);
            return {
                x: distanceToLeft < distanceToRight ? distanceToLeft : -distanceToRight,
                y: 0
            };
        }

        const corners = [
            Transformation.DistanceDiff(
                vec2.fromValues(movable.lb.x, movable.lb.y),
                vec2.fromValues(destination.lb.x, destination.lb.y)),
            Transformation.DistanceDiff(
                vec2.fromValues(movable.lb.x, movable.rt.y),
                vec2.fromValues(destination.lb.x, destination.rt.y)),
            Transformation.DistanceDiff(
                vec2.fromValues(movable.rt.x, movable.rt.y),
                vec2.fromValues(destination.rt.x, destination.rt.y)),
            Transformation.DistanceDiff(
                vec2.fromValues(movable.rt.x, movable.lb.y),
                vec2.fromValues(destination.rt.x, destination.lb.y))
        ];

        const closest = ArrayHelper.Min(corners, (a, b) => a.distance < b.distance);

        return { x: closest.diff[0], y: closest.diff[1] };
    }

    static ShortestMoveForIntersection(movable: Rectangle, destination: Rectangle): Vec2 {
        const leftToRight = destination.rt.x - movable.lb.x;
        const rightToLeft = destination.lb.x - movable.rt.x;

        const bottomToTop = destination.rt.y - movable.lb.y;
        const topToBottom = destination.lb.y - movable.rt.y;

        const intersectByX = !(leftToRight < 0 || rightToLeft > 0);
        const intersectByY = !(bottomToTop < 0 || topToBottom > 0);

        if (intersectByX && intersectByY) {
            return { x: 0, y: 0 };
        }

        const x = leftToRight < 0 ?
            leftToRight :
            rightToLeft > 0 ?
                rightToLeft :
                0;

        const y = bottomToTop < 0 ?
            bottomToTop :
            topToBottom > 0 ?
                topToBottom :
                0;


        return { x, y };
    }

    private static DistanceDiff(a: vec2, b: vec2): DistanceDiffResult {
        return {
            distance: vec2.distance(a, b),
            diff: vec2.sub(vec2.create(), b, a)
        };
    }
}
