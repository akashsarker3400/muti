"use client";

/**
 * Last-resort boundary. The app uses two root layouts (public site and admin),
 * so this file renders its own document shell.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F5F7FB",
          color: "#1A1A1A",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ color: "#1B2A6B", fontSize: "1.5rem" }}>
            কিছু একটা সমস্যা হয়েছে
          </h1>
          <p style={{ color: "#5B6472" }}>
            দুঃখিত, পৃষ্ঠাটি লোড করা যাচ্ছে না। আবার চেষ্টা করুন।
          </p>
          {error.digest && (
            <p style={{ color: "#5B6472", fontSize: "0.75rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: 44,
              padding: "0 1.5rem",
              borderRadius: 10,
              border: "none",
              background: "#1B2A6B",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </body>
    </html>
  );
}
