

# Plano Completo: Sistema de Onboarding TECNOFRIO - Ponta a Ponta

## Resumo Executivo

Este plano implementa um sistema de onboarding premium, visual e guiado, personalizado por cargo (Dono, Secretaria, Tecnico). O onboarding cobre TODAS as paginas e funcionalidades do sistema, de ponta a ponta, com imagens geradas automaticamente atraves da API de IA disponivel no projeto.

---

## 1. Mapeamento Completo do Sistema por Cargo

### 1.1 DONO (Administrador) - 8 Paginas

| Pagina | Rota | Funcionalidades Chave |
|--------|------|----------------------|
| Dashboard | /dashboard | Visao geral, contadores por estado, navegacao rapida |
| Geral | /geral | Agenda semanal, criar servicos, atribuir tecnicos, gerir estados |
| Oficina | /oficina | Monitor TV, enviar tarefas, ver servicos na oficina |
| Clientes | /clientes | Criar/editar clientes, perfil completo |
| Orcamentos | /orcamentos | Criar orcamentos, aprovar/recusar, converter em servico |
| Performance | /performance | Graficos por tecnico, carga de trabalho |
| Colaboradores | /colaboradores | Convidar utilizadores, atribuir cargos, ativar/desativar |
| Preferencias | /preferencias | Tema, notificacoes, alterar palavra-passe |

### 1.2 SECRETARIA - 6 Paginas

| Pagina | Rota | Funcionalidades Chave |
|--------|------|----------------------|
| Geral | /geral | Lista de servicos, criar servicos, atribuir tecnicos |
| Oficina | /oficina | Servicos na oficina, monitor TV |
| Concluidos | /concluidos | Gerir entregas, dar baixa, contactar cliente |
| Em Debito | /em-debito | Registar pagamentos, ver valores em falta |
| Clientes | /clientes | Gerir base de clientes |
| Preferencias | /preferencias | Configuracoes pessoais |

### 1.3 TECNICO - 4 Paginas + 3 Fluxos

| Pagina/Fluxo | Rota | Funcionalidades Chave |
|--------------|------|----------------------|
| Servicos | /servicos | Agenda semanal, comecar servicos |
| Oficina | /oficina-tecnico | Assumir servicos, reparar na oficina |
| Perfil | /perfil | Dados pessoais |
| Preferencias | /preferencias | Configuracoes |
| Fluxo Visita | /technician/visit/:id | Deslocacao, diagnostico, foto, decisao, assinatura |
| Fluxo Instalacao | /technician/installation/:id | Foto antes, materiais, foto depois, assinatura |
| Fluxo Entrega | /technician/delivery/:id | Deslocacao, foto, assinatura |

---

## 2. Conteudo Detalhado do Onboarding por Cargo

### 2.1 ONBOARDING DONO (12 Passos)

| Passo | Titulo | Descricao | Imagem/Referencia Visual |
|-------|--------|-----------|--------------------------|
| 1 | Bem-vindo ao TECNOFRIO | "Este e o seu centro de controlo. Aqui gere toda a operacao da empresa, desde servicos ate colaboradores." | Logo + Dashboard preview |
| 2 | Dashboard - Visao Geral | "O Dashboard mostra o estado de todos os servicos num relance. Clique em qualquer cartao para ver os detalhes." | Dashboard com contadores |
| 3 | Gestao Geral | "A pagina Geral e onde tudo acontece. Veja todos os servicos, filtre por estado e use a agenda semanal." | Lista de servicos + Agenda |
| 4 | Agenda Dinamica | "A agenda no topo mostra quantos servicos existem por dia e por tecnico. Clique num dia para filtrar." | Agenda semanal destacada |
| 5 | Criar Servicos | "Clique em 'Novo Servico' para criar uma Reparacao, Instalacao ou Entrega. O tipo escolhido define todo o fluxo." | Dropdown de criacao |
| 6 | Reparacao: Visita ou Oficina | "Ao criar uma reparacao, escolha se o tecnico vai ao cliente ou se o aparelho ja esta na oficina." | Modal de criacao de servico |
| 7 | Atribuir Tecnicos | "Atribua um tecnico e agende a data. O tecnico recebe o servico automaticamente na sua agenda." | Modal de atribuicao |
| 8 | Ficha de Servico | "Clique em qualquer servico para ver todos os detalhes: historico, fotos, assinaturas e pagamentos." | Painel lateral de detalhes |
| 9 | Estados Coexistentes | "Um servico pode estar 'Concluido' e 'Em Debito' ao mesmo tempo. Isso nao e erro, e controlo inteligente." | Badges de estado |
| 10 | Pedidos de Peca | "Quando o tecnico pede uma peca, voce recebe uma notificacao. Registe a encomenda e a previsao de chegada." | Estado 'Para Pedir Peca' |
| 11 | Colaboradores | "Convide novos utilizadores por email. Escolha o cargo: Administrador, Secretaria ou Tecnico." | Pagina de colaboradores |
| 12 | Comece a Usar | "Voce controla decisoes, excepcoes e dinheiro. O sistema cuida do resto. Bom trabalho!" | Logo TECNOFRIO |

