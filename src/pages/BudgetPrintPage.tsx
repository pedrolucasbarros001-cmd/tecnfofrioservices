import { useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { safeFormat } from '@/utils/safeDateFormat';
import { Download, Loader2, Printer, ArrowLeft, MapPin, Phone, Mail, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import type { Customer } from '@/types/database';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { generatePDF } from '@/utils/pdfUtils';
import { COMPANY_INFO } from '@/utils/companyInfo';
import { useAuth } from '@/contexts/AuthContext';
import { usePrintSessionBridge } from '@/hooks/usePrintSessionBridge';

interface BudgetItem {
  ref?: string;
  description: string;
  details?: string;
  qty: number;
  price: number;
  tax: number;
}

interface Budget {
  id: string;
  code: string;
  created_at: string;
  status: string;
  appliance_type: string | null;
  brand: string | null;
  model: string | null;
  fault_description: string | null;
  notes: string | null;
  estimated_labor: number | null;
  estimated_parts: number | null;
  estimated_total: number | null;
  valid_until: string | null;
  pricing_description: string | null;
  customer: Customer | null;
}

export default function BudgetPrintPage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Session bridge for new tab authentication
  const { isSettling: sessionSettling } = usePrintSessionBridge();

  // Auth state from context
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Fetch budget data with customer
  const { data: budget, isLoading: loadingBudget } = useQuery({
    queryKey: ['budget-print', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', budgetId)
        .single();
      if (error) throw error;
      return data as Budget;
    },
    enabled: !!budgetId && isAuthenticated && !authLoading,
  });

  // Parse pricing_description to extract items
  const pricingDetails = useMemo(() => {
    if (!budget?.pricing_description) {
      return {
        items: [] as BudgetItem[],
        subtotal: budget?.estimated_labor || 0,
        iva: budget?.estimated_parts || 0,
        discount: 0,
        total: budget?.estimated_total || 0
      };
    }

    try {
      const parsed = JSON.parse(budget.pricing_description);
      if (parsed.items && Array.isArray(parsed.items)) {
        const items: BudgetItem[] = parsed.items;

        const subtotal = items.reduce((sum, item) => {
          return sum + (item.qty * item.price);
        }, 0);

        const iva = items.reduce((sum, item) => {
          return sum + ((item.qty * item.price) * (item.tax / 100));
        }, 0);

        const discount = typeof parsed.discount === 'number' ? parsed.discount : 0;

        return {
          items,
          subtotal,
          iva,
          discount,
          total: subtotal - discount + iva
        };
      }
    } catch {
      // Fallback to existing fields
    }

    return {
      items: [] as BudgetItem[],
      subtotal: budget.estimated_labor || 0,
      iva: budget.estimated_parts || 0,
      discount: 0,
      total: budget.estimated_total || 0
    };
  }, [budget]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printSheetRef.current || !budget) return;

    setIsGenerating(true);
    try {
      await generatePDF({
        element: printSheetRef.current,
        filename: `Orcamento-${budget.code}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Combined loading state
  const isLoading = authLoading || sessionSettling || loadingBudget;

  // If session bridge is done and we're still not authenticated, show login prompt
  const showLoginPrompt = !sessionSettling && !authLoading && !isAuthenticated;

  if (showLoginPrompt) {
    return (
      <div className="print-page">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Sessão não encontrada nesta aba.
          </p>
          <Link to={`/login?redirect=/print/budget/${budgetId}`}>
            <Button>
              <LogIn className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="print-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            {sessionSettling ? 'A verificar sessão...' : authLoading ? 'A autenticar...' : 'A carregar orçamento...'}
          </span>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="print-page">
        <div className="print-controls no-print">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Orçamento não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-page">
      {/* Controls - hidden in print */}
      <div className="print-controls no-print">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'A gerar...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* A4 Sheet - this is what prints */}
      <div ref={printSheetRef} className="print-sheet relative bg-white">
        {/* Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]"
          aria-hidden="true"
        >
          <img
            src={tecnofrioLogoIcon}
            alt=""
            className="w-[180mm] h-[180mm] object-contain"
          />
        </div>

        {/* Header Section from Image */}
        <div className="flex justify-between items-start mb-4 relative z-10 border-b-2 border-slate-900 pb-4">
          {/* Company Side */}
          <div className="w-1/2 space-y-1">
            <img
              src={tecnofrioLogoFull}
              alt="TECNOFRIO"
              className="h-10 object-contain mb-1"
            />
            <h1 className="text-sm font-bold uppercase tracking-tight">
              {COMPANY_INFO.name}
            </h1>
            <div className="text-[10px] space-y-0.5 text-slate-700 leading-tight">
              <p>{COMPANY_INFO.address.toUpperCase()}</p>
              <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.city.toUpperCase()}</p>
              <p>
                NIF: {COMPANY_INFO.nif} TELF. {COMPANY_INFO.phone.replace(/\s+/g, '')}
              </p>
              <p>E-mail : {COMPANY_INFO.email}</p>
            </div>
          </div>

          {/* Customer Side */}
          <div className="w-[45%] text-[11px] pt-10">
            <div className="space-y-1">
              <p className="font-semibold">Ex.mo Senhor(a)</p>
              <p className="text-sm font-bold uppercase">{budget.customer?.name || '---'}</p>
              {budget.customer?.address && <p>{budget.customer.address}</p>}
              <p>{budget.customer?.postal_code || ''} {budget.customer?.city || ''}</p>
              {budget.customer?.nif && <p>NIF: {budget.customer.nif}</p>}
              {budget.customer?.phone && <p>TM - {budget.customer.phone}</p>}
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-bold border-b-2 border-slate-900 pr-8">
            Relatório / Orçamento
          </h2>
          <div className="text-right">
            <p className="text-sm font-mono font-bold">{budget.code}</p>
            <p className="text-xs text-muted-foreground">
              Data: {safeFormat(budget.created_at, "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        <Separator className="my-1" />

        {/* Equipment Details (if provided) */}
        {(budget.appliance_type || budget.brand || budget.model) && (
          <>
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-1.5 border-b pb-0.5">Equipamento</h2>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {budget.appliance_type && (
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>{' '}
                    <span className="font-medium">{budget.appliance_type}</span>
                  </div>
                )}
                {budget.brand && (
                  <div>
                    <span className="text-muted-foreground">Marca:</span>{' '}
                    <span className="font-medium">{budget.brand}</span>
                  </div>
                )}
                {budget.model && (
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>{' '}
                    <span className="font-medium">{budget.model}</span>
                  </div>
                )}
              </div>
            </section>
            <Separator className="my-1" />
          </>
        )}

        {/* Fault Description */}
        {budget.fault_description && (
          <>
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-0.5 border-b pb-0.5">Descrição do Orçamento</h2>
              <p className="text-xs leading-tight">{budget.fault_description}</p>
            </section>
            <Separator className="my-1" />
          </>
        )}

        <section className="mb-3">
          <h2 className="text-xs font-semibold mb-1.5 border-b pb-0.5">Artigos</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-1.5 px-2 font-semibold w-[15%]">Ref.</th>
                <th className="text-left py-1.5 px-2 font-semibold w-[40%]">Descrição</th>
                <th className="text-center py-1.5 px-2 font-semibold w-[10%]">Qtd</th>
                <th className="text-right py-1.5 px-2 font-semibold w-[15%]">Valor Unit.</th>
                <th className="text-right py-1.5 px-2 font-semibold w-[20%]">Total</th>
              </tr>
            </thead>
            <tbody>
              {pricingDetails.items.length > 0 ? (
                pricingDetails.items.map((item, index) => {
                  const lineSubtotal = item.qty * item.price;
                  // Total per line excluding tax if that's the standard, or including it?
                  // The user reference shows "Valor Unit." and "Total". Usually Total = Qty * UnitPrice.
                  // Taxes are usually shown at the bottom.
                  const lineTotal = lineSubtotal;

                  return (
                    <tr key={index} className="border-b transition-colors hover:bg-slate-50/50 align-middle">
                      <td className="py-2 px-2">{item.ref || '-'}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium text-slate-900">{item.description}</div>
                        {item.details && (
                          <div className="text-muted-foreground text-[10px] leading-tight">
                            {item.details}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">{item.qty}</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-2 text-center text-muted-foreground">
                    Sem artigos detalhados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <div className="flex justify-end mb-3">
          <div className="w-48 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(pricingDetails.subtotal)}</span>
            </div>
            {pricingDetails.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Desconto:</span>
                <span>-{formatCurrency(pricingDetails.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">({pricingDetails.items[0]?.tax || 23}%) IVA:</span>
              <span>{formatCurrency(pricingDetails.iva)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL:</span>
              <span className="text-primary">{formatCurrency(pricingDetails.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {budget.notes && (
          <>
            <Separator className="my-1" />
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-0.5 border-b pb-0.5">Observações</h2>
              <p className="text-xs whitespace-pre-wrap leading-tight">{budget.notes}</p>
            </section>
          </>
        )}

        {/* Footer */}
        <div className="mt-4 pt-2 border-t text-xs text-muted-foreground text-center space-y-1">
          {budget.valid_until && (
            <p>
              <strong>Válido até:</strong>{' '}
              {safeFormat(budget.valid_until, "dd 'de' MMMM 'de' yyyy")}
            </p>
          )}
          <p>
            Este orçamento está sujeito a confirmação e aceitação por parte do cliente.
            Os preços apresentados incluem IVA à taxa legal em vigor.
          </p>
          <p className="text-[10px]">
            {COMPANY_INFO.name} • NIF: {COMPANY_INFO.nif}
          </p>
        </div>
      </div>
    </div>
  );
}
