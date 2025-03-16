import { useState, useEffect } from "react";
import Visualizer from "./components/Visualizer";
import { Navbar } from "@/components/navbar";
import UrlInputForm from "@/components/UrlInputForm";
import { ExternalLinkIcon } from "lucide-react";

// Fonts
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/500.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/900.css";
import { Button } from "./components/ui/button";

function App() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [searchParams] = useState(new URLSearchParams(window.location.search));

  const handleUrlSubmit = (url: string) => {
    setFileUrl(url);
    window.history.pushState({}, "", `?url=${encodeURIComponent(url)}`);
  };

  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setFileUrl(urlParam);
    } else {
      setFileUrl(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const handlePopState = () => {
      const newSearchParams = new URLSearchParams(window.location.search);
      const urlParam = newSearchParams.get("url");
      setFileUrl(urlParam);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      {fileUrl ? (
        <div className="relative max-w-5xl mx-auto">
          <Visualizer fileUrl={fileUrl} />
        </div>
      ) : (
        <div className="relative px-4 py-16 sm:py-24 lg:py-32">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl md:text-6xl">
              <span className="block">Impact Framework</span>
              <span className="block text-primary-dark">Visualizer</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-muted-foreground">
              Visualize your Impact Framework manifests with ease. Enter the URL of your YAML file below to get started.
            </p>

            <div className="mt-10 max-w-xl mx-auto">
              <UrlInputForm onSubmit={handleUrlSubmit} />
            </div>

            <div className="mt-12 flex flex-col items-center">
              <a
                href="https://if.greensoftware.foundation/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  Learn more about Impact Framework
                  <ExternalLinkIcon className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
