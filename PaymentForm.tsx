import React, { useState, useEffect } from 'react';
import { PaymentAuthData, Beneficiary } from './types';
import { maskCurrency, maskCpfCnpj, maskCPF } from './formatters';
import { db } from './firebase';
import { collection, query, limit, getDocs, orderBy, startAt, endAt } from 'firebase/firestore';

interface Props {
  data: PaymentAuthData;
  activeTab: 'auth' | 'cover';
  onUpdate: (data: Partial<PaymentAuthData>) => void;
  onAddBeneficiary: () => void;
  onRemoveBeneficiary: (id: string) => void;
  onUpdateBeneficiary: (id: string, updates: Partial<Beneficiary>) => void;
}

const PaymentForm: React.FC<Props> = ({
  data,
  activeTab,
  onUpdate,
  onAddBeneficiary,
  onRemoveBeneficiary,
  onUpdateBeneficiary,
}) => {
  const beneficiaries = data?.beneficiaries ?? [];
  const [directory, setDirectory] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  // Carregar diretório de beneficiários (apenas os 20 mais recentes para performance inicial)
  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const q = query(collection(db, 'beneficiaries_directory'), orderBy('updatedAt', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        setDirectory(snapshot.docs.map(doc => doc.data()));
      } catch (err) {
        console.warn("Erro ao carregar diretório:", err);
      }
    };
    fetchDirectory();
  }, []);

  const handleSelectBeneficiary = (id: string, b: any) => {
    onUpdateBeneficiary(id, {
      name: b.name,
      pix: b.pix || '',
      document: b.document || '',
      type: b.type || '',
      bank: b.bank || '',
      agency: b.agency || '',
      account: b.account || '',
    });
    setShowSuggestions(null);
  };

  if (activeTab === 'cover') {
    return (
      <section className="bg-white dark:bg-zinc-800 p-8 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-100 dark:border-zinc-700 animate-fadeIn">
        <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-100 mb-6 border-b dark:border-zinc-700 pb-4">Configurações da Capa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Contrato Aditivo?</label>
            <div className="flex space-x-4 mt-2">
              <label className="flex items-center space-x-2 cursor-pointer dark:text-zinc-300">
                <input type="radio" checked={data.isContractAdditive === 'sim'} onChange={() => onUpdate({ isContractAdditive: 'sim' })} className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium">SIM</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer dark:text-zinc-300">
                <input type="radio" checked={data.isContractAdditive === 'nao'} onChange={() => onUpdate({ isContractAdditive: 'nao' })} className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium">NÃO</span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Necessidade de Avalista?</label>
            <div className="flex space-x-4 mt-2">
              <label className="flex items-center space-x-2 cursor-pointer dark:text-zinc-300">
                <input type="radio" checked={data.needsGuarantor === 'sim'} onChange={() => onUpdate({ needsGuarantor: 'sim' })} className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium">SIM</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer dark:text-zinc-300">
                <input type="radio" checked={data.needsGuarantor === 'nao'} onChange={() => onUpdate({ needsGuarantor: 'nao' })} className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium">NÃO</span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Valor a Pagar (Exibido na Capa)</label>
            <input
              type="text"
              value={data.paymentAmount || data.totalAmount}
              readOnly
              className="w-full p-3 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none transition font-semibold text-gray-600 dark:text-zinc-400 cursor-not-allowed"
              placeholder="R$ 0,00"
            />
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">Calculado automaticamente pela soma dos beneficiários.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Médico (a)</label>
            <input
              type="text"
              value={data.doctorName}
              onChange={(e) => onUpdate({ doctorName: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:text-zinc-200"
              placeholder="Nome do médico conforme aparece na capa"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="bg-white dark:bg-zinc-800 p-8 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-100 dark:border-zinc-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-100 mb-6 border-b dark:border-zinc-700 pb-4">Dados do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Nome Completo</label>
            <input
              type="text"
              value={data.clientName}
              onChange={(e) => onUpdate({ clientName: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:text-zinc-200"
              placeholder="Digite o nome do cliente"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">CPF</label>
            <input
              type="text"
              value={data.clientCpf}
              onChange={(e) => onUpdate({ clientCpf: maskCPF(e.target.value) })}
              className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:text-zinc-200"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Número do Contrato</label>
            <input
              type="text"
              value={data.contractNumber}
              onChange={(e) => onUpdate({ contractNumber: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition dark:text-zinc-200"
              placeholder="Ex: 323364"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Valor do Plano (R$)</label>
            <input
              type="text"
              value={data.totalAmount}
              readOnly
              className="w-full p-3 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none transition font-semibold text-gray-600 dark:text-zinc-400 cursor-not-allowed"
              placeholder="R$ 0,00"
            />
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">Soma automática dos repasses.</p>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
        <div className="flex justify-between items-center mb-6 border-b dark:border-zinc-700 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-100">Beneficiários</h2>
          <button
            onClick={onAddBeneficiary}
            className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition"
          >
            <i className="fas fa-plus text-xs"></i>
            <span>Adicionar</span>
          </button>
        </div>

        <div className="space-y-8">
          {beneficiaries.map((b, index) => (
            <div key={b.id} className="relative p-6 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-700 group">
              <div className="flex justify-between items-center mb-4">
                <span className="bg-indigo-600 dark:bg-indigo-700 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Beneficiário {index + 1}
                </span>
                {beneficiaries.length > 1 && (
                  <button
                    onClick={() => onRemoveBeneficiary(b.id)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2 lg:col-span-3 relative">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Nome / Favorecido</label>
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => {
                      onUpdateBeneficiary(b.id, { name: e.target.value });
                      setShowSuggestions(b.id);
                    }}
                    onFocus={() => setShowSuggestions(b.id)}
                    onBlur={() => {
                      // Pequeno delay para permitir o clique nas sugestões
                      setTimeout(() => setShowSuggestions(null), 200);
                    }}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                  />
                  {showSuggestions === b.id && b.name.length >= 2 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                      <div className="p-2 text-[10px] font-bold text-gray-400 border-b dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                        SUGESTÕES DO DIRETÓRIO
                      </div>
                      {directory
                        .filter(item => item.name.toLowerCase().includes(b.name.toLowerCase()))
                        .map((item, idx) => (
                          <div
                            key={idx}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Impede o onBlur de fechar antes do clique
                              handleSelectBeneficiary(b.id, item);
                            }}
                            className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b last:border-0 dark:border-zinc-700 transition-colors"
                          >
                            <div className="font-bold text-sm dark:text-zinc-200">{item.name}</div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-1">
                              <span className="bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded">{item.bank || 'S/ Banco'}</span>
                              <span>•</span>
                              <span>{item.document}</span>
                            </div>
                          </div>
                        ))}
                      {directory.filter(item => item.name.toLowerCase().includes(b.name.toLowerCase())).length === 0 && (
                        <div className="p-4 text-xs text-gray-400 italic text-center">
                          Nenhum beneficiário salvo com este nome
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">PIX</label>
                  <input
                    type="text"
                    value={b.pix}
                    onChange={(e) => onUpdateBeneficiary(b.id, { pix: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">CPF/CNPJ</label>
                  <input
                    type="text"
                    value={b.document}
                    onChange={(e) => onUpdateBeneficiary(b.id, { document: maskCpfCnpj(e.target.value) })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Tipo Conta</label>
                  <input
                    type="text"
                    value={b.type}
                    onChange={(e) => onUpdateBeneficiary(b.id, { type: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Banco</label>
                  <input
                    type="text"
                    value={b.bank}
                    onChange={(e) => onUpdateBeneficiary(b.id, { bank: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Agência</label>
                  <input
                    type="text"
                    value={b.agency}
                    onChange={(e) => onUpdateBeneficiary(b.id, { agency: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Conta</label>
                  <input
                    type="text"
                    value={b.account}
                    onChange={(e) => onUpdateBeneficiary(b.id, { account: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded outline-none text-sm dark:text-zinc-200"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Valor do Repasse (R$)</label>
                  <input
                    type="text"
                    value={b.amount}
                    onChange={(e) => onUpdateBeneficiary(b.id, { amount: maskCurrency(e.target.value) })}
                    className="w-full p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded outline-none text-sm font-bold text-indigo-700 dark:text-indigo-400"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PaymentForm;



