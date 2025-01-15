import Logo from "../assets/logo.svg";
const Navbar: React.FC = () => {
  return (
    <nav className="py-7 border-border border-b">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <div>
          <a href="https://if.greensoftware.foundation/" target="_blank" rel="noopener noreferrer">
            <img src={Logo} alt="Logo" className="h-10" />
          </a>
        </div>
        <div className="flex gap-4">
          <a href="/" >Home</a>
          <a href="https://if.greensoftware.foundation/intro" target="_blank" rel="noopener noreferrer" >Documentation</a>
        </div>
      </div>
    </nav>
  );
};

export { Navbar };
