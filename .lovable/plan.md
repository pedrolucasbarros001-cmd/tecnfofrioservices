
# Plano: Refactorizar Fluxos do Tecnico para Modais Sequenciais

## Problema Identificado

Actualmente os fluxos do tecnico (Visita, Instalacao, Entrega) funcionam como paginas completas onde todas as etapas e botoes aparecem juntos. O padrao correcto ja existe no `WorkshopFlowModals.tsx` - modais sequenciais onde cada passo e um modal separado.

---

## Alteracoes Necessarias

### 1. Criar Componentes de Modais Sequenciais

#### Ficheiro: `src/components/technician/VisitFlowModals.tsx` (NOVO)

Modal sequencial para fluxo de visita com 6 passos:

| Passo | Modal | Conteudo | Botoes |
|-------|-------|----------|--------|
| 1 | Resumo | Cliente, Morada, Aparelho, Avaria reportada | "Cancelar", "Comecar Visita" |
| 2 | Deslocacao | Dados do cliente + endereco | "Caminho para Cliente" (maps), "Cheguei ao Local" |
| 3 | Foto | Area para tirar foto obrigatoria | "Tirar Foto", apos foto → "Continuar" |
| 4 | Diagnostico | Textarea para avaria detectada (obrigatoria) | "Anterior", "Continuar" |
| 5 | Decisao | RadioGroup: "Reparar no Local", "Levantar para Oficina", "Pedir Peca" | "Anterior", "Confirmar" |
| 6 | Finalizacao | Se "Reparar no Local" ou "Levantar para Oficina" → Assinatura obrigatoria | "Anterior", "Concluir Visita" |

Cores: Azul (bg-blue-500)

---

#### Ficheiro: `src/components/technician/InstallationFlowModals.tsx` (NOVO)

Modal sequencial para fluxo de instalacao com 5 passos:

| Passo | Modal | Conteudo | Botoes |
|-------|-------|----------|--------|
| 1 | Resumo | Cliente, Morada, Equipamento a instalar | "Cancelar", "Comecar Instalacao" |
| 2 | Deslocacao | Dados do cliente | "Caminho para Cliente", "Cheguei ao Local" |
| 3 | Foto Antes | Tirar foto antes da instalacao | "Tirar Foto", "Continuar" |
| 4 | Foto Depois | Tirar foto apos instalacao | "Tirar Foto", "Continuar" |
| 5 | Finalizacao | Assinatura do cliente obrigatoria | "Anterior", "Concluir Instalacao" |

Cores: Amarelo (bg-yellow-500)

---

#### Ficheiro: `src/components/technician/DeliveryFlowModals.tsx` (NOVO)

Modal sequencial para fluxo de entrega com 4 passos:

| Passo | Modal | Conteudo | Botoes |
|-------|-------|----------|--------|
| 1 | Resumo | Cliente, Morada, Item a entregar | "Cancelar", "Comecar Entrega" |
| 2 | Deslocacao | Dados da entrega | "Caminho para Cliente", "Cheguei ao Local" |
| 3 | Foto | Foto opcional da entrega | "Tirar Foto" (opcional), "Continuar" |
| 4 | Finalizacao | Assinatura do cliente obrigatoria | "Anterior", "Marcar como Entregue" |

Cores: Verde (bg-green-500)

---

### 2. Actualizar ServicosPage.tsx (Agenda Semanal)

Alterar o `ServiceCard` para:
- Parar de navegar para paginas ao clicar
- Adicionar botao "Comecar [Tipo]" visivel em cada card
- Ao clicar no botao, abrir o modal sequencial correcto

```text
Estrutura do Card:
+---------------------------+
| OS-00001        [VISITA]  |
| Pedro Cliente             |
| Frigorifico - quebrou     |
| [Manha]  [Urg] [Gar]      |
| [   Comecar Visita    ]   | ← Botao novo
+---------------------------+
```

Cores dos botoes por tipo:
- Visita: bg-blue-500
- Instalacao: bg-yellow-500 text-black
- Entrega: bg-green-500
- Oficina: bg-orange-500 (ja existe)

