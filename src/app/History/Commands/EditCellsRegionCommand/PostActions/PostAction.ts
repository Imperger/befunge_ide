import type { EditCellsRegionCommand } from "../EditCellsRegionCommand";

export interface PostAction {
    Apply(target: EditCellsRegionCommand): void;
}