### 2.2 ONBOARDING SECRETARIA (8 Passos)

| Passo | Titulo | Descricao | Imagem/Referencia Visual |
|-------|--------|-----------|--------------------------|
| 1 | Bem-vinda ao TECNOFRIO | "O seu papel e essencial: organizar, cobrar e garantir que os servicos fluem sem problemas." | Logo + Visao geral |
| 2 | Gestao Geral | "Aqui veja todos os servicos activos. Pode criar novos, atribuir tecnicos e acompanhar o progresso." | Pagina Geral |
| 3 | Criar Servicos | "Quando um cliente liga, crie o servico aqui. Preencha os dados e atribua a um tecnico." | Modal de criacao |
| 4 | Oficina | "Acompanhe os servicos que estao fisicamente na oficina. Use o monitor TV para visualizacao publica." | Pagina Oficina |
| 5 | Concluidos | "Servicos concluidos aguardam entrega ou recolha. Escolha o metodo: tecnico entrega ou cliente recolhe." | Pagina Concluidos |
| 6 | Em Debito | "Servicos com pagamento pendente aparecem aqui. Veja quanto falta e registe pagamentos parciais ou totais." | Pagina Em Debito |
| 7 | Registar Pagamentos | "Clique em 'Registar' para adicionar um pagamento. O sistema calcula automaticamente o valor em falta." | Modal de pagamento |
| 8 | Comece a Usar | "Mantem o fluxo a andar e o caixa organizado. O sistema ajuda-a em cada passo." | Logo TECNOFRIO |

### 2.3 ONBOARDING TECNICO (10 Passos)

| Passo | Titulo | Descricao | Imagem/Referencia Visual |
|-------|--------|-----------|--------------------------|
| 1 | Bem-vindo ao TECNOFRIO | "Este e o seu espaco de trabalho. Aqui ve os servicos que tem de executar e regista tudo o que faz." | Logo + Servicos |
| 2 | Agenda Semanal | "Os seus servicos aparecem organizados por dia. Veja o que tem para hoje e para a semana." | Pagina Servicos com agenda |
| 3 | Tipos de Servico | "Cada cartao mostra o tipo: Visita (azul), Instalacao (amarelo) ou Entrega (verde)." | Cards de servico coloridos |
| 4 | Comecar Servico | "Clique em 'Comecar' quando estiver pronto. O sistema guia-o passo a passo ate ao fim." | Botao Comecar destacado |
| 5 | Fluxo de Visita | "Primeiro, navegue ate ao cliente. Depois, registe o diagnostico, tire fotos e decida o proximo passo." | Passos do fluxo de visita |
| 6 | Decisoes na Visita | "Pode reparar no local, levar para a oficina ou pedir uma peca. Cada escolha adapta o fluxo." | Opcoes de decisao |
| 7 | Oficina do Tecnico | "Servicos na oficina aparecem aqui. Pode assumir servicos sem tecnico ou continuar os seus." | Pagina Oficina Tecnico |
| 8 | Pedir Pecas | "Se precisar de uma peca, registe o pedido. O escritorio e notificado e encomenda por si." | Modal de pedir peca |
| 9 | Assinaturas | "As assinaturas confirmam decisoes importantes. O cliente assina no ecra. Pode apagar e refazer se errar." | Ecra de assinatura |
| 10 | Comece a Usar | "Execute bem. O sistema regista tudo e garante continuidade se outro tecnico assumir." | Logo TECNOFRIO |

