import { useEffect, useRef } from "react";

export default function Transcript({ rawTranscript }) {
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rawTranscript]);

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-gray-800 font-sans">
      <div className="space-y-2">
        {rawTranscript ? (
          <>
            {rawTranscript.split("\n").map((line, i) => (
              <div
                key={i}
                className="text-gray-300 text-sm leading-relaxed p-2 hover:bg-gray-700 rounded transition-colors"
              >
                {line.trim() || <br />}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </>
        ) : (
          <div className="text-gray-500 italic p-4 text-center">
            Waiting for transcript...
          </div>
        )}
      </div>
    </div>
  );
}
