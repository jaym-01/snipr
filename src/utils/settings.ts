export class CutProps {
  minSilence: number;
  threshold: number;
  padding: number;

  constructor(
    minSilence: number = 0.25,
    threshold: number = 400,
    padding: number = 0.1
  ) {
    this.minSilence = minSilence;
    this.threshold = threshold;
    this.padding = padding;
  }
}
