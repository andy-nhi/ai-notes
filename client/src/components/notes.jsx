import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Notes({ notes, isLoading }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 font-sans">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Generating notes...</div>
        </div>
      ) : notes ? (
        <div className="prose prose-invert max-w-3xl mx-auto">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1
                  className="text-2xl font-bold text-white mb-4 mt-6"
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="text-xl font-semibold text-white mb-3 mt-5 border-b border-gray-600 pb-2"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="text-lg font-medium text-indigo-400 mb-2 mt-4"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul
                  className="list-disc pl-5 space-y-1.5 mb-4 text-gray-300"
                  {...props}
                />
              ),
              li: ({ node, ...props }) => (
                <li className="text-gray-300" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-gray-300 mb-3 leading-relaxed" {...props} />
              ),
            }}
          >
            {notes}
          </Markdown>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">No notes generated yet</div>
        </div>
      )}
    </div>
  );
}
