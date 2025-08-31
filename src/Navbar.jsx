import React from 'react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-900/90 backdrop-blur-sm shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo o Título de DxPro */}
        <div className="flex-shrink-0 flex items-center">
          <img className="h-8 w-auto" src="/DxPro.png" alt="DxPro Logo" />
        </div>

        {/* Botones de Navegación */}
        <div className="flex space-x-4">
          <a href="#inicio" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Inicio</a>
          <a href="#tutorial" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Tutorial</a>
          <a href="#casos-basicos" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Casos Básicos</a>
          <a href="#casos-complejos" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Casos Complejos</a>
          <a href="#sobre-dxpro" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Sobre DxPro</a>
          <a href="#contacto" className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Contacto</a>
        </div>
      </div>
    </nav>
  );
}