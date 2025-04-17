import "@/Settings.css";
import { InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { CutProps } from "@/utils/settings.ts";

export default function Settings() {
  const [tmpSettings, setTmpSettings] = useState<CutProps>(new CutProps());
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [resetEnable, setResetEnabled] = useState(false);
  const settings = useRef(new CutProps());
  const [error, setError] = useState<string | null>(null);

  const updateEnable = (compare: CutProps) => {
    // compares it to the current saved settings
    // sets the save enable
    Object.entries(compare).some(
      ([k, v]) => v !== settings.current[k as keyof CutProps]
    )
      ? setSaveEnabled(true)
      : setSaveEnabled(false);

    // compares it to the default settings
    // sets the reset enable
    Object.entries(compare).some(
      ([k, v]) => v !== new CutProps()[k as keyof CutProps]
    )
      ? setResetEnabled(true)
      : setResetEnabled(false);
  };

  useEffect(() => {
    settings.current.load().then(() => {
      setTmpSettings(settings.current as CutProps);
      updateEnable(settings.current as CutProps);
    });
  }, []);

  const getHandleUpdate = function <K extends keyof CutProps>(key: K) {
    return (value: CutProps[K]) => {
      if (key === "minSilence") {
        if (typeof value === "number" && value <= 2 * tmpSettings.padding) {
          setError(
            "Minimum silence duration must be at least 2 times greater than padding"
          );
          setTimeout(() => setError(null), 5000);
          return;
        }
      } else if (key === "padding") {
        if (
          typeof value === "number" &&
          value >= 0.5 * tmpSettings.minSilence
        ) {
          setError("Padding must be at most half the minimum silence duration");
          setTimeout(() => setError(null), 5000);
          return;
        }
      }
      setError(null);

      // check if tmpSettings is different from settings
      updateEnable({ ...tmpSettings, [key]: value } as CutProps);

      setTmpSettings((prev) => {
        const clone = prev.clone();
        clone[key] = value;
        return clone;
      });
    };
  };

  const handleSave = async () => {
    console.log("Saving settings", tmpSettings);
    await tmpSettings.save();
    setSaveEnabled(false);
    settings.current = tmpSettings;
  };

  const handleReset = () => {
    setTmpSettings(new CutProps());
    updateEnable(new CutProps());
  };

  return (
    <div className="content-wrapper">
      <h1 className="title">Settings</h1>
      <div className="input-wrapper">
        <NumInput
          name="Minimum Silence duration"
          value={tmpSettings.minSilence}
          handleUpdate={getHandleUpdate("minSilence")}
          step={0.01}
        />

        <NumInput
          name="Padding On Cuts"
          value={tmpSettings.padding}
          handleUpdate={getHandleUpdate("padding")}
          step={0.1}
        />

        <NumInput
          name="Threshold"
          value={tmpSettings.threshold}
          handleUpdate={getHandleUpdate("threshold")}
          step={100}
        />
      </div>

      <span className="error">{error}</span>

      <div className="button-wrapper">
        <button
          type="button"
          disabled={!resetEnable}
          onClick={handleReset}
          className="sbutton"
        >
          Reset to default
        </button>
        <div style={{ flex: 1 }}></div>
        <button
          type="button"
          /*{...buttonProps}*/
          className="sbutton"
          disabled={!saveEnabled}
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NumInput({
  name,
  value,
  handleUpdate,
  ...props
}: {
  name: string;
  value: number;
  handleUpdate: (value: number) => void;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="num-input-wrapper">
      <label className="num-label">{name}</label>
      <input
        className="num-input"
        type="number"
        value={value}
        onChange={(e) => handleUpdate(parseFloat(e.target.value))}
        {...props}
      />
    </div>
  );
}
