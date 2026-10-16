/** The snippet site owners paste into their website. */
export function embedSnippet(origin: string, slug: string, position: "right" | "left" = "right") {
  const pos = position === "left" ? ' data-position="left"' : "";
  return `<script src="${origin}/widget.js" data-form="${slug}"${pos} async></script>`;
}

/**
 * A ready-made, standalone "fake company website" with the widget embedded.
 * Opening it from your computer proves the widget works on a different origin.
 */
export function testPageHtml(origin: string, slug: string, formTitle: string, position: "right" | "left") {
  const title = formTitle.replace(/[<>&"]/g, "");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sunny Side Bakery — widget test</title>
  <style>
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #3b2f2f; background: #fff8ef; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 20px 32px; background: #f4d9b0; }
    header strong { font-size: 22px; }
    nav a { margin-left: 18px; color: #3b2f2f; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 24px; line-height: 1.7; }
    h1 { font-size: 40px; margin: 0 0 12px; }
    .note { margin-top: 32px; padding: 16px; border: 2px dashed #d4a373; border-radius: 12px; font-family: system-ui, sans-serif; font-size: 14px; }
    code { background: #fbe8cf; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <header><strong>🥐 Sunny Side Bakery</strong><nav><a href="#">Menu</a><a href="#">About</a><a href="#">Visit</a></nav></header>
  <main>
    <h1>Fresh bread every morning</h1>
    <p>This is a pretend website used to test the Formchat widget. Its fonts and colors are deliberately
      different from Formchat's, to show that the widget's styles stay isolated.</p>
    <p>Click the chat bubble in the corner to answer <em>${title}</em>. When you finish, open your
      Formchat dashboard → Responses: the new response appears with the source “Website widget”.</p>
    <div class="note">The only line added to this page is the embed snippet just before <code>&lt;/body&gt;</code>.</div>
  </main>

  <!-- Formchat widget -->
  ${embedSnippet(origin, slug, position)}
</body>
</html>
`;
}