---

## 3. Arquitectura Tecnica

### 3.1 Estrutura de Ficheiros

```text
src/
├── components/
│   └── onboarding/
│       ├── OnboardingModal.tsx        # Modal principal
│       ├── OnboardingStep.tsx         # Componente de cada passo
│       ├── OnboardingProgress.tsx     # Barra de progresso
│       ├── OnboardingImage.tsx        # Componente de imagem/GIF
│       └── onboardingContent.ts       # Conteudo por cargo
├── contexts/
│   └── OnboardingContext.tsx          # Estado global
└── hooks/
    └── useOnboarding.ts               # Hook de controlo
```

### 3.2 Migracao de Base de Dados

```sql
-- Adicionar colunas de onboarding na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Marcar utilizadores existentes como ja com onboarding concluido
-- (para nao verem o onboarding na proxima vez que entrarem)
UPDATE public.profiles
SET onboarding_completed = TRUE, onboarding_step = 999
WHERE onboarding_completed IS NULL;
```

### 3.3 Actualizacao de Types

```typescript
// src/types/database.ts
export interface Profile {
  // ... campos existentes ...
  onboarding_completed: boolean;
  onboarding_step: number;
}
```

---

## 4. Geracao de Imagens com IA

O projeto tem `LOVABLE_API_KEY` configurado, o que permite usar a API Nano banana (google/gemini-2.5-flash-image) para gerar imagens.

### 4.1 Estrategia de Imagens

Para cada passo do onboarding, sera gerada uma imagem ilustrativa:

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| Icones Conceptuais | Ilustracoes minimalistas do conceito | Dashboard com graficos, lista de servicos |
| Screenshots Estilizados | Representacoes simplificadas das paginas | Agenda semanal, modal de criacao |
| Diagramas de Fluxo | Passos de processos | Fluxo de visita: diagnostico → foto → decisao |

### 4.2 Componente de Geracao

```typescript
// src/components/onboarding/OnboardingImage.tsx
// Componente que gera e cacheia imagens usando a API de IA
// As imagens sao geradas uma vez e guardadas em storage
```

### 4.3 Prompts de Geracao (Exemplos)

```text
Passo Dashboard:
"Clean, modern dashboard interface illustration showing 10 status cards in a grid layout. Minimalist style with blue (#2B4F84) accent color. White background, professional business software aesthetic. No text, icons only."

Passo Agenda:
"Weekly calendar interface with service cards organized by day. Clean modern UI design. Blue (#2B4F84) primary color. Professional software illustration style."

Passo Fluxo Tecnico:
"Step-by-step workflow illustration: navigation pin → diagnostic clipboard → camera → signature. Connected by arrows. Clean minimalist style, blue accent color."
```

### 4.4 Fallback de Imagens

Se a geracao falhar, usar icones Lucide em grande escala como fallback:
- Dashboard: `LayoutDashboard` com contadores
- Agenda: `Calendar` com cards
- Servicos: `ClipboardList` com checkmarks

---

## 5. Componentes a Criar

### 5.1 OnboardingContext.tsx

```typescript
interface OnboardingContextType {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  role: AppRole;
  content: OnboardingStep[];
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
  openOnboarding: () => void;
}
```

### 5.2 OnboardingModal.tsx

Estrutura visual premium:

