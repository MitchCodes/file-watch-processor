import { DateTime } from "luxon";

export class FileDateSize {
    public size: number;
    public time: DateTime;

    public constructor(size: number = 0, time: DateTime = null) {
        this.size = size;
        this.time = time;
    }
}