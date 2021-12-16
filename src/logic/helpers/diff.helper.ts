export enum DifferenceType {
    Matching = 0,
    Added = 1,
    Removed = 2,
}

export class Difference<TSource, TTarget> {
    public diffType: DifferenceType;
    public source: TSource;
    public target: TTarget;

    public constructor(diffType: DifferenceType = DifferenceType.Matching, source: TSource = null, target: TTarget = null) {
        this.diffType = diffType;
        this.source = source;
        this.target = target;
    }
}

export class DiffHelper {
    public calculateDifferences<TSource>(source: TSource[], target: TSource[], matchCalculation: ((sourceItem: TSource, targetItem: TSource) => boolean) = null, excludeMatching: boolean = false): Difference<TSource, TSource>[] {
        if (!matchCalculation) {
            matchCalculation = (sourceItem: TSource, targetItem: TSource) => {
                return sourceItem === targetItem;
            };
        }

        return this.calculateDifferencesDifferentTypes<TSource, TSource>(source, target, matchCalculation, excludeMatching);
    }

    public calculateDifferencesDifferentTypes<TSource, TTarget>(source: TSource[], target: TTarget[], matchCalculation: ((sourceItem: TSource, targetItem: TTarget) => boolean), excludeMatching: boolean = false): Difference<TSource, TTarget>[] {
        let differences: Difference<TSource, TTarget>[] = [];

        source = [...source];
        target = [...target];

        for (let i = (source.length - 1); i >= 0; i--) {
            let sourceItem: TSource = source[i];
            let sourceFound: boolean = false;

            for (let j = (target.length - 1); j >= 0; j--) {
                let targetItem: TTarget = target[j];
                sourceFound = matchCalculation(sourceItem, targetItem);

                if (sourceFound) {
                    if (!excludeMatching) {
                        let difference: Difference<TSource, TTarget> = new Difference<TSource, TTarget>(DifferenceType.Matching, sourceItem, targetItem);
                        differences.push(difference);
                    }

                    target.splice(j, 1);
                    break;
                }
            }

            if (sourceFound) {
                source.splice(i, 1);
            }
        }

        for (let sourceItem of source) {
            let difference: Difference<TSource, TTarget> = new Difference<TSource, TTarget>(DifferenceType.Removed, sourceItem, null);
            differences.push(difference);
        }

        for (let targetItem of target) {
            let difference: Difference<TSource, TTarget> = new Difference<TSource, TTarget>(DifferenceType.Added, null, targetItem);
            differences.push(difference);
        }

        return differences;
    }
}