import React from "react";

/**
 * Very small, safe-by-construction markdown renderer for assistant chat
 * messages. Deliberately does NOT use dangerouslySetInnerHTML — everything
 * is built as React elements, so there's no HTML-injection surface even
 * though the content comes from an LLM.
 *
 * Supports: paragraphs, line breaks, **bold**, `inline code`, fenced code
 * blocks, bullet lists ("- " / "* "), numbered lists, and [text](url) links
 * (only http/https targets are ever rendered as real links).
 */

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Order matters: code spans first so ** inside `code` isn't touched, then bold, then links.
  const tokenPattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[0.85em] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        if (isSafeUrl(url)) {
          nodes.push(
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-1 underline-offset-2 text-[#2d5248] dark:text-dark-text hover:text-[#1a3a35] dark:hover:text-[#EDEADE] font-medium"
            >
              {label}
            </a>
          );
        } else {
          nodes.push(label);
        }
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default function MarkdownLite({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre
          key={`code-${blockKey++}`}
          className="my-2 p-3 rounded-xl bg-black/5 dark:bg-white/10 overflow-x-auto text-[0.82em] font-mono leading-relaxed"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headings (# .. ######)
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const key = `h-${blockKey++}`;
      const sizeClass =
        level === 1 ? "text-2xl font-display" :
        level === 2 ? "text-xl font-display" :
        level === 3 ? "text-lg font-semibold" :
        "text-base font-semibold";
      const HeadingTag = (`h${Math.min(level, 6)}`) as keyof React.JSX.IntrinsicElements;
      blocks.push(
        <HeadingTag key={key} className={`${sizeClass} text-[#1a3a35] dark:text-dark-text mt-4 mb-1 first:mt-0`}>
          {renderInline(text, key)}
        </HeadingTag>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blockKey++}`} className="my-1.5 pl-4 space-y-1 list-disc marker:text-[#4a7c6f] dark:marker:text-dark-muted">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it, `ul-${blockKey}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol-${blockKey++}`} className="my-1.5 pl-4 space-y-1 list-decimal marker:text-[#4a7c6f] dark:marker:text-dark-muted">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it, `ol-${blockKey}-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line → paragraph break
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-blank, non-list, non-fence lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("```")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p-${blockKey++}`} className="leading-relaxed">
        {paraLines.map((l, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(l, `p-${blockKey}-${idx}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}
