import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Lesson text is written by admins in Markdown. react-markdown doesn't render
// raw HTML, so a stray <script> in a lesson shows as text and never runs.

const components: Components = {
  h1: ({ node: _node, ...p }) => <h2 className="text-2xl font-bold text-white mt-8 mb-3" {...p} />,
  h2: ({ node: _node, ...p }) => <h3 className="text-xl font-bold text-white mt-7 mb-3" {...p} />,
  h3: ({ node: _node, ...p }) => <h4 className="text-lg font-semibold text-white mt-6 mb-2" {...p} />,
  p: ({ node: _node, ...p }) => <p className="text-white/75 leading-relaxed my-4" {...p} />,
  ul: ({ node: _node, ...p }) => <ul className="list-disc pl-6 my-4 space-y-1.5 text-white/75" {...p} />,
  ol: ({ node: _node, ...p }) => <ol className="list-decimal pl-6 my-4 space-y-1.5 text-white/75" {...p} />,
  a: ({ node: _node, ...p }) => <a className="text-[#3da3bc] underline underline-offset-2 hover:text-white" target="_blank" rel="noopener noreferrer" {...p} />,
  blockquote: ({ node: _node, ...p }) => <blockquote className="border-l-2 border-[#ffbd59]/50 pl-4 my-4 text-white/60 italic" {...p} />,
  pre: ({ node: _node, ...p }) => <pre className="bg-black/40 border border-white/10 rounded-xl p-4 my-4 overflow-x-auto text-sm text-white/85 [&_code]:bg-transparent [&_code]:p-0" {...p} />,
  code: ({ node: _node, ...p }) => <code className="bg-white/10 rounded px-1.5 py-0.5 text-[0.9em] text-[#ffbd59]/90" {...p} />,
  table: ({ node: _node, ...p }) => <div className="overflow-x-auto my-4"><table className="w-full text-sm text-white/75 border-collapse" {...p} /></div>,
  th: ({ node: _node, ...p }) => <th className="border border-white/10 px-3 py-2 text-left text-white font-semibold" {...p} />,
  td: ({ node: _node, ...p }) => <td className="border border-white/10 px-3 py-2" {...p} />,
  hr: ({ node: _node, ...p }) => <hr className="border-white/10 my-6" {...p} />,
  img: ({ node: _node, alt, ...p }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} className="rounded-xl my-4 max-w-full" {...p} />
  ),
};

export function LessonMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
