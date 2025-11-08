// 🧠 Constants
const BASE_URL = "http://localhost:3000";
const CONTENT_API = `${BASE_URL}/api/content`;
const IMAGE_API = `${BASE_URL}/api/content/upload-image`;

// Create right-click context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save_to_synapse",
    title: "🧠 Save to Synapse",
    contexts: ["selection", "image", "link", "video", "page"]
  });
});

// Handle right-click actions
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabId = tab.id;

  // Common payload base
  let payload = {
    title: tab.title,
    sourceUrl: info.pageUrl || tab.url,
    metaTags: ["chrome-extension", "right-click"]
  };

  try {
    // 📝 TEXT SELECTION
    if (info.selectionText) {
      payload.type = "text";
      payload.content = info.selectionText.trim();
      return await sendJSON(payload, tabId, "✅ Text saved to Synapse!");
    }

    // 🖼️ IMAGE
    if (info.mediaType === "image" && info.srcUrl) {
      const blob = await downloadAsBlob(info.srcUrl);
      const formData = new FormData();
      formData.append("image", blob, "image.png");
      formData.append("title", tab.title);
      formData.append("sourceUrl", info.srcUrl);
      formData.append("type", "image");
      formData.append("metaTags", JSON.stringify(["chrome-extension", "image"]));

      return await uploadImage(formData, tabId, "🖼️ Image saved to Synapse!");
    }

    // 🎬 VIDEO (just save video URL)
    if (info.mediaType === "video" || tab.url.includes("youtube.com")) {
      payload.type = "video";
      payload.url = info.srcUrl || info.pageUrl || tab.url;
      payload.content = payload.url;
      return await sendJSON(payload, tabId, "🎥 Video link saved to Synapse!");
    }

    // 🔗 LINK
    if (info.linkUrl) {
      payload.type = "link";
      payload.url = info.linkUrl;
      payload.content = info.linkUrl;
      return await sendJSON(payload, tabId, "🔗 Link saved to Synapse!");
    }

    // 🌐 PAGE (fallback)
    payload.type = "page";
    payload.content = tab.url;
    return await sendJSON(payload, tabId, "🌐 Page saved to Synapse!");
  } catch (err) {
    console.error("❌ Save error:", err);
    showToast(tabId, "❌ Failed to save!");
  }
});


// =======================================================
// 🧩 Helper Functions
// =======================================================

// Send JSON (text/link/video/page)
async function sendJSON(data, tabId, successMsg = "✅ Saved!") {
  const res = await fetch(CONTENT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to save content");
  showToast(tabId, successMsg);
}

// Upload Image (multipart)
async function uploadImage(formData, tabId, successMsg = "✅ Image uploaded!") {
  const res = await fetch(IMAGE_API, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Failed to upload image");
  showToast(tabId, successMsg);
}

// Download any image URL as Blob
async function downloadAsBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Image download failed");
  return await res.blob();
}

// Show toast in active tab
function showToast(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => {
      const toast = document.createElement("div");
      toast.textContent = msg;
      Object.assign(toast.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#111",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        zIndex: 999999,
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        opacity: 0.95,
        transition: "opacity 0.3s ease"
      });
      document.body.appendChild(toast);
      setTimeout(() => (toast.style.opacity = 0), 1800);
      setTimeout(() => toast.remove(), 2100);
    },
    args: [message]
  });
}
