'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import { Input, Select, TextArea, Button } from './FormElements';
import { Cliente } from '@/types';
import toast from 'react-hot-toast';

interface FormClienteProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  cliente?: Cliente | null;
}

export default function FormCliente({ isOpen, onClose, onSaved, cliente }: FormClienteProps) {
  const [form, setForm] = useState({
    nome: '', tipo_pessoa: 'Física', cpf_cnpj: '', rg: '', data_nascimento: '',
    cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    telefone: '', celular: '', celular2: '', email: '',
    limite_credito: 0, desconto_padrao: 0, observacao: '', status: 'Ativo'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome || '',
        tipo_pessoa: cliente.tipo_pessoa || 'Física',
        cpf_cnpj: cliente.cpf_cnpj || '',
        rg: cliente.rg || '',
        data_nascimento: cliente.data_nascimento?.split('T')[0] || '',
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        telefone: cliente.telefone || '',
        celular: cliente.celular || '',
        celular2: cliente.celular2 || '',
        email: cliente.email || '',
        limite_credito: cliente.limite_credito || 0,
        desconto_padrao: cliente.desconto_padrao || 0,
        observacao: cliente.observacao || '',
        status: cliente.status || 'Ativo',
      });
    } else {
      setForm({ nome: '', tipo_pessoa: 'Física', cpf_cnpj: '', rg: '', data_nascimento: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', telefone: '', celular: '', celular2: '', email: '', limite_credito: 0, desconto_padrao: 0, observacao: '', status: 'Ativo' });
    }
  }, [cliente, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);

    try {
      if (cliente) {
        const { error } = await supabase.from('clientes').update(form).eq('id', cliente.id);
        if (error) throw error;
        toast.success('Cliente atualizado!');
      } else {
        const { error } = await supabase.from('clientes').insert([form]);
        if (error) throw error;
        toast.success('Cliente cadastrado!');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cliente ? 'Editar Cliente' : 'Novo Cliente'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Nome" value={form.nome} onChange={handleChange} name="nome" required className="md:col-span-2" placeholder="Nome completo" />
          <Select label="Tipo" value={form.tipo_pessoa} onChange={handleChange} name="tipo_pessoa" options={[{ value: 'Física', label: 'Pessoa Física' }, { value: 'Jurídica', label: 'Pessoa Jurídica' }]} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="CPF/CNPJ" value={form.cpf_cnpj} onChange={handleChange} name="cpf_cnpj" placeholder="000.000.000-00" />
          <Input label="RG/IE" value={form.rg} onChange={handleChange} name="rg" />
          <Input label="Data Nascimento" type="date" value={form.data_nascimento} onChange={handleChange} name="data_nascimento" />
          <Input label="Email" type="email" value={form.email} onChange={handleChange} name="email" placeholder="cliente@email.com" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="CEP" value={form.cep} onChange={handleChange} name="cep" placeholder="00000-000" maxLength={9} />
          <Input label="Endereço" value={form.endereco} onChange={handleChange} name="endereco" className="md:col-span-2" placeholder="Rua, Avenida..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="Número" value={form.numero} onChange={handleChange} name="numero" />
          <Input label="Complemento" value={form.complemento} onChange={handleChange} name="complemento" />
          <Input label="Bairro" value={form.bairro} onChange={handleChange} name="bairro" />
          <Input label="Cidade" value={form.cidade} onChange={handleChange} name="cidade" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Estado" value={form.estado} onChange={handleChange} name="estado" maxLength={2} placeholder="SP" />
          <Input label="Celular" value={form.celular} onChange={handleChange} name="celular" placeholder="(11) 90000-0000" />
          <Input label="Celular 2" value={form.celular2} onChange={handleChange} name="celular2" placeholder="(11) 90000-0000" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="Limite de Crédito" type="number" value={form.limite_credito} onChange={handleChange} name="limite_credito" step="0.01" min={0} />
          <Input label="Desconto Padrão (%)" type="number" value={form.desconto_padrao} onChange={handleChange} name="desconto_padrao" step="0.01" min={0} />
          <Select label="Status" value={form.status} onChange={handleChange} name="status" options={[
            { value: 'Ativo', label: 'Ativo' },
            { value: 'Bloqueado', label: 'Bloqueado' },
            { value: 'Atenção', label: 'Atenção' },
            { value: 'Inativo', label: 'Inativo' }
          ]} />
        </div>
        <TextArea label="Observação" value={form.observacao} onChange={handleChange} name="observacao" />
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{cliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}</Button>
        </div>
      </form>
    </Modal>
  );
}
