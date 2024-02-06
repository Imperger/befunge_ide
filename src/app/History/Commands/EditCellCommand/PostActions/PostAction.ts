import { EditCellCommand } from "../EditCellCommand";

export interface PostAction {
    Apply(target: EditCellCommand): void;
}
