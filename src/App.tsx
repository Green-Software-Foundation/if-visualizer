import { useState, useEffect } from "react";
import Visualizer from "./components/Visualizer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Fonts
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/500.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/900.css";

function App() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [searchParams] = useState(new URLSearchParams(window.location.search));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const url = (form.elements.namedItem("url") as HTMLInputElement).value;
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
    <main>
      <Navbar />
      <div className="relative max-w-5xl mx-auto">
        {fileUrl ? (
          <Visualizer fileUrl={fileUrl} />
        ) : (
          <div>
            <div className="py-10">
              <Card className="max-w-lg mx-auto ">
                <CardHeader>
                  <CardTitle>File URL</CardTitle>
                  <CardDescription>
                    Use the URL of the manifest file you want to visualize.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <Input name="url" placeholder="Raw File URL" />
                    <Button type="submit">Visualize</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
