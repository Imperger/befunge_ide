import { Vec2 } from "../Primitives";

export interface Rectangle {
    width: number;
    height: number;
}

interface PackageItem<TRectangle extends Rectangle> {
    target: TRectangle;
    position: Vec2;
}

interface Dimension {
    width: number;
    height: number;
}

export interface Package<TRectangle extends Rectangle> {
    items: PackageItem<TRectangle>[];
    dimension: Dimension;
}

export class RectangleRowPacker<TRectangle extends Rectangle> {
    private rectangles: TRectangle[] = [];

    Add(rectangle: TRectangle): void {
        this.rectangles.push(rectangle);
    }

    Pack(): Package<TRectangle> {
        let idealArea = 0;
        let maxWidth = 0;
        for (const rect of this.rectangles) {
            idealArea += rect.width * rect.height;
            maxWidth = Math.max(maxWidth, rect.width);
        }

        const estimatedWidth = Math.max(Math.ceil(Math.sqrt(idealArea)), maxWidth);

        this.rectangles.sort((a, b) => b.height - a.height);

        const pack: PackageItem<TRectangle>[] = [];
        let maxHeightInRow = 0;
        let x = 0, y = 0;
        for (const rect of this.rectangles) {
            if (x + rect.width > estimatedWidth) {
                x = 0;
                y += maxHeightInRow;
                maxHeightInRow = 0;
            }

            pack.push({ target: rect, position: { x, y } });

            maxHeightInRow = Math.max(maxHeightInRow, rect.height);
            x += rect.width;
        }

        return { items: pack, dimension: { width: estimatedWidth, height: y + maxHeightInRow } };
    }
}

/* class RectanglePacker<TRectangle extends Rectangle> {
    private rectangles: Rectangle[] = [];

    Add(rectangle: Rectangle): void {
        this.rectangles.push(rectangle.Clone());
    }

    Pack(): void {
        const roughtArea = this.RoughlyPackedArea();

        console.log(roughtArea);
    }

    private RoughlyPackedArea(): number {
        const totalWidthFromLeft = Array.from({ length: this.rectangles.length + 1 }, () => ({ width: 0, maxHeight: 0 }));

        for (let n = 0; n < this.rectangles.length; ++n) {
            const rect = this.rectangles[n];

            totalWidthFromLeft[n + 1].width = totalWidthFromLeft[n].width + rect.Width;
            totalWidthFromLeft[n + 1].maxHeight = Math.max(totalWidthFromLeft[n].maxHeight, rect.Height);
        }

        totalWidthFromLeft[totalWidthFromLeft.length - 1].width = 0;
        totalWidthFromLeft[totalWidthFromLeft.length - 1].maxHeight = 0;

        for (let n = this.rectangles.length - 1; n >= 0; --n) {
            const rect = this.rectangles[n];

            const nonRotatedHeight = Math.max(totalWidthFromLeft[n].maxHeight, rect.Height, totalWidthFromLeft[n + 1].maxHeight);
            const nonRotatedWidth = totalWidthFromLeft[n].width + rect.Width + totalWidthFromLeft[n + 1].width;
            const nonRotatedArea = nonRotatedWidth * nonRotatedHeight;

            const rotatedHeight = Math.max(totalWidthFromLeft[n].maxHeight, rect.Width, totalWidthFromLeft[n + 1].maxHeight);
            const rotatedWidth = totalWidthFromLeft[n].width + rect.Height + totalWidthFromLeft[n + 1].width;
            const rotatedArea = rotatedWidth * rotatedHeight;

            //console.log(`${nonRotatedWidth} * ${nonRotatedHeight} = ${nonRotatedArea}`, `${rotatedWidth} * ${rotatedHeight} = ${rotatedArea}`);
            if (rotatedArea < nonRotatedArea) {
                const w = rect.Width;
                rect.Width = rect.Height;
                rect.Height = w;

                if (n > 0 && totalWidthFromLeft[n - 1].maxHeight < rect.Height) {
                    totalWidthFromLeft[n - 1].maxHeight = rect.Height;
                }
            }

            totalWidthFromLeft[n].width = rect.Width + totalWidthFromLeft[n + 1].width;
            totalWidthFromLeft[n].maxHeight = Math.max(rect.Height, totalWidthFromLeft[n + 1].maxHeight);
            //console.log(JSON.stringify(totalWidthFromLeft));
        }

        let totalWidth = 0;
        let maxHeight = 0;

        for (const rect of this.rectangles) {
            totalWidth += rect.Width;
            maxHeight = Math.max(maxHeight, rect.Height);
        }

        return totalWidth * maxHeight;
    }
} */
