import Logo from "../assets/logo.svg";
import { Button } from "@/components/ui/button";
const Navbar: React.FC = () => {
  return (
    <nav className="py-7 border-border border-b">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <div>
          <a href="/">
            <img src={Logo} alt="Logo" className="h-10" />
          </a>
        </div>
        <div>
          <Button>Become a watcher</Button>
        </div>
      </div>
    </nav>
  );
};

export { Navbar };
