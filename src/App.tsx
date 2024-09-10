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

import HeroImg from "./assets/hero.svg";
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
            <section className="py-12 md:py-16">
              <div className="grid grid-cols-1 gap-x-20 gap-y-12 md:gap-y-16 lg:grid-cols-2 lg:items-center">
                <div>
                  <h1 className="mb-2 text-xl md:text-3xl font-bold md:mb-6 text-secondary-lightest">
                    Join the Green Software Foundation
                    <span className="text-secondary-default">
                      Global Summit 2024!
                    </span>
                  </h1>
                  <p className="md:text-md text-primary-light">
                    From <strong>October 1-10</strong>, join a series of
                    exciting in-person events hosted by GSF members. This summit
                    brings together software practitioners and key stakeholders,
                    all committed to reducing the environmental impacts of
                    software.
                  </p>
                </div>
                <div className="max-h-full">
                  <img
                    src={HeroImg}
                    className="w-full object-cover"
                    alt="Manifest"
                  />
                </div>
              </div>
            </section>
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
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