```text
┌──────────────────────────────────────────────────────────────────┐
│  [X]                                                             │
│  ╔══════════════════════════════════════════════════════════╗   │
│  ║                                                          ║   │
│  ║                                                          ║   │
│  ║              [IMAGEM ILUSTRATIVA]                        ║   │
│  ║               (aspect-ratio 16:9)                        ║   │
│  ║                                                          ║   │
│  ║                                                          ║   │
│  ╠══════════════════════════════════════════════════════════╣   │
│  ║                                                          ║   │
│  ║  Titulo do Passo                                         ║   │
│  ║                                                          ║   │
│  ║  Descricao curta e humana que explica o que             ║   │
│  ║  este passo representa no sistema. Linguagem            ║   │
│  ║  simples e directa.                                      ║   │
│  ║                                                          ║   │
│  ╠══════════════════════════════════════════════════════════╣   │
│  ║                                                          ║   │
│  ║  ● ○ ○ ○ ○ ○ ○ ○   1/12                                 ║   │
│  ║                                                          ║   │
│  ║  [Saltar guia]                           [Proximo →]    ║   │
│  ║                                                          ║   │
│  ╚══════════════════════════════════════════════════════════╝   │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 OnboardingProgress.tsx

```typescript
interface OnboardingProgressProps {
  current: number;
  total: number;
}
// Dots + contador numerico discreto
```

### 5.4 onboardingContent.ts

```typescript
interface OnboardingStepContent {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;        // Prompt para gerar imagem
  fallbackIcon: LucideIcon;   // Icone fallback
  page?: string;              // Pagina de referencia
}

export const ONBOARDING_CONTENT: Record<AppRole, OnboardingStepContent[]> = {
  dono: [...],      // 12 passos
  secretaria: [...], // 8 passos
  tecnico: [...],   // 10 passos
};
```

---

## 6. Integracao no Sistema

### 6.1 App.tsx

```typescript
// Adicionar OnboardingProvider
<AuthProvider>
  <OnboardingProvider>
    <Routes>...</Routes>
  </OnboardingProvider>
</AuthProvider>
```

### 6.2 AppLayout.tsx

```typescript
export function AppLayout() {
  const { isOpen } = useOnboarding();
  
  return (
    <SidebarProvider>
      {/* ... sidebar ... */}
      <SidebarInset>
        {/* ... header e conteudo ... */}
      </SidebarInset>
      
      {/* Onboarding Modal */}
      {isOpen && <OnboardingModal />}
    </SidebarProvider>
  );
}
```

### 6.3 PreferenciasPage.tsx

Adicionar card para revisitar o onboarding:

```typescript
{/* Guia do Sistema Card */}
<Card>
  <CardHeader>
    <CardTitle className="text-lg flex items-center gap-2">
      <BookOpen className="h-5 w-5" />
      Guia do Sistema
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>Tutorial</Label>
        <p className="text-sm text-muted-foreground">
          Rever o guia de utilizacao do sistema
        </p>
      </div>
      <Button variant="outline" onClick={openOnboarding}>
        Ver Guia
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 7. Fluxo de Persistencia

### 7.1 Guardar Progresso

```typescript
// Ao mudar de passo ou fechar modal
await supabase
  .from('profiles')
  .update({ onboarding_step: currentStep })
  .eq('user_id', userId);
```

### 7.2 Retomar Progresso

```typescript
// Ao abrir o sistema
const { data } = await supabase
  .from('profiles')
  .select('onboarding_step, onboarding_completed')
  .eq('user_id', userId)
  .single();

if (!data.onboarding_completed && data.onboarding_step > 0) {
  setCurrentStep(data.onboarding_step);
  openOnboarding();
}
```

### 7.3 Concluir Onboarding

```typescript
// No ultimo passo
await supabase
  .from('profiles')
  .update({ 
    onboarding_completed: true,
    onboarding_step: totalSteps 
  })
  .eq('user_id', userId);
```

---

## 8. Regras de Comportamento

| Regra | Descricao |
|-------|-----------|
| Primeiro login | Mostrar onboarding automaticamente |
| Novo utilizador | Sempre comecar do passo 1 |
| Sair a meio | Guardar progresso, retomar na proxima vez |
| Saltar | Marcar como concluido imediatamente |
| Revisitar | Botao em Preferencias permite rever |
| Utilizadores existentes | Migracao marca como concluido |

