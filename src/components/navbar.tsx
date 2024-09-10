import Logo from "../assets/logo.svg";

const Navbar: React.FC = () => {
  return (
    <nav className="flex justify-center items-center py-7 border-border border-b">
      <div>
        <img src={Logo} alt="Logo" className="h-10" />
      </div>
    </nav>
  );
};

export { Navbar };
