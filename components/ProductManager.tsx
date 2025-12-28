import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { Edit2, Plus, Trash2, Tag, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', category: '' });

  useEffect(() => {
    const unsubscribe = db.collection('products').onSnapshot((snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price);
    if (!formData.name || isNaN(price)) return;

    try {
      if (isEditing && currentId) {
        await db.collection('products').doc(currentId).update({
          name: formData.name,
          price,
          category: formData.category
        });
      } else {
        await db.collection('products').add({
          name: formData.name,
          price,
          category: formData.category
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Erro ao salvar produto");
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({ 
      name: product.name, 
      price: product.price.toString(), 
      category: product.category 
    });
    setCurrentId(product.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await db.collection('products').doc(id).delete();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', category: '' });
    setIsEditing(false);
    setCurrentId(null);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando produtos...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-1">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 sticky top-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            {isEditing ? <Edit2 className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-emerald-500" />}
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome do Produto</label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Pastel de Carne"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Selecione...</option>
                <option value="pasteis">Pastéis</option>
                <option value="bebidas">Bebidas</option>
                <option value="porcoes">Porções</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Preço (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="number" step="0.50"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={`flex-1 ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-2 rounded-lg text-sm font-bold transition-colors`}
              >
                {isEditing ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="lg:col-span-2">
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white">Catálogo ({products.length})</h3>
          </div>
          <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
            {products.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum produto cadastrado.</div>
            ) : (
              products.map(product => (
                <div key={product.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${product.category === 'bebidas' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <p className="text-xs text-slate-400 capitalize">{product.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-emerald-400">R$ {product.price.toFixed(2)}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 hover:bg-slate-600 rounded-full text-slate-400 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};