---

## 9. Design Visual

### 9.1 Cores

| Elemento | Valor |
|----------|-------|
| Fundo modal | `bg-white dark:bg-slate-900` |
| Backdrop | `bg-black/60 backdrop-blur-sm` |
| Titulo | `text-foreground` |
| Descricao | `text-muted-foreground` |
| Botao primario | `bg-primary text-white` |
| Dots activos | `bg-primary` |
| Dots inactivos | `bg-muted` |

### 9.2 Animacoes

- Modal: fade-in + scale suave (200ms)
- Transicao entre passos: slide horizontal (150ms)
- Dots: transicao de cor suave (100ms)

### 9.3 Responsividade

- Desktop: Modal 600px largura, imagem 16:9
- Tablet: Modal 90% largura, imagem 4:3
- Mobile: Modal fullscreen, imagem 1:1 compacta

---

## 10. Ficheiros a Criar/Modificar

| Ficheiro | Accao | Linhas Estimadas |
|----------|-------|------------------|
| `supabase/migrations/[timestamp]_onboarding.sql` | Criar | 15 |
| `src/types/database.ts` | Modificar | 5 |
| `src/contexts/OnboardingContext.tsx` | Criar | 150 |
| `src/hooks/useOnboarding.ts` | Criar | 30 |
| `src/components/onboarding/onboardingContent.ts` | Criar | 200 |
| `src/components/onboarding/OnboardingModal.tsx` | Criar | 250 |
| `src/components/onboarding/OnboardingStep.tsx` | Criar | 80 |
| `src/components/onboarding/OnboardingProgress.tsx` | Criar | 40 |
| `src/components/onboarding/OnboardingImage.tsx` | Criar | 100 |
| `src/App.tsx` | Modificar | 10 |
| `src/components/layouts/AppLayout.tsx` | Modificar | 15 |
| `src/pages/PreferenciasPage.tsx` | Modificar | 25 |
| `src/contexts/AuthContext.tsx` | Modificar | 10 |

---

## 11. Ordem de Implementacao

**Fase 1 - Base de Dados e Types (Primeiro)**
1. Criar migracao SQL
2. Actualizar types

**Fase 2 - Contexto e Hook**
3. Criar OnboardingContext
4. Criar useOnboarding

**Fase 3 - Conteudo**
5. Criar onboardingContent.ts (todo o texto por cargo)

**Fase 4 - Componentes UI**
6. Criar OnboardingProgress
7. Criar OnboardingStep
8. Criar OnboardingImage
9. Criar OnboardingModal

**Fase 5 - Integracao**
10. Modificar App.tsx (provider)
11. Modificar AppLayout.tsx (renderizacao)
12. Modificar AuthContext (carregar estado)
13. Modificar PreferenciasPage (botao revisitar)

---

## 12. Garantia de Geracao de Imagens

Confirmo que consigo criar as imagens para o onboarding:

- O projeto tem `LOVABLE_API_KEY` configurado
- A API Nano banana (google/gemini-2.5-flash-image) esta disponivel
- Posso gerar imagens ilustrativas para cada passo
- As imagens serao guardadas em storage para reutilizacao
- Fallback com icones Lucide se a geracao falhar

As imagens serao:
- Estilo minimalista e profissional
- Cores da marca (#2B4F84 azul institucional)
- Sem texto (apenas elementos visuais)
- Formato 16:9 para consistencia
- Geradas uma vez e cacheadas

---

## 13. Resultado Final

Com este onboarding:

- Nao e necessario treinar utilizadores presencialmente
- O sistema explica-se sozinho
- Cada cargo ve apenas o que e relevante
- O utilizador entende: o que fazer, quando fazer, porque fazer
- Continuidade garantida se sair a meio
- Pode revisitar a qualquer momento

Isto coloca o TECNOFRIO no nivel de software empresarial serio, nao ferramenta improvisada.

