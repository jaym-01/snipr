import ReactDOM from "react-dom/client";
import "@/App.css";
import "@/Settings.css";
import { useState, useRef, useEffect } from "react";
import { CutProps } from "@/utils/settings.ts";

function Settings() {
  const [tmpSettings, setTmpSettings] = useState<CutProps>(new CutProps());
  const [saveEnabled, setSaveEnabled] = useState(false);
  const settings = useRef(new CutProps());

  useEffect(() => {
    settings.current.load().then(() => {
      setTmpSettings(settings.current as CutProps);
    });
  }, []);

  const updateEnable = (compare: CutProps) =>
    Object.entries(compare).some(
      ([k, v]) => v !== settings.current[k as keyof CutProps]
    )
      ? setSaveEnabled(true)
      : setSaveEnabled(false);

  const getHandleUpdate = function <K extends keyof CutProps>(key: K) {
    return (value: CutProps[K]) => {
      console.log("value", key, value);

      // check if tmpSettings is different from settings
      updateEnable({ ...tmpSettings, [key]: value } as CutProps);

      setTmpSettings((prev) => {
        const clone = prev.clone();
        clone[key] = value;
        return clone;
      });
    };
  };

  const handleSave = () => {
    console.log("Saving settings", tmpSettings);
    tmpSettings.save();
    setSaveEnabled(false);
    settings.current = tmpSettings;
  };

  const handleReset = () => {
    setTmpSettings(new CutProps());
    updateEnable(new CutProps());
  };

  const buttonProps = {
    style: { opacity: saveEnabled ? 1 : 0.3 },
    className: `sbutton ${saveEnabled ? "sbuttone" : ""}`,
  };

  return (
    <div className="container">
      <div className="content-wrapper">
        <h1>Settings</h1>
        <div className="input-wrapper">
          <NumInput
            name="Minimum Silence duration"
            value={tmpSettings.minSilence}
            handleUpdate={getHandleUpdate("minSilence")}
          />

          <NumInput
            name="Padding On Cuts"
            value={tmpSettings.padding}
            handleUpdate={getHandleUpdate("padding")}
          />

          <NumInput
            name="Threshold"
            value={tmpSettings.threshold}
            handleUpdate={getHandleUpdate("threshold")}
          />
        </div>

        <div className="button-wrapper">
          <button
            type="button"
            disabled={!saveEnabled}
            onClick={handleReset}
            {...buttonProps}
          >
            Reset to default
          </button>
          <div style={{ flex: 1 }}></div>
          <button
            type="button"
            {...buttonProps}
            disabled={!saveEnabled}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
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
}) {
  return (
    <>
      <label className="num-label">{name}:</label>
      <input
        className="num-input"
        type="number"
        value={value}
        onChange={(e) => handleUpdate(parseFloat(e.target.value))}
        {...props}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Settings />
);
