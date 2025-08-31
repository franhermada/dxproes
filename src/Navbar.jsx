export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-blue-900/90 backdrop-blur-md border-b border-blue-800">
      <div className="max-w-6xl mx-auto h-14 px-5 flex items-center justify-between">
        <div className="text-white font-bold text-lg tracking-wide">DxPro</div>
        <div className="flex items-center gap-6 text-sm">
          <a href="#inicio" className="text-white hover:text-blue-200">Inicio</a>
          <a href="#tutorial" className="text-white hover:text-blue-200">Tutorial</a>
          <a href="#casos-basicos" className="text-white hover:text-blue-200">Casos Básicos</a>
          <a href="#casos-complejos" className="text-white hover:text-blue-200">Casos Avanzados</a>
          <a href="#sobre-dxpro" className="text-white hover:text-blue-200">Sobre DxPro</a>
          <a href="#contacto" className="text-white hover:text-blue-200">Contacto</a>
        </div>
      </div>
    </nav>
  );
}