---

### 3. Gestao de Estado

Adicionar estado no `ServicosPage.tsx`:

```typescript
const [selectedService, setSelectedService] = useState<Service | null>(null);
const [flowType, setFlowType] = useState<'visit' | 'installation' | 'delivery' | null>(null);

const handleStartFlow = (service: Service) => {
  setSelectedService(service);
  if (service.service_type === 'entrega') {
    setFlowType('delivery');
  } else if (service.service_type === 'instalacao') {
    setFlowType('installation');
  } else {
    setFlowType('visit');
  }
};
```

---

### 4. Estrutura de cada Modal de Fluxo

Seguir o padrao do `WorkshopFlowModals.tsx`:

```typescript
interface VisitFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ModalStep = 'resumo' | 'deslocacao' | 'foto' | 'diagnostico' | 'decisao' | 'finalizacao';

export function VisitFlowModals({ service, isOpen, onClose, onComplete }: VisitFlowModalsProps) {
  const [currentStep, setCurrentStep] = useState<ModalStep>('resumo');
  
  // Cada step e um Dialog separado
  return (
    <>
      <Dialog open={currentStep === 'resumo'}>...</Dialog>
      <Dialog open={currentStep === 'deslocacao'}>...</Dialog>
      <Dialog open={currentStep === 'foto'}>...</Dialog>
      <Dialog open={currentStep === 'diagnostico'}>...</Dialog>
      <Dialog open={currentStep === 'decisao'}>...</Dialog>
      <Dialog open={currentStep === 'finalizacao'}>...</Dialog>
    </>
  );
}
```

---

### 5. Remover/Depreciar Paginas de Fluxo

As paginas separadas podem ser mantidas para acesso via QR Code, mas o fluxo principal passa a ser por modais:

- `TechnicianVisitFlow.tsx` → Redirecionar para modais ou manter para QR
- `TechnicianInstallationFlow.tsx` → Redirecionar para modais ou manter para QR
- `TechnicianDeliveryFlow.tsx` → Redirecionar para modais ou manter para QR

---

### 6. Barra de Progresso

Cada conjunto de modais tera uma barra de progresso visual:

```text
Visita (6 passos):
[====][    ][    ][    ][    ][    ] Passo 1/6

Instalacao (5 passos):
[====][====][    ][    ][    ] Passo 2/5

Entrega (4 passos):
[====][====][====][    ] Passo 3/4
```

---

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/technician/VisitFlowModals.tsx` | Modais sequenciais para visita (azul) |
| `src/components/technician/InstallationFlowModals.tsx` | Modais sequenciais para instalacao (amarelo) |
| `src/components/technician/DeliveryFlowModals.tsx` | Modais sequenciais para entrega (verde) |

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/ServicosPage.tsx` | Adicionar botao "Comecar" nos cards + estado para modais |

---

## Fluxo Visual Final

```text
1. Tecnico abre app → Ve agenda semanal com cards
2. Cada card tem botao "Comecar [Tipo]"
3. Clica "Comecar Visita" → Abre Modal 1 (Resumo)
4. Clica "Comecar Visita" → Fecha Modal 1, Abre Modal 2 (Deslocacao)
5. Clica "Caminho" (abre Maps) ou "Cheguei" → Fecha Modal 2, Abre Modal 3 (Foto)
6. Tira foto → Fecha Modal 3, Abre Modal 4 (Diagnostico)
7. Preenche diagnostico → Fecha Modal 4, Abre Modal 5 (Decisao)
8. Escolhe opcao → Fecha Modal 5, Abre Modal 6 (Finalizacao/Assinatura)
9. Cliente assina → Servico actualizado, modais fecham, lista actualiza
```

---

## Cores Consistentes

| Tipo de Servico | Cor Principal | Botao |
|-----------------|---------------|-------|
| Visita | Azul | bg-blue-500 |
| Oficina | Laranja | bg-orange-500 |
| Instalacao | Amarelo | bg-yellow-500 text-black |
| Entrega | Verde | bg-green-500 |
