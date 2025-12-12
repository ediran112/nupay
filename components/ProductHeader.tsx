import React, { useState } from 'react';
import { ShieldCheck, Sparkles, Check, Settings } from 'lucide-react';

interface ProductHeaderProps {
  selectedProducts: string[];
  onToggleProduct: (id: string) => void;
  onOpenAdmin: () => void;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ selectedProducts, onToggleProduct, onOpenAdmin }) => {
  const [clickCount, setClickCount] = useState(0);
  
  const isSelected = (id: string) => selectedProducts.includes(id);

  const handleSecretClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent accidental selection
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 5) {
      onOpenAdmin();
      setClickCount(0);
    }
  };

  return (
    <div className="mb-8">
      {/* Top Badge */}
      <div className="flex justify-center mb-6">
        <div className="relative bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-nubank" />
          <h1 className="text-sm md:text-base font-bold text-gray-800 tracking-tight flex items-center">
            Compre seguro com o <span className="text-nubank mx-1">Nubank</span> pelo <span className="text-nubank ml-1">NuPay</span>
            
            {/* Gear Icon - Visible next to NuPay */}
            <button 
              onClick={handleSecretClick}
              className="ml-2 text-gray-300 hover:text-nubank transition-colors focus:outline-none p-1"
              title="Admin"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </h1>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="text-center mb-8 px-4">
        <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
           <img 
             src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Nubank_logo_2021.svg/1200px-Nubank_logo_2021.svg.png" 
             alt="Nubank" 
             className="h-8 md:h-10 w-auto object-contain"
           />
           <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
             Abelha sem ferrão Jandaíra
           </h2>
        </div>
        <p className="text-gray-500 text-sm md:text-base font-medium italic">
          Melipona (Subnitida)
        </p>
      </div>

      {/* Product Images Layout */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-2xl mx-auto p-4">
        
        {/* Left Item */}
        <div 
          onClick={() => onToggleProduct('bee')}
          className={`
            group relative w-full md:w-1/2 flex items-center bg-white p-3 rounded-2xl shadow-sm border 
            cursor-pointer transition-all duration-200
            ${isSelected('bee') ? 'border-nubank ring-2 ring-nubank/20' : 'border-gray-100 hover:border-gray-300'}
          `}
        >
          {/* Checkbox Overlay */}
          <div className={`
            absolute top-3 right-3 w-6 h-6 rounded-md border flex items-center justify-center transition-all z-10
            ${isSelected('bee') ? 'bg-nubank border-nubank' : 'bg-white border-gray-300'}
          `}>
             {isSelected('bee') && <Check className="w-4 h-4 text-white" />}
          </div>

          <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg relative">
             <img 
               src="https://storage.googleapis.com/paginassites/jandaira-FCM-696x462.jpg" 
               alt="Abelha Jandaíra Close" 
               className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
             />
          </div>
          <div className="ml-4 flex flex-col">
            <span className="text-xs font-bold text-nubank uppercase tracking-wider mb-1">Espécie</span>
            <span className="text-sm font-semibold text-gray-800">Abelha Jandaíra</span>
            <span className="text-xs text-gray-500">Genética Pura</span>
          </div>
        </div>

        {/* Right Item */}
        <div 
          onClick={() => onToggleProduct('hive')}
          className={`
            group relative w-full md:w-1/2 flex items-center bg-white p-3 rounded-2xl shadow-sm border 
            cursor-pointer transition-all duration-200
            ${isSelected('hive') ? 'border-nubank ring-2 ring-nubank/20' : 'border-gray-100 hover:border-gray-300'}
          `}
        >
           {/* Checkbox Overlay */}
           <div className={`
            absolute top-3 right-3 w-6 h-6 rounded-md border flex items-center justify-center transition-all z-10
            ${isSelected('hive') ? 'bg-nubank border-nubank' : 'bg-white border-gray-300'}
          `}>
             {isSelected('hive') && <Check className="w-4 h-4 text-white" />}
          </div>

          <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
             <img 
               src="https://storage.googleapis.com/paginassites/jandaira-FCM-696x462.jpg" 
               alt="Colmeia Jandaíra" 
               className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
             />
          </div>
          <div className="ml-4 flex flex-col">
            <span className="text-xs font-bold text-nubank uppercase tracking-wider mb-1">Espécie</span>
            <span className="text-sm font-semibold text-gray-800">Abelha Jandaíra</span>
            <span className="text-xs text-gray-500">Pronta entrega</span>
          </div>
        </div>

      </div>
      
      <div className="flex justify-center mt-2">
         <div className="flex items-center gap-1 text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>Produtos selecionados de alta qualidade</span>
         </div>
      </div>
    </div>
  );
};