import { Fragment } from "react";

/** Renders simple article markup: "## heading", "> quote", "![caption](url)" and paragraphs. */
export function ArticleBody({ content }: { content: string }) {
  const blocks = content.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-ar">
      {blocks.map((b, i) => {
        const img = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
        if (img) {
          const url = img[2] ?? ""; const safe = /^(\/api\/public\/media\/|https:\/\/)/.test(url);
          if (!safe) return null;
          return (
            <figure key={i}>
              <img src={url} alt={img[1]} loading="lazy" />
              {img[1] && <figcaption>{img[1]}</figcaption>}
            </figure>
          );
        }
        if (b.startsWith("## ")) return <h2 key={i}>{b.slice(3)}</h2>;
        if (b.startsWith("> ")) return <blockquote key={i}>{b.replace(/^> ?/gm, "")}</blockquote>;
        return (
          <p key={i}>
            {b.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
