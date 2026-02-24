

# Plano: Alinhar Mapa com Morada Real e Auditoria Geral de Fluxos/Modais

## Problema 1: Mapa nao alinhado com a morada

### Diagnostico

Os tres fluxos do tecnico (Visita, Instalacao, Entrega) abrem o Google Maps usando apenas o campo `service_address` ou `customer.address`, **sem incluir cidade, codigo postal ou "Portugal"**. Exemplo:

- Morada guardada: `Rua Padre Americo nº58`
- Google Maps recebe: `Rua Padre Americo nº58` (sem contexto geografico)
- Resultado: Google Maps pode resolver para uma rua com nome semelhante em Cascais, Lisboa ou qualquer outro sitio

### Solucao

Criar uma funcao utilitaria `buildFullAddress` que concatena todos os campos disponiveis (morada + codigo postal + cidade + "Portugal") para garantir que o Google Maps resolve corretamente.

**Novo ficheiro: `src/utils/addressUtils.ts`**

```typescript
export function buildFullAddress(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): string | null {
  const { address, postalCode, city } = parts;
  if (!address) return null;
  const segments = [address];
  if (postalCode) segments.push(postalCode);
  if (city) segments.push(city);
  segments.push('Portugal');
  return segments.join(', ');
}
```

**Atualizar `handleNavigateToClient` nos 3 ficheiros:**

- `src/components/technician/VisitFlowModals.tsx` (linha 223-231)
- `src/components/technician/DeliveryFlowModals.tsx` (linha 130-138)
- `src/components/technician/InstallationFlowModals.tsx` (linha 143-151)

Logica atualizada (igual nos 3):
```typescript
const handleNavigateToClient = () => {
  const fullAddress = buildFullAddress({
    address: service.service_address || service.customer?.address,
    postalCode: service.service_postal_code || service.customer?.postal_code,
    city: service.service_city || service.customer?.city,
  });
  if (fullAddress) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank');
  } else {
    toast.error('Morada nao disponivel');
  }
};
```

**Atualizar tambem a exibicao da morada no modal de deslocacao** para mostrar endereco completo (morada + codigo postal + cidade) em vez de so a rua:

Nos 3 ficheiros, onde aparece:
```
<p className="font-medium">{service.service_address || service.customer?.address || 'N/A'}</p>
```
Substituir por:
```
<p className="font-medium">
  {service.service_address || service.customer?.address || 'N/A'}
</p>
{(service.service_postal_code || service.customer?.postal_code || service.service_city || service.customer?.city) && (
  <p className="text-muted-foreground text-xs mt-1">
    {[service.service_postal_code || service.customer?.postal_code, service.service_city || service.customer?.city].filter(Boolean).join(', ')}
  </p>
)}
```

## Problema 2: Auditoria geral de fluxos e modais

Apos revisao completa dos ficheiros, confirmo que os restantes fluxos e modais estao nos conformes:

- Todos os `DialogContent` possuem `max-w-[95vw]` e `max-h-[90vh]`
- Scroll nativo (`overflow-y-auto`) ja aplicado em todos os modais de criacao e pedido de pecas (corrigido na mensagem anterior)
- Guardas de submissao (`isSubmitting`) presentes em todos os botoes finais
- Overlay protection (`pointer-events-none` no estado closed) ja aplicada
- Propagacao de eventos interrompida nos menus de acao

**Nenhuma alteracao adicional necessaria alem da correcao do mapa.**

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/utils/addressUtils.ts` | **Novo** - funcao `buildFullAddress` |
| `src/components/technician/VisitFlowModals.tsx` | Usar `buildFullAddress` no `handleNavigateToClient` + mostrar cidade/CP no modal |
| `src/components/technician/DeliveryFlowModals.tsx` | Idem |
| `src/components/technician/InstallationFlowModals.tsx` | Idem |

## Resultado

- Google Maps abre centrado na morada correta em Braganca (ou arredores)
- Morada completa visivel no passo de deslocacao (rua + codigo postal + cidade)
- Todos os fluxos e modais mantidos estaveis sem alteracoes adicionais

