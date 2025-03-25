import { useState, useEffect } from "react";
import { listen } from '@tauri-apps/api/event';
import { Music, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import "./App.css";

const extensionFilters = ["mp3", "wav", "flac"];

function App() {
  const [file, setFile] = useState<string | null>(null);

  const handleOpenFile = async function(){
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{name: "Music", extensions: extensionFilters}]
    });
    setFile(file);
  }

  useEffect(()=>{
    const unlisten = listen<{paths: string[]}>("tauri://drag-drop", (event)=>{
      const allPaths = event.payload.paths;
      if(allPaths && allPaths.length > 0 && extensionFilters.includes(allPaths[0].substring(allPaths[0].length-3))){
        setFile(event.payload.paths[0]);
      }
    });
  }, [])

  return (
    <main className="container">
      <div className="main-wrapper">
        <div className="title-content">
        <Music className={file ? "title-proc" : "title"} />
          <h2 className={file ? "title-proc" : "title"} onClick={handleOpenFile}>Click here or drag to open file</h2>
        </div>
        {file && <progress value={undefined} />}
      </div>
      <div className="control-wrapper">
        {file && <>
          <small className="title-proc">{file}</small>
          <button className="cancel" onClick={()=>setFile(null)}><X /></button>
        </>
        }
      </div>
    </main>
  );
}

export default App;
