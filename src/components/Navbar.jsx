export default function Navbar() {
  return (
    <nav className="bg-black/90 text-white py-4 px-8 flex justify-between items-center fixed w-full top-0 z-50 shadow-md">
      <div className="font-bold text-xl tracking-wide">DxPro</div>
      <div className="flex gap-8 text-lg font-medium">
        <a href="#inicio" className="hover:text-blue-400 transition">INICIO</a>
        <a href="#tutorial" className="hover:text-blue-400 transition">TUTORIAL</a>
        <a href="#basicos" className="hover:text-blue-400 transition">CASOS BÁSICOS</a>
        <a href="#avanzados" className="hover:text-blue-400 transition">CASOS AVANZADOS</a>
        <a href="#contacto" className="hover:text-blue-400 transition">CONTACTO</a>
      </div>
    </nav>
  );
}