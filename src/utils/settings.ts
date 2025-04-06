export class CutProps {
    minSilence: number;
    threshold: number;
    padding: number;

    constructor(minSilence?: number, threshold?: number, padding?: number) {
        this.minSilence = minSilence ?? 0.25;
        this.threshold = threshold ?? 400;
        this.padding = padding ?? 0.1;
    }
}