import Logo from "../assets/logo.svg";

const Navbar: React.FC = () => {
  return (
    <nav className="py-4 border-border border-b bg-primary-foreground">
      <div className="flex justify-between items-center max-w-6xl mx-auto px-4 sm:px-6">
        <div className="transition-transform duration-300 hover:scale-105">
          <a href="/" className="flex items-center" aria-label="Home">
            <img src={Logo} alt="Logo" className="h-12" />
          </a>
        </div>
        <div className="flex gap-6 items-center">
          <a 
            href="/" 
            className="text-gray-800 hover:text-primary font-semibold text-sm uppercase tracking-wide transition-colors duration-200"
          >
            Home
          </a>
          <a 
            href="https://if.greensoftware.foundation/intro" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-800 hover:text-primary font-semibold text-sm uppercase tracking-wide transition-colors duration-200"
          >
            Documentation
          </a>
        </div>
      </div>
    </nav>
  );
};

export { Navbar };
