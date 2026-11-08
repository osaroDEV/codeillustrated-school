import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonMarkdown } from "@/components/lessons/lesson-markdown";

const render = (md: string) => renderToStaticMarkup(<LessonMarkdown>{md}</LessonMarkdown>);

describe("LessonMarkdown", () => {
  it("renders headings, lists, code and tables", () => {
    const html = render("# Title\n\n- one\n\n`code`\n\n| a |\n| - |\n| b |");
    expect(html).toContain("<h2");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<code");
    expect(html).toContain("<table");
    expect(html).not.toContain("node=");
  });

  it("opens links safely in a new tab", () => {
    const html = render("[site](https://example.test)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("never renders raw HTML or script links", () => {
    const html = render('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
  });
});
