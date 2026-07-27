import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

interface EmbedPlayerProps {
  url: string;
  poster?: string;
  language?: string;
  onError?: () => void;
}

export function EmbedPlayer({ url, poster, language, onError }: EmbedPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Force timeout: if iframe doesn't load within 20s, show error
    timeoutRef.current = window.setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError(true);
        onError?.();
      }
    }, 20000);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [reloadKey]);

  const handleLoad = () => {
    setIsLoading(false);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    onError?.();
  };

  const handleRetry = () => {
    setError(false);
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (error) {
    return (
      <div
        className="w-full aspect-video bg-black flex flex-col items-center justify-center text-white"
        style={{ backgroundImage: poster ? `url(${poster})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="bg-black/80 p-6 rounded-xl flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-lg">Échec du chargement du lecteur</p>
          <p className="text-sm text-white/60 text-center max-w-md break-all">{url}</p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-white/70 text-sm">
              Chargement...
            </p>
          </div>
        </div>
      )}

      <iframe
        key={reloadKey}
        src={url}
        className="w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture *; display-capture; microphone; camera; midi; payment; usb; xr-spatial-tracking; geolocation"
        onLoad={handleLoad}
        onError={handleError}
        title={`Lecteur vidéo - ${language || "Intégré"}`}
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
