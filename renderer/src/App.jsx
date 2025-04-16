import "./global.css";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function App() {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      window.electronAPI?.readNotes?.().then(setNotes);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-neutral-800 text-gray-100 h-screen w-screen flex flex-col font-sans">
      <header className="px-6 pt-4">
        <h1 className="text-2xl font-bold">MEETING NOTES</h1>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="bg-stone-900 rounded-2xl p-6 shadow-md w-full h-full overflow-y-auto">
          <Markdown remarkPlugins={[remarkGfm]} children={notes} />
        </div>
      </main>
    </div>
  );
}

export default App;
