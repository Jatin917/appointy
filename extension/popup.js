document.getElementById("save").addEventListener("click", async () => {
  const text = document.getElementById("note").value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await fetch("https://your-domain.com/api/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: tab.title,
      content: text,
      sourceUrl: tab.url,
      type: "note",
    }),
  });

  document.getElementById("status").innerText = "✅ Saved!";
  setTimeout(() => (document.getElementById("status").innerText = ""), 2000);
});
