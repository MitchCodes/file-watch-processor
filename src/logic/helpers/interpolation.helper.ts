import { BasicDictionary } from "../../models/basicdictionary";

export class InterpolationHelper {
    public interpolateInput(input: string, data: BasicDictionary<string>): string {
        let dataKeys: string[] = Object.keys(data);
        if (data === undefined || data === null || dataKeys.length == 0) {
            return input;
        }

        let output: string = input;

        if (input.length > 4) {
            let currentStartFieldPosition: number = -1;

            for (let i: number = 0; i < (input.length - 1); i++) {
                let currentSub: string = input.substr(i, 2);
                if (currentSub === "{{") {
                    currentStartFieldPosition = i;
                } else if (currentSub === "}}" && currentStartFieldPosition != -1) {
                    let currentEndFieldPosition: number = i;
                    
                    let startAfter: number = currentStartFieldPosition + 2;
                    let betweenTextLen: number = currentEndFieldPosition - startAfter;

                    let betweenText: string = input.substr(startAfter, betweenTextLen);
                    if (data[betweenText] !== undefined && data[betweenText] !== null) {
                        output = output.replace("{{" + betweenText + "}}", data[betweenText]);
                    }

                    currentStartFieldPosition = -1;
                }
            }
        }

        return output;
    }
}