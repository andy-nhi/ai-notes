import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Notes({ notes, isLoading }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 h-full flex flex-col min-h-0">
      <h2 className="text-xl font-semibold mb-4">Meeting Notes</h2>
      <div className="prose lg:prose-xl prose-headings:text-gray-100 max-w-none text-gray-100 flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <p className="text-gray-400">Loading notes...</p>
        ) : (
          <Markdown remarkPlugins={[remarkGfm]}>
            {notes || "No notes generated yet"}
          </Markdown>
        )}
      </div>
    </div>
  );
}
