# Diretrizes de Fuso Horário

Todo o projeto agora usa **fuso horário do Brasil (UTC-3)** consistentemente.

## Como usar datas

**❌ NÃO use:**
```javascript
new Date().toISOString()  // UTC
new Date().toISOString().split('T')[0]  // UTC
new Date().toLocaleDateString('pt-BR')  // Varia por computador
```

**✅ USE:**
```javascript
import { getLocalDateString, formatDateTimeForDB } from '@/lib/dateUtils';

// Para datas (YYYY-MM-DD)
getLocalDateString()  // Data de hoje em horário local

// Para timestamps (YYYY-MM-DDTHH:MM:SS)
formatDateTimeForDB()  // Agora com horário local
```

## Função de Helper

| Função | Saída | Uso |
|--------|-------|-----|
| `getLocalDateString(date?)` | `2026-07-15` | Salvar data no banco |
| `formatDateTimeForDB(date?)` | `2026-07-15T14:30:45` | Salvar timestamp no banco |

## Regra de Ouro

**Sempre que for adicionar código que trabalha com datas, use as funções de `dateUtils`.**

## Exemplo

```typescript
import { getLocalDateString, formatDateTimeForDB } from '@/lib/dateUtils';

// Ao criar uma venda
const vendaData = {
  data_venda: getLocalDateString(),  // ✅
  created_at: formatDateTimeForDB(),  // ✅
};

// Ao atualizar um registro
await supabase.from('tabela').update({
  updated_at: formatDateTimeForDB()  // ✅
});
```
