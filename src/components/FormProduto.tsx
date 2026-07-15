
Claude terminou a resposta
que arquivo?

O arquivo remessas-page.tsx

Ele está na pasta Outputs.

Pra onde copiar:

Substitui o conteúdo de /src/app/remessas/page.tsx pelo conteúdo do remessas-page.tsx.

Basicamente:

Baixa o remessas-page.tsx da pasta Outputs
Abre seu projeto em /src/app/remessas/page.tsx
Cola o conteúdo lá
Salva
Pronto! Agora quando você deletar uma remessa, o estoque volta.

me mande novamente


Presented file
Presented file
Pronto! Está na pasta Outputs agora.

Baixa o remessas-page.tsx e substitui em /src/app/remessas/page.tsx.


Remessas page
Código · TSX 
1784081129846_image.png
pronto, deu certo, agora quando vou editar o produto, nao consigo diminuir a quantidade no estoque diretamente aqui

Entendi! Você quer poder editar a quantidade de estoque diretamente no formulário do produto, ao invés de só usar remessas.

Vou adicionar um campo de "Qtd. Estoque" no FormProduto.tsx:


Adicionar campo de quantidade estoque editável no FormProduto
Adicionar campo de quantidade estoque editável no FormProduto
Deixa eu criar o arquivo corrigido:


Criou um arquivo, leu um arquivo
Criou um arquivo, leu um arquivo
A resposta do Claude foi interrompida.
ja tem esse campo, porem nao esta funcional

Ah, entendi! O campo existe mas não funciona porque o estoque está na tabela estoque_lojas, não em produtos.quantidade_estoque.

Vou corrigir para atualizar o estoque corretamente:


Criou um arquivo, leu um arquivo
Criou um arquivo, leu um arquivo
Pronto! Agora o estoque funciona corretamente:

O que mudou:

✅ Quando edita um Produto — aparece um campo "Loja" pra selecionar qual loja
✅ Ao mudar de loja — carrega o estoque daquela loja automaticamente
✅ Ao salvar — atualiza o estoque da loja selecionada em estoque_lojas
✅ Serviços não têm estoque — o campo só aparece pra Produtos

Copia o arquivo:

/mnt/user-data/outputs/FormProduto-FUNCIONAL.tsx → /src/components/FormProduto.tsx
Testa agora editando um produto!


Formproduto funcional
Código · TSX 






Claude é uma IA e pode cometer erros. Por favor, verifique as respostas.


Formproduto funcional · TSX
'use client';
 
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import { Input, Select, TextArea, Button } from './FormElements';
import { Produto } from '@/types';
import toast from 'react-hot-toast';
 
interface FormProdutoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  produto?: Produto | null;
}
 
