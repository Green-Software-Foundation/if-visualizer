import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkIcon, ArrowRightIcon, AlertCircleIcon } from "lucide-react";

interface UrlInputFormProps {
  onSubmit: (url: string) => void;
}

const UrlInputForm = ({ onSubmit }: UrlInputFormProps) => {
  const [url, setUrl] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate if string is a valid URL
  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch (err) {
      return false;
    }
  };

  // Validate if URL points to a YAML file
  const isYamlFile = (urlString: string): boolean => {
    const lowerUrl = urlString.toLowerCase();
    return lowerUrl.endsWith('.yml') || lowerUrl.endsWith('.yaml');
  };

  const validateUrl = (urlString: string): string | null => {
    if (!urlString.trim()) {
      return "URL is required";
    }

    if (!isValidUrl(urlString)) {
      return "Please enter a valid URL";
    }

    if (!isYamlFile(urlString)) {
      return "URL must point to a YAML file (.yml or .yaml)";
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onSubmit(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    // Clear error when user starts typing again
    if (error) {
      setError(null);
    }
  };

  const exampleUrls = [
    "https://raw.githubusercontent.com/Green-Software-Foundation/if-db/refs/heads/main/manifests/gsf-website/gsf-website-output.yml",
    "https://raw.githubusercontent.com/Green-Software-Foundation/if-db/refs/heads/main/manifests/if-docs-website/if-docs-website-sci-output.yml",
  ];

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              name="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="Enter YAML file URL"
              className={`pl-10 pr-4 py-6 text-base rounded-l-md rounded-r-none border-r-0 ${
                error ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
              required
            />
            <Button
              type="submit"
              className="py-6 px-6 rounded-l-none text-base font-medium flex items-center justify-center gap-2 transition-all h-[50px]"
              disabled={!url.trim()}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              Visualize
              <ArrowRightIcon className={`h-5 w-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </Button>
          </div>
          {error && (
            <div className="flex items-center space-x-1 text-red-500 text-sm">
              <AlertCircleIcon className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </form>
      
      <div className="mt-4">
        <p className="text-sm text-muted-foreground mb-2">Try these examples:</p>
        <div className="grid grid-cols-1 gap-2">
          {exampleUrls.map((example, index) => (
            <div
              key={index}
              className="text-xs text-muted-foreground p-2 bg-muted rounded-md cursor-pointer hover:bg-primary/10 transition-colors flex items-center"
              onClick={() => {
                setUrl(example);
                setError(null);
              }}
            >
              <LinkIcon className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="truncate">{example}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UrlInputForm; 