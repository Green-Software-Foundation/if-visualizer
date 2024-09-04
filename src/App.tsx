import { useState, useEffect } from "react";
import Visualizer from "./components/Visualizer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  return (
    <div className="relative max-w-5xl mx-auto pt-20 sm:pt-24 lg:pt-32">
      {fileUrl ? (
        <Visualizer fileUrl={fileUrl} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>File URL</CardTitle>
            <CardDescription>
              Use the URL of the manifest file you want to visualize.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input name="url" placeholder="Raw File URL" />
              <Button type="submit">Visualize</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default App;
