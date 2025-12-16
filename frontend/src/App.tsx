import { useEffect, useState, type FormEvent } from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Menu, X, Package, ShoppingCart, LogOut, Search, Calendar, AlertTriangle } from 'lucide-react'; // Ícones para ficar bonito
import './index.css';

interface Batch { id: number; quantity: number; expirationDate: string; code: string; }
interface Product { id: number; name: string; code: string; category: string; batches: Batch[]; }
interface ExternalProduct { code: string; name: string; category: string; }

// URL DA API
const API_URL = 'https://pharmastock-system.onrender.com';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [activeTab, setActiveTab] = useState<'estoque' | 'caixa'>('estoque');
  const [products, setProducts] = useState<Product[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado do Menu Mobile
  
  // FORM CADASTRO
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [category, setCategory] = useState('Geral');
  
  // AUTOCOMPLETE
  const [externalResults, setExternalResults] = useState<ExternalProduct[]>([]);
  const [showResults, setShowResults] = useState(false);

  // CAIXA
  const [sellInput, setSellInput] = useState('');
  const [sellQty, setSellQty] = useState('1');
  const [isQrMode, setIsQrMode] = useState(false); 
  const [productToSelectBatch, setProductToSelectBatch] = useState<Product | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, expired: 0, attention: 0, threeMo: 0, sixMo: 0, safe: 0 });

  useEffect(() => { if(isAuthenticated) fetchProducts(); }, [isAuthenticated]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if(loginUser === 'admin' && loginPass === '123') setIsAuthenticated(true);
    else alert('Tente: admin / 123');
  };

  const fetchProducts = () => {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then((data: Product[]) => {
        setProducts(data);
        calculateStats(data);
        prepareChartData(data);
      })
      .catch((err) => console.error(err));
  };

  const handleCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCode(value);
    if (value.length > 2) {
      try {
        const res = await fetch(`${API_URL}/products/external-search?q=${value}`);
        const data = await res.json();
        setExternalResults(data);
        setShowResults(true);
      } catch (err) { setShowResults(false); }
    } else {
      setShowResults(false);
    }
  };

  const selectExternalProduct = (prod: ExternalProduct) => {
    setCode(prod.code); setName(prod.name); setCategory(prod.category); setShowResults(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, category, quantity, expirationDate, batchCode })
      });
      if (response.ok) {
        alert('✅ Cadastrado!'); setName(''); setCode(''); setQuantity(''); setExpirationDate(''); setBatchCode(''); fetchProducts();
      } else { const err = await response.json(); alert(`❌ Erro: ${err.message}`); }
    } catch (error) { alert('Erro de conexão'); }
  };

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (isQrMode) {
      if (sellInput.includes('-')) { const [ean, lote] = sellInput.split('-'); await processSale(ean, null, lote); }
      else alert('Digite: EAN-LOTE');
      return;
    }
    try {
      let res = await fetch(`${API_URL}/products/code/${sellInput}`);
      let product = await res.json();
      if (!product && sellInput.length > 3) {
        const found = products.find(p => p.name.toLowerCase().includes(sellInput.toLowerCase()));
        if (found) product = found;
      }
      if (!product) { alert('❌ Não encontrado!'); return; }
      setProductToSelectBatch(product);
    } catch (err) { alert('Erro ao buscar'); }
  };

  const processSale = async (ean: string, batchId: number | null, batchCodeString?: string) => {
    const payload = { code: ean, quantity: Number(sellQty), batchId, batchCodeString };
    const res = await fetch(`${API_URL}/products/sell`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.status === 'SUCCESS') { alert(`✅ ${data.message}`); setSellInput(''); setProductToSelectBatch(null); fetchProducts(); }
    else alert(`❌ ${data.message}`);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Excluir?')) { await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' }); fetchProducts(); }
  };

  const prepareChartData = (data: Product[]) => setChartData(data.map(p => ({ name: p.name, estoque: p.batches?.reduce((acc, b) => acc + b.quantity, 0) || 0 })));
  const calculateStats = (data: Product[]) => {
    let expired = 0, attention = 0, threeMo = 0, sixMo = 0, safe = 0;
    data.forEach(p => {
      const nearest = getNearestBatch(p.batches);
      if(nearest) {
        const status = getValidityStatus(nearest.expirationDate);
        if(status.label === 'VENCIDO') expired++; else if(status.label === 'ATENÇÃO') attention++; else if(status.label === '3-6 MESES') threeMo++; else if(status.label === '6-12 MESES') sixMo++; else safe++;
      }
    });
    setStats({ total: data.length, expired, attention, threeMo, sixMo, safe });
  };
  const getNearestBatch = (batches: Batch[]) => (!batches || batches.length === 0) ? null : batches.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())[0];
  const getValidityStatus = (dateString: string) => {
    const diffDays = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { color: 'bg-red-600 text-white', label: 'VENCIDO' };
    if (diffDays <= 90) return { color: 'bg-red-100 text-red-800', label: 'ATENÇÃO' };
    if (diffDays <= 180) return { color: 'bg-orange-100 text-orange-800', label: '3-6 MESES' };
    if (diffDays <= 365) return { color: 'bg-blue-100 text-blue-800', label: '6-12 MESES' };
    return { color: 'bg-green-100 text-green-800', label: 'SEGURO' };
  };
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.includes(searchTerm));

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans p-4">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md text-center shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-blue-600">PharmaStock</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="admin" value={loginUser} onChange={e => setLoginUser(e.target.value)} className="w-full p-3 border rounded" />
          <input type="password" placeholder="123" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full p-3 border rounded" />
          <button className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700">ENTRAR</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans flex-col md:flex-row">
      
      {/* HEADER MOBILE */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-400">PharmaStock</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* SIDEBAR (Desktop: Fixa | Mobile: Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 transition-transform duration-200 ease-in-out
        w-64 bg-slate-900 text-white p-6 flex-shrink-0 z-40 md:block shadow-xl
      `}>
        <div className="hidden md:block mb-10">
           <h1 className="text-2xl font-bold text-blue-400">PharmaStock</h1>
           <p className="text-slate-500 text-xs mt-1">SISTEMA v3.5 (RESPONSIVO)</p>
        </div>
        
        <nav className="mt-14 md:mt-0 space-y-3">
          <button onClick={() => { setActiveTab('estoque'); setIsMobileMenuOpen(false); }} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'estoque' ? 'bg-blue-600 shadow' : 'hover:bg-slate-800'}`}>
            <Package size={20} /> Estoque
          </button>
          <button onClick={() => { setActiveTab('caixa'); setIsMobileMenuOpen(false); }} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'caixa' ? 'bg-emerald-600 shadow' : 'hover:bg-slate-800'}`}>
            <ShoppingCart size={20} /> Caixa
          </button>
          <button onClick={() => setIsAuthenticated(false)} className="w-full text-left p-3 text-red-400 hover:bg-slate-800 mt-10 flex items-center gap-3">
            <LogOut size={20} /> Sair
          </button>
        </nav>
      </aside>

      {/* OVERLAY PARA MOBILE */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        {activeTab === 'estoque' && (
          <div className="animate-fade-in space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
              <span className="text-sm bg-white px-3 py-1 rounded-full border shadow-sm flex items-center gap-2">
                <Calendar size={14} /> {new Date().toLocaleDateString('pt-BR')}
              </span>
            </header>

            {/* CARDS DE STATUS - RESPONSIVO */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-gray-400"><p className="text-[10px] font-bold text-gray-400">TOTAL</p><p className="text-xl md:text-2xl font-bold">{stats.total}</p></div>
              <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-red-600"><p className="text-[10px] font-bold text-red-600">VENCIDOS</p><p className="text-xl md:text-2xl font-bold">{stats.expired}</p></div>
              <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-red-400"><p className="text-[10px] font-bold text-red-400">ATENÇÃO (-3m)</p><p className="text-xl md:text-2xl font-bold">{stats.attention}</p></div>
              <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-orange-400"><p className="text-[10px] font-bold text-orange-400">3-6 MESES</p><p className="text-xl md:text-2xl font-bold">{stats.threeMo}</p></div>
              <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-blue-400"><p className="text-[10px] font-bold text-blue-400">6-12 MESES</p><p className="text-xl md:text-2xl font-bold">{stats.sixMo}</p></div>
              <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-green-500"><p className="text-[10px] font-bold text-green-500">SEGURO (+1 ano)</p><p className="text-xl md:text-2xl font-bold">{stats.safe}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* FORMULÁRIO */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h2 className="font-bold mb-4 text-gray-700 flex items-center gap-2"><Package size={18}/> Novo Cadastro</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="relative">
                     <label className="text-xs font-bold text-blue-600 uppercase">1. Busque (Nome/EAN)</label>
                     <div className="flex items-center gap-2">
                        <Search className="absolute left-3 top-9 text-blue-300" size={18} />
                        <input 
                          value={code} onChange={handleCodeChange} 
                          placeholder="Digite Dorf, Neosa..." 
                          className="w-full pl-10 p-3 border-2 border-blue-300 rounded bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900" 
                          required autoComplete="off"
                        />
                     </div>
                     {showResults && externalResults.length > 0 && (
                       <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-b shadow-xl max-h-48 overflow-y-auto">
                         {externalResults.map((prod) => (
                           <div key={prod.code} onClick={() => selectExternalProduct(prod)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50">
                             <p className="font-bold text-sm text-gray-800">{prod.name}</p>
                             <p className="text-xs text-gray-400">{prod.code}</p>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   <div><label className="text-xs font-bold text-gray-400 uppercase">Produto</label><input value={name} readOnly className="w-full p-2 border rounded bg-gray-200 text-gray-500 cursor-not-allowed text-sm" /></div>
                   <div><label className="text-xs font-bold text-gray-500 uppercase">2. Código Lote</label><input value={batchCode} onChange={e => setBatchCode(e.target.value)} className="w-full p-2 border rounded" required /></div>
                   
                   <div className="flex gap-2">
                     <div className="w-1/2"><label className="text-xs font-bold text-gray-500 uppercase">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-2 border rounded" required /></div>
                     <div className="w-1/2"><label className="text-xs font-bold text-gray-500 uppercase">Validade</label><input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full p-2 border rounded" required /></div>
                   </div>
                   <button className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30">Salvar</button>
                </form>
              </div>

              {/* LISTA ESTOQUE */}
              <div className="bg-white rounded-xl shadow-sm lg:col-span-2 p-5 border border-gray-100 flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between mb-4 items-start sm:items-center gap-3">
                   <h2 className="font-bold text-gray-700">Estoque</h2>
                   <input placeholder="🔍 Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border p-2 rounded text-sm w-full sm:w-48" />
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left min-w-[600px]">
                    <thead><tr className="border-b text-gray-400 text-sm"><th className="pb-2">Produto</th><th className="pb-2">Lotes</th><th className="pb-2">Qtd</th><th className="pb-2">Status</th><th className="pb-2"></th></tr></thead>
                    <tbody>
                      {filteredProducts.map(p => {
                        const nearest = getNearestBatch(p.batches);
                        const status = nearest ? getValidityStatus(nearest.expirationDate) : null;
                        return (
                          <tr key={p.id} className="border-b hover:bg-gray-50 text-sm">
                            <td className="py-3"><div className="font-bold">{p.name}</div><div className="text-xs text-gray-400">{p.code}</div></td>
                            <td className="text-xs text-gray-500 font-mono">{p.batches.map(b => <span key={b.id} className="block">{b.code} ({new Date(b.expirationDate).toLocaleDateString('pt-BR').slice(3)})</span>)}</td>
                            <td className="font-medium">{p.batches.reduce((a,b)=>a+b.quantity,0)}</td>
                            <td>{status && <span className={`px-2 py-1 text-[10px] rounded-full font-bold whitespace-nowrap ${status.color}`}>{status.label}</span>}</td>
                            <td className="text-right"><button onClick={()=>handleDelete(p.id)} className="text-red-400 text-xs font-bold px-2 py-1 border border-red-200 rounded hover:text-red-600">Excluir</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* GRÁFICO */}
            <div className="bg-white p-6 rounded-xl shadow-sm mt-8 h-64 border border-gray-100 hidden md:block">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12}/>
                        <Tooltip />
                        <Bar dataKey="estoque" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* --- CAIXA --- */}
        {activeTab === 'caixa' && (
          <div className="max-w-xl mx-auto mt-6 animate-fade-in pb-20">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-center">
              <div className="flex justify-center gap-2 mb-6 bg-gray-100 p-1 rounded-full w-fit mx-auto">
                 <button onClick={() => { setIsQrMode(false); setSellInput(''); setProductToSelectBatch(null); }} className={`px-4 py-2 rounded-full text-xs font-bold transition ${!isQrMode ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>BARRAS</button>
                 <button onClick={() => { setIsQrMode(true); setSellInput(''); setProductToSelectBatch(null); }} className={`px-4 py-2 rounded-full text-xs font-bold transition ${isQrMode ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>QR CODE</button>
              </div>
              {!productToSelectBatch ? (
                <>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl transition ${isQrMode ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>🛒</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Caixa</h2>
                  <p className="text-gray-500 text-sm mb-6">{isQrMode ? 'Bipe o Datamatrix (EAN-LOTE).' : 'Bipe ou Digite o nome.'}</p>
                  <form onSubmit={handleScan} className="space-y-4">
                    <input value={sellInput} onChange={e => setSellInput(e.target.value)} placeholder={isQrMode ? "Ex: 789-LOTE1" : "Nome ou EAN..."} className={`w-full text-center text-xl font-mono p-4 border-2 rounded-xl outline-none focus:ring-4 transition ${isQrMode ? 'border-purple-500 focus:ring-purple-200' : 'border-blue-500 focus:ring-blue-200'}`} autoFocus />
                    <div className="flex justify-center gap-2 items-center"><span className="font-bold text-gray-500">Qtd:</span><input type="number" value={sellQty} onChange={e => setSellQty(e.target.value)} className="w-20 text-center border p-2 rounded text-lg font-bold text-gray-700" /></div>
                    <button className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95 ${isQrMode ? 'bg-purple-600' : 'bg-blue-600'}`}>{isQrMode ? 'VENDER' : 'BUSCAR'}</button>
                  </form>
                </>
              ) : (
                <div className="text-left animate-fade-in">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">Selecione o Lote</h3><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold truncate max-w-[150px]">{productToSelectBatch.name}</span></div>
                  <button onClick={() => processSale(productToSelectBatch.code, null)} className="w-full mb-4 p-3 border-2 border-dashed border-gray-300 rounded-xl text-blue-600 font-bold hover:bg-blue-50 text-sm">✨ Baixar Automático (Antigo)</button>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {productToSelectBatch.batches.sort((a,b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()).map(batch => (
                      <button key={batch.id} onClick={() => processSale(productToSelectBatch.code, batch.id)} className="w-full flex justify-between items-center p-3 border rounded-lg hover:bg-blue-50 bg-white relative overflow-hidden text-sm">
                        {new Date(batch.expirationDate) < new Date() && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1">VENCIDO</div>}
                        <div><p className="font-bold text-gray-700">{batch.code}</p><p className="text-xs text-gray-500">{new Date(batch.expirationDate).toLocaleDateString('pt-BR')}</p></div>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{batch.quantity}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setProductToSelectBatch(null); setSellInput(''); }} className="mt-4 w-full text-gray-400 hover:text-red-500 underline text-sm text-center">Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;