import { load } from "@tauri-apps/plugin-store";

const key = "cut-props";

export const storage = "store.json";

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
    const store = await load(storage, { autoSave: false });
    const data = await store.get<CutProps>(key);
    if (data) {
      this.minSilence = data.minSilence;
      this.threshold = data.threshold;
      this.padding = data.padding;
    }

    // await store.close();
  }

  async save() {
    const store = await load(storage, { autoSave: false });
    await store.set(key, this);
    await store.save();
    // await store.close();
  }

  clone() {
    const clone = new CutProps();

    Object.entries(this).forEach(([key, value]) => {
      clone[key as keyof CutProps] = value;
    });

    return clone;
  }
}
