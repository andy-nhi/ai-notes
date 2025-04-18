export default function Transcript({
  rawTranscript,
  formattedTranscript,
  activeTranscript,
  setActiveTranscript,
  isLoading,
}) {
  const getCurrentTranscript = () => {
    switch (activeTranscript) {
      case "raw":
        return rawTranscript;
      default:
        return formattedTranscript;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">Live Transcript</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTranscript("formatted")}
            className={`px-2 py-1 text-xs sm:text-sm rounded ${
              activeTranscript === "formatted"
                ? "bg-blue-600"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            Formatted
          </button>
          <button
            onClick={() => setActiveTranscript("raw")}
            className={`px-2 py-1 text-xs sm:text-sm rounded ${
              activeTranscript === "raw"
                ? "bg-blue-600"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-700 p-3 md:p-4 rounded whitespace-pre-wrap text-sm md:text-base">
        {getCurrentTranscript() || (
          <p className="text-gray-400">
            {isLoading ? "Loading..." : "No transcript available"}
          </p>
        )}
      </div>
    </div>
  );
}
