export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-blue-900/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto h-14 px-5 flex items-center justify-between">
        <div className="text-white font-semibold tracking-wide">DxPro</div>

        <div className="flex items-center gap-6 text-sm">
          <a href="#inicio" className="no-underline text-white/90 visited:text-white hover:text-white">
            Inicio
          </a>
          <a href="#tutorial" className="no-underline text-white/90 visited:text-white hover:text-white">
            Tutorial
          </a>
          <a href="#casos-basicos" className="no-underline text-white/90 visited:text-white hover:text-white">
            Casos Básicos
          </a>
          <a href="#casos-avanzados" className="no-underline text-white/90 visited:text-white hover:text-white">
            Casos Avanzados
          </a>
          <a href="#contacto" className="no-underline text-white/90 visited:text-white hover:text-white">
            Contacto
          </a>
        </div>
      </div>
    </nav>
  );
}