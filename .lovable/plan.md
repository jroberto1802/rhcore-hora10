

# Correcao: Avaliador na lista/visualizacao + Edicao do Plano de Acao

## Problema 1: Avaliador nao aparece na lista e visualizacao

### Causa raiz
Na query de avaliacoes (linhas 150-183 de `AvaliacaoDesempenho.tsx`), o enriquecimento com nome do avaliador depende de uma segunda query a tabela `profiles`. Se essa query falhar ou retornar vazio, o codigo cai no `return data` (linha 181) que retorna os dados SEM a propriedade `avaliador`, fazendo com que `av.avaliador?.nome` seja `undefined` e mostre "-".

Alem disso, o enriquecimento pode falhar silenciosamente se `perfisError` for truthy ou `perfis` for null.

### Correcao
- Tornar o enriquecimento mais robusto: sempre retornar os dados com a propriedade `avaliador`, mesmo quando a query de profiles falhar
- Garantir que o fallback `return data` tambem inclua `avaliador: { nome: null }` para manter consistencia

**Alteracao em `src/pages/desempenho/AvaliacaoDesempenho.tsx`** (linhas 165-182):

De:
```typescript
const avaliadorIds = Array.from(new Set(...));
if (avaliadorIds.length > 0) {
  const { data: perfis, error: perfisError } = await supabase...
  if (!perfisError && perfis) {
    const mapPerfis = ...
    return (data || []).map(av => ({
      ...av,
      avaliador: { nome: mapPerfis.get(av.avaliador_id) || null },
    }));
  }
}
return data;
```

Para:
```typescript
const avaliadorIds = Array.from(new Set(...));
let mapPerfis = new Map<string, string>();
if (avaliadorIds.length > 0) {
  const { data: perfis } = await supabase
    .from("profiles")
    .select("user_id, nome")
    .in("user_id", avaliadorIds);
  if (perfis) {
    mapPerfis = new Map(perfis.map(p => [p.user_id, p.nome]));
  }
}
return (data || []).map(av => ({
  ...av,
  avaliador: { nome: mapPerfis.get(av.avaliador_id) || null },
}));
```

Assim, SEMPRE retorna dados com `avaliador` preenchido, independente de sucesso/falha na busca de profiles.

---

## Problema 2: Plano de Acao - edicao nao permite salvar nem editar competencias

### Causa raiz
Duas questoes no `PlanoAcao.tsx`:

**2a. Checkboxes ocultos na edicao (linha 747-754):**
O codigo `{!editingPlano && (<Checkbox .../>)}` esconde os checkboxes durante a edicao, impedindo que o usuario adicione ou remova competencias do plano. Alem disso, so mostra as competencias que ja estavam salvas no plano, sem carregar as demais competencias da avaliacao para que possam ser adicionadas.

**2b. Botao Salvar desabilitado:**
A condicao do botao (linhas 852-856) para edicao e `!competenciasParaPlano.some(c => c.descricao_acao.trim())`. Isso deveria funcionar se as descricoes estao preenchidas, mas se o `competenciasParaPlano` estiver vazio ou as descricoes estiverem vazias (possivel problema de carregamento), o botao fica desabilitado.

### Correcao

**2a. Permitir edicao de competencias selecionadas:**
- Ao editar, carregar TODAS as competencias da avaliacao (nao apenas as salvas no plano)
- Manter as que ja estavam no plano como `selecionada: true` com suas descricoes
- As demais ficam como `selecionada: false` (desmaracadas) para que o usuario possa adiciona-las
- Mostrar checkboxes tambem durante a edicao (remover a condicao `{!editingPlano}`)

**Alteracao em `handleEditarPlano` (linhas 305-325):**
Apos carregar os dados do plano, buscar as competencias da avaliacao e fazer merge:

```typescript
const handleEditarPlano = async (plano: PlanoAcao) => {
  setEditingPlano(plano);
  setFuncionarioSelecionado(plano.funcionario_id);
  setAvaliacaoSelecionada(plano.avaliacao_id || "");
  setResponsavel(plano.responsavel);
  setPrazo(plano.prazo);
  setStatus(plano.status as ...);
  setObservacoes(plano.observacoes || "");
  
  // Buscar TODAS as competencias da avaliacao
  if (plano.avaliacao_id) {
    const { data: compsAvaliadas } = await supabase
      .from("competencias_avaliadas")
      .select("competencia_id, nota, observacao")
      .eq("avaliacao_id", plano.avaliacao_id);
    
    if (compsAvaliadas) {
      const compIds = compsAvaliadas.map(c => c.competencia_id);
      const { data: compNomes } = await supabase
        .from("competencias")
        .select("id, nome")
        .in("id", compIds);
      const nomeMap = new Map(compNomes?.map(c => [c.id, c.nome]) || []);
      
      // Map das competencias ja salvas no plano
      const planoCompMap = new Map(
        plano.competencias.map(c => [c.competencia_id, c])
      );
      
      // Merge: todas as competencias da avaliacao, marcando as do plano
      const merged = compsAvaliadas.map(ca => {
        const existente = planoCompMap.get(ca.competencia_id);
        return {
          competencia_id: ca.competencia_id,
          competencia_nome: nomeMap.get(ca.competencia_id) || "",
          nota: ca.nota,
          observacao: ca.observacao,
          selecionada: !!existente,
          descricao_acao: existente?.descricao_acao || "",
        };
      });
      setCompetenciasParaPlano(merged);
    }
  } else {
    // Fallback: carregar apenas as do plano
    const comps = plano.competencias.map(c => ({
      competencia_id: c.competencia_id,
      competencia_nome: c.competencia_nome,
      nota: c.nota,
      observacao: null,
      selecionada: true,
      descricao_acao: c.descricao_acao
    }));
    setCompetenciasParaPlano(comps);
  }
  
  setShowForm(true);
};
```

**2b. Mostrar checkboxes durante edicao (linha 747):**
Remover a condicao `{!editingPlano && ...}` do Checkbox, tornando-o sempre visivel.

De:
```tsx
{!editingPlano && (
  <Checkbox ... />
)}
```

Para:
```tsx
<Checkbox
  id={`comp-${index}`}
  checked={comp.selecionada}
  onCheckedChange={(checked) => toggleCompetencia(index, checked as boolean)}
  className="mt-1"
/>
```

**2c. Ajustar condicao de visibilidade da Textarea (linha 770):**
De:
```tsx
{(comp.selecionada || editingPlano) && (
```
Para:
```tsx
{comp.selecionada && (
```
Agora que checkboxes estao sempre visiveis, a textarea deve depender apenas de `selecionada`.

**2d. Ajustar condicao do botao Salvar (linhas 852-856):**
Unificar a condicao para nova criacao e edicao:
```tsx
disabled={!competenciasParaPlano.some(c => c.selecionada && c.descricao_acao.trim()) || !responsavel.trim() || !prazo}
```
Incluir tambem validacao de `responsavel` e `prazo` no disabled para feedback visual imediato.

---

## Resumo dos Arquivos

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/desempenho/AvaliacaoDesempenho.tsx` | Tornar enriquecimento do avaliador robusto (sempre retorna com propriedade avaliador) |
| `src/pages/desempenho/PlanoAcao.tsx` | Permitir edicao de competencias, carregar todas as competencias da avaliacao no edit, corrigir botao salvar |

