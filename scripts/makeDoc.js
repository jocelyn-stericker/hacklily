{
const ci = document.querySelectorAll("a[name=lilypond-command-index] ~ table.index-ky tr");
const args = [];
for (let i = 0; i < ci.length; ++ i) {
  const a = ci[i];
  const links = a.querySelectorAll("a");
  if (links.length === 2) {
    let name = links[0].getAttribute("href").slice(1);
    let docp = document.querySelector(`a[name="${name}"] ~ p`);
    while (docp && docp.tagName.toLowerCase() === "a") {
      docp = docp.nextElementSibling;
    }
    const docs = [];
    while (docp && docp.tagName.toLowerCase() !== "a") {
      if (docp.tagName.toLowerCase() === "blockquote") {
        docs.push(docp.innerText.split("\n").filter(n => n.trim().length >= 1).map(n => `    ${n}`).join("\n"));
      } else if (docp.tagName.toLowerCase() === "ul") {
        docs.push(Array(...docp.children).map(child => " - " + child.innerText).join("\n"));
      } else {
        docs.push(docp.innerText);
      }
      docp = docp.nextElementSibling;
    }
    let label = links[0].innerText;
    if (label[0].match(/[a-z]/)) {
      label = "\\" + label;
    }
    const section = links[1].innerText.trim();
    if (section === "See also") {
      console.log(`Skipping see also section for ${label}.`);
      continue;
    }
    console.log(label);
    args.push({
      label,
      detail: section,
      documentation: docs.filter(d => d.trim().length >= 1).join("\n\n"),
    });

  }
}

window.args = args;

}