export default function FormProduto({ isOpen, onClose, onSaved, produto }: FormProdutoProps) {
  const [form, setForm] = useState({
    codigo: '', nome: '', tipo: 'Produto', fabricante_id: '',
    preco_venda: 0, preco_custo: 0, unidade: 'UN',
    quantidade_estoque: 0, estoque_minimo: 0, observacao: '', ativo: true,
  });
  const [fabricantes, setFabricantes] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [lojaSelectedId, setLojaSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
 
  useEffect(() => {
    if (!isOpen) return;
    carregarDados();
    if (produto) {
      setForm({
        codigo: produto.codigo || '', nome: produto.nome || '', tipo: produto.tipo || 'Produto',
        fabricante_id: produto.fabricante_id?.toString() || '',
        preco_venda: produto.preco_venda || 0, preco_custo: produto.preco_custo || 0,
        unidade: produto.unidade || 'UN', quantidade_estoque: produto.quantidade_estoque || 0,
        estoque_minimo: produto.estoque_minimo || 0, observacao: produto.observacao || '',
        ativo: produto.ativo !== false,
      });
    } else {
      setForm({ codigo: '', nome: '', tipo: 'Produto', fabricante_id: '', preco_venda: 0, preco_custo: 0, unidade: 'UN', quantidade_estoque: 0, estoque_minimo: 0, observacao: '', ativo: true });
    }
  }, [produto, isOpen]);
 
  const carregarDados = async () => {
    const [fabRes, lojasRes] = await Promise.all([
      supabase.from('fabricantes').select('*').order('nome'),
      supabase.from('lojas').select('id,nome').order('nome'),
    ]);
    if (fabRes.data) setFabricantes(fabRes.data);
    if (lojasRes.data) {
      setLojas(lojasRes.data);
      if (lojasRes.data.length > 0) setLojaSelectedId(lojasRes.data[0].id.toString());
    }
  };
 
  const carregarEstoqueAtual = async () => {
    if (!produto || !lojaSelectedId) return;
    
    const { data } = await supabase
      .from('estoque_lojas')
      .select('quantidade')
      .eq('produto_id', produto.id)
      .eq('loja_id', parseInt(lojaSelectedId))
      .maybeSingle();
 
    if (data) {
      setForm(prev => ({ ...prev, quantidade_estoque: data.quantidade }));
    } else {
      setForm(prev => ({ ...prev, quantidade_estoque: 0 }));
    }
  };
 
  useEffect(() => {
    if (produto && lojaSelectedId) {
      carregarEstoqueAtual();
    }
  }, [lojaSelectedId, produto]);
 
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: ['preco_venda', 'preco_custo', 'quantidade_estoque', 'estoque_minimo'].includes(name) ? parseFloat(value) || 0 : value }));
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      const dados = { ...form, fabricante_id: form.fabricante_id ? parseInt(form.fabricante_id) : null };
      
      if (produto) {
        // Se está editando e é produto, atualiza também o estoque
        if (produto.tipo === 'Produto' && lojaSelectedId) {
          const lojaId = parseInt(lojaSelectedId);
          
          // Busca estoque atual
          const { data: estoqueAtual } = await supabase
            .from('estoque_lojas')
            .select('id, quantidade')
            .eq('produto_id', produto.id)
            .eq('loja_id', lojaId)
            .maybeSingle();
 
          if (estoqueAtual) {
            // Atualiza quantidade
            await supabase
              .from('estoque_lojas')
              .update({ quantidade: form.quantidade_estoque, updated_at: new Date().toISOString() })
              .eq('id', estoqueAtual.id);
          } else {
            // Cria novo registro
            await supabase.from('estoque_lojas').insert([{
              produto_id: produto.id,
              loja_id: lojaId,
              quantidade: form.quantidade_estoque,
            }]);
          }
        }
 
        const { error } = await supabase.from('produtos').update(dados).eq('id', produto.id);
        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        const { data, error } = await supabase.from('produtos').insert([dados]).select();
        if (error) throw error;
        toast.success('Produto cadastrado!');
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
    <Modal isOpen={isOpen} onClose={onClose} title={produto ? 'Editar Produto' : 'Novo Produto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código" value={form.codigo} onChange={handleChange} name="codigo" placeholder="Código interno" />
          <Input label="Nome" value={form.nome} onChange={handleChange} name="nome" placeholder="Nome do produto" required className="md:col-span-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select label="Tipo" value={form.tipo} onChange={handleChange} name="tipo"
            options={[{ value: 'Produto', label: 'Produto' }, { value: 'Serviço', label: 'Serviço' }]} />
          <Select label="Fabricante" value={form.fabricante_id} onChange={handleChange} name="fabricante_id"
            options={fabricantes.map(f => ({ value: f.id, label: f.nome }))} placeholder="Selecione" />
          <Input label="Unidade" value={form.unidade} onChange={handleChange} name="unidade" placeholder="UN, PC, KG" />
          <Input label="Preço Venda" type="number" value={form.preco_venda} onChange={handleChange} name="preco_venda" step="0.01" min={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Preço Custo" type="number" value={form.preco_custo} onChange={handleChange} name="preco_custo" step="0.01" min={0} />
          <Input label="Estoque Mínimo" type="number" value={form.estoque_minimo} onChange={handleChange} name="estoque_minimo" step="0.01" min={0} />
          {produto && form.tipo === 'Produto' && (
            <div>
              <Select label="Loja" value={lojaSelectedId} onChange={(e) => setLojaSelectedId(e.target.value)} name="loja_id"
                options={lojas.map(l => ({ value: l.id, label: l.nome }))} placeholder="Selecione a loja" />
            </div>
          )}
        </div>
 
        {produto && form.tipo === 'Produto' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade em Estoque (Loja selecionada)</label>
            <Input 
              type="number" 
              value={form.quantidade_estoque} 
              onChange={handleChange} 
              name="quantidade_estoque" 
              step="0.01" 
              min={0}
              placeholder="Digite a quantidade"
            />
            <p className="text-xs text-blue-600 mt-2">💡 Altere a loja acima para editar estoque de outra unidade</p>
          </div>
        )}
 
        <TextArea label="Observação" value={form.observacao} onChange={handleChange} name="observacao" />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="ativo" className="text-sm text-gray-700">Produto ativo</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{produto ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
 


























