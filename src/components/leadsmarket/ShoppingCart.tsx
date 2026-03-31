import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  ShoppingCart as CartIcon, Trash2, Scale, MapPin, AlertCircle, Loader2, Wallet, Percent 
} from 'lucide-react';
import type { CartItem } from '@/types/marketplace';

interface ShoppingCartProps {
  items: CartItem[];
  open: boolean;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: (selectedIds: string[]) => void;
  onToggleCommission: (id: string, isCommission: boolean) => void;
  balance: number;
  isCheckingOut: boolean;
}

export function ShoppingCart({ 
  items, 
  open, 
  onClose, 
  onRemoveItem, 
  onClearCart, 
  onCheckout,
  onToggleCommission,
  balance,
  isCheckingOut
}: ShoppingCartProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map(i => i.id)));

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const subtotal = selectedItems.reduce((sum, i) => sum + (i.isCommission ? 0 : i.price), 0);
  const commissionCount = selectedItems.filter(i => i.isCommission).length;
  const canAfford = balance >= subtotal;
  const newBalance = balance - subtotal;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const handleCheckout = () => {
    onCheckout(Array.from(selectedIds));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CartIcon className="h-5 w-5" />
            Tu Carrito ({items.length} leads)
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <CartIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground">Añade leads del marketplace para comprarlos</p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 py-3 border-b">
              <Checkbox 
                id="select-all"
                checked={selectedIds.size === items.length}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Seleccionar todos ({items.length})
              </label>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 py-2">
              <div className="space-y-2">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedIds.has(item.id) ? 'bg-muted/50 border-lawfirm-primary/30' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-lawfirm-primary flex-shrink-0" />
                          <span className="font-medium truncate">{item.legalArea}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span>{item.province}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={getScoreColor(item.score)}>
                          {item.score} pts
                        </Badge>
                        {item.isCommission ? (
                          <p className="font-bold text-green-600 mt-1 text-sm">
                            0€ <span className="text-xs font-normal">({item.commissionPercent}% comisión)</span>
                          </p>
                        ) : (
                          <p className="font-bold text-lawfirm-primary mt-1">
                            {item.price.toFixed(0)}€
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Commission toggle - only for eligible areas */}
                    {item.commissionPercent != null && item.commissionPercent > 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                        <div className="flex items-center gap-2 text-sm">
                          <Percent className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-muted-foreground">
                            Modelo comisión ({item.commissionPercent}%)
                          </span>
                        </div>
                        <Switch
                          checked={item.isCommission || false}
                          onCheckedChange={(checked) => onToggleCommission(item.id, checked)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Summary */}
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Precio fijo ({selectedItems.length - commissionCount} leads):
                </span>
                <span className="font-medium">{subtotal.toFixed(2)}€</span>
              </div>
              {commissionCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5" />
                    A comisión ({commissionCount} leads):
                  </span>
                  <span className="font-medium text-green-600">0€</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  Tu saldo:
                </span>
                <span className="font-medium">{balance.toFixed(2)}€</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Saldo tras compra:</span>
                <span className={`font-bold text-lg ${canAfford ? 'text-green-600' : 'text-destructive'}`}>
                  {newBalance.toFixed(2)}€
                </span>
              </div>

              {!canAfford && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  Saldo insuficiente para esta compra
                </div>
              )}

              {commissionCount > 0 && (
                <div className="flex items-start gap-2 text-sm bg-green-500/10 p-3 rounded-lg text-green-700 dark:text-green-400">
                  <Percent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Los leads a comisión no tienen coste inicial. Se aplica un {selectedItems.find(i => i.isCommission)?.commissionPercent || 20}% sobre los honorarios cobrados al cliente y sobre el éxito obtenido.
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        <SheetFooter className="border-t pt-4 gap-2 sm:gap-2">
          {items.length > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={onClearCart}
                disabled={isCheckingOut}
              >
                Vaciar carrito
              </Button>
              <Button 
                onClick={handleCheckout}
                disabled={!canAfford || selectedItems.length === 0 || isCheckingOut}
                className="flex-1"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    💰 Comprar {selectedItems.length} lead{selectedItems.length !== 1 ? 's' : ''} 
                    {subtotal > 0 ? ` - ${subtotal.toFixed(0)}€` : ''}
                    {commissionCount > 0 ? ` + ${commissionCount} a comisión` : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Cart Button component for header
interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
}

export function CartButton({ itemCount, onClick }: CartButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick}
      className="relative gap-2"
    >
      <CartIcon className="h-4 w-4" />
      Carrito
      {itemCount > 0 && (
        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
          {itemCount}
        </Badge>
      )}
    </Button>
  );
}
