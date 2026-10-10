for (const value of document.querySelectorAll(".field-value[data-limit]")) {
  const count = value.parentElement.querySelector(".field-count");
  const length = value.innerText.length;
  count.textContent = length + " / " + value.dataset.limit + " characters";
  count.classList.toggle("over", length > Number(value.dataset.limit));
}

for (const button of document.querySelectorAll(".copy")) {
  button.addEventListener("click", async () => {
    const text = button.parentElement.querySelector(".field-value").innerText;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      copyWithSelection(text);
    }
    button.textContent = "Copied";
    button.classList.add("done");
    setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("done");
    }, 1500);
  });
}

function copyWithSelection(text) {
  const area = document.createElement("textarea");
  area.value = text;
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}
