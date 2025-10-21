import { useState } from "react";

function buildShareUrl(plate) {
  const url = new URL(window.location.href);
  if (plate) url.searchParams.set("plate", String(plate));
  return url.toString();
}

export default function CopyShareLink({ plate, children = "שתף" }) {
  const [show, setShow] = useState(false);

  async function handleClick(e) {
    e.preventDefault();
    const link = buildShareUrl(plate);

    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // fallback if clipboard not available
      window.prompt("העתק קישור:", link);
      return;
    }

    // show tiny toast for ~1.2s
    setShow(true);
    setTimeout(() => setShow(false), 1200);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm text-indigo-600 hover:text-indigo-700 underline"
        title="העתק קישור לשיתוף"
      >
        {children}
      </button>

      {show && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]
                        bg-slate-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
          הקישור הועתק!
        </div>
      )}
    </>
  );
}
