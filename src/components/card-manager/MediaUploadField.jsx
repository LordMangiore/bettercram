import { useState, useRef } from "react";

export default function MediaUploadField({ label, accept, currentUrls = [], onUrlsChange, icon }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const headers = {};
      try { headers["X-User-Id"] = JSON.parse(localStorage.getItem("mcat-user"))?.id; } catch {}
      const token = localStorage.getItem("mcat-access-token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const arrayBuf = await file.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", arrayBuf);
      const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", hash);

      const res = await fetch("/.netlify/functions/upload-media", {
        method: "POST",
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUrlsChange([...currentUrls, data.url]);
      }
    } catch (err) {
      console.error("Media upload failed:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeUrl(idx) {
    onUrlsChange(currentUrls.filter((_, i) => i !== idx));
  }

  const isAudio = !accept.includes("image");

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      {currentUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {currentUrls.map((url, i) => (
            <div key={i} className="relative group">
              {!isAudio ? (
                <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
              ) : (
                <audio src={url} controls className="h-9 w-40 rounded-lg" preload="none" />
              )}
              <button
                onClick={() => removeUrl(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
      >
        {uploading ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Uploading...</> : <><i className={`fa-solid ${icon} mr-1`} /> Add {label.toLowerCase()}</>}
      </button>
    </div>
  );
}
