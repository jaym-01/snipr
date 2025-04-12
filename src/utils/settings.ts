import { load } from "@tauri-apps/plugin-store";

const key = "cut-props";

export class CutProps {
  minSilence: number;
  threshold: number;
  padding: number;

  constructor() {
    this.minSilence = 0.25;
    this.threshold = 400;
    this.padding = 0.1;
  }

  async load() {
    const store = await load("store.json", { autoSave: false });
    const data = await store.get<CutProps>(key);
    if (data) {
      this.minSilence = data.minSilence;
      this.threshold = data.threshold;
      this.padding = data.padding;
    }
  }

  async save() {
    const store = await load("store.json", { autoSave: false });
    store.set(key, this);
    await store.save();
  }

  clone() {
    const clone = new CutProps();

    Object.entries(this).forEach(([key, value]) => {
      clone[key as keyof CutProps] = value;
    });

    return clone;
  }
}
