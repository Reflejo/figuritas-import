import { useEffect, useMemo, useState, type FC } from "react";
import {
  buildLibraryQrPayload,
  createLibraryQrDataUrl,
  type LibraryQrPayload,
} from "./libraryQr";

type TabId = "need" | "dupes";

type TabConfig = {
  id: TabId;
  title: string;
};

const TABS: TabConfig[] = [
  {
    id: "need",
    title: "Need",
  },
  {
    id: "dupes",
    title: "Dupes",
  },
];

const PLACEHOLDERS: Record<TabId, string> = {
  need: `🇲🇽 MEX: 1, 2, 3
ARG 7,8,9
FWC: 18,19`,
  dupes: `🇧🇷 BRA: 1,2
FWC 4,5`,
};

const App: FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("need");
  const [needText, setNeedText] = useState<string>("");
  const [dupesText, setDupesText] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  const summary = useMemo<LibraryQrPayload | null>(() => {
    if (!needText.trim() && !dupesText.trim()) {
      return null;
    }

    try {
      return buildLibraryQrPayload(needText, dupesText);
    } catch {
      return null;
    }
  }, [needText, dupesText]);

  useEffect(() => {
    const hasContent =
      needText.trim().length > 0 || dupesText.trim().length > 0;

    if (!hasContent) {
      setQrDataUrl("");
      setError("");
      return;
    }

    let cancelled = false;
    setError("");

    createLibraryQrDataUrl(needText, dupesText)
      .then((dataUrl) => {
        if (cancelled) {
          return;
        }

        setQrDataUrl(dataUrl);
      })
      .catch((nextError: unknown) => {
        if (cancelled) {
          return;
        }

        setQrDataUrl("");
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to create the QR code.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [needText, dupesText]);

  const activeValue = activeTab === "need" ? needText : dupesText;
  const setActiveValue = activeTab === "need" ? setNeedText : setDupesText;

  return (
    <main className="app-shell">
      <section className="tool-shell">
        <div className="tool-header">
          <h1>Figuritas import</h1>
          <p className="lead">
            Paste the two lists (duplicates &amp; needs) and the QR code will
            update live.
          </p>
        </div>

        <div className="tab-switch" role="tablist" aria-label="Sticker inputs">
          {TABS.map((tab) => (
            <label
              key={tab.id}
              className={`tab-choice${activeTab === tab.id ? " is-active" : ""}`}
            >
              <input
                type="radio"
                name="sticker-tab"
                value={tab.id}
                checked={activeTab === tab.id}
                onChange={() => setActiveTab(tab.id)}
              />
              <span>{tab.title}</span>
            </label>
          ))}
        </div>

        <div className="panel">
          <textarea
            id={`input-${activeTab}`}
            value={activeValue}
            onChange={(event) => setActiveValue(event.target.value)}
            placeholder={PLACEHOLDERS[activeTab]}
            spellCheck="false"
          />
          <p className="field-hint">
            Accepted formats: <code>COUNTRY: 1,2,3</code>,{" "}
            <code>🇲🇽 COUNTRY: 1, 2, 3</code>, or <code>COUNTRY 1,2,3</code>.
          </p>
        </div>

        <div className="summary">
          <div className="stat-card">
            <span>Need</span>
            <strong>{summary?.needCount ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span>Dupes</span>
            <strong>{summary?.dupesCount ?? 0}</strong>
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="card preview-card">
          <h2>QR preview</h2>
          {qrDataUrl ? (
            <img className="qr-image" src={qrDataUrl} alt="Generated QR code" />
          ) : (
            <div className="qr-placeholder">Your QR code will appear here.</div>
          )}
        </div>
      </section>
    </main>
  );
};

export default App;
