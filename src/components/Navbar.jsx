export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-blue-900 text-white shadow-md z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {}
        <div className="text-xl font-bold tracking-wide">DxPro</div>

        {}
        <div className="flex gap-6 text-lg font-medium">
          <a href="#inicio" className="hover:text-blue-300 transition">Inicio</a>
          <a href="#tutorial" className="hover:text-blue-300 transition">Tutorial</a>
          <a href="#casos-basicos" className="hover:text-blue-300 transition">Casos Básicos</a>
          <a href="#casos-avanzados" className="hover:text-blue-300 transition">Casos Avanzados</a>
          <a href="#contacto" className="hover:text-blue-300 transition">Contacto</a>
        </div>
      </div>
    </nav>
  );
}