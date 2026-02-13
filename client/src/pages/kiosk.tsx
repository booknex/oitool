import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle, RotateCcw } from "lucide-react";
import { type InventoryItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { itemImages } from "@/lib/itemData";

interface CartEntry {
  itemId: number;
  quantity: number;
}

export default function Kiosk() {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/items"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (cartItems: CartEntry[]) => {
      return apiRequest("POST", "/api/cart/checkout", { items: cartItems });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setCart([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restockMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/items/restock-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Inventory Restocked",
        description: "All items have been restocked to full capacity.",
      });
    },
  });

  const addToCart = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const existing = cart.find((c) => c.itemId === itemId);
    const currentInCart = existing?.quantity || 0;

    if (currentInCart >= item.stock) {
      toast({
        title: "Not enough stock",
        description: `Only ${item.stock} available for ${item.name}.`,
        variant: "destructive",
      });
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.itemId === itemId ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart((prev) => [...prev, { itemId, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((c) => c.itemId !== itemId);
      }
      return prev.map((c) =>
        c.itemId === itemId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const removeItemFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  };

  const getCartQuantity = (itemId: number) => {
    return cart.find((c) => c.itemId === itemId)?.quantity || 0;
  };

  const totalCartItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    checkoutMutation.mutate(cart);
  };

  const getStockColor = (stock: number, maxStock: number) => {
    const ratio = stock / maxStock;
    if (ratio <= 0) return "text-red-500";
    if (ratio <= 0.25) return "text-red-400";
    if (ratio <= 0.5) return "text-yellow-400";
    return "text-emerald-400";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <h1
            className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground"
            data-testid="text-heading"
          >
            Supply Kiosk
          </h1>
        </div>
        <p className="text-sm text-muted-foreground hidden md:block">
          Select the supplies you need for your property
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => restockMutation.mutate()}
          disabled={restockMutation.isPending}
          data-testid="button-restock-all"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Restock All
        </Button>
      </header>

      {showSuccess && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/20 border-b border-emerald-500 text-emerald-400 font-bold text-sm flex-shrink-0"
          data-testid="checkout-success"
        >
          <CheckCircle className="w-4 h-4" />
          Checkout complete! Supplies have been deducted from inventory.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {items.map((item) => {
              const inCart = getCartQuantity(item.id);
              const outOfStock = item.stock <= 0;

              return (
                <Card
                  key={item.id}
                  className={`relative overflow-visible p-0 ${outOfStock ? "opacity-50" : ""} ${inCart > 0 ? "ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.3)]" : ""}`}
                  data-testid={`item-card-${item.id}`}
                >
                  <button
                    onClick={() => !outOfStock && addToCart(item.id)}
                    disabled={outOfStock}
                    className={`w-full text-left ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
                    data-testid={`button-add-item-${item.id}`}
                  >
                    <div className="aspect-square relative bg-gray-800/50 rounded-t-md overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={itemImages[item.id]}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        data-testid={`image-item-${item.id}`}
                      />

                      {inCart > 0 && (
                        <div
                          className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                          data-testid={`text-in-cart-${item.id}`}
                        >
                          {inCart}
                        </div>
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="text-red-400 font-bold text-xs font-display">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-2">
                      <h3
                        className="text-xs font-bold text-foreground truncate"
                        data-testid={`text-item-name-${item.id}`}
                      >
                        {item.name}
                      </h3>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span
                          className={`text-sm font-display font-bold ${getStockColor(item.stock, item.maxStock)}`}
                          data-testid={`text-stock-${item.id}`}
                        >
                          {item.stock}/{item.maxStock}
                        </span>
                      </div>
                    </div>
                  </button>

                  {inCart > 0 && (
                    <div className="px-2 pb-2 flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(item.id);
                        }}
                        data-testid={`button-decrease-${item.id}`}
                        className="h-6 w-6"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span
                        className="flex-1 text-center text-xs font-bold text-foreground"
                        data-testid={`text-qty-${item.id}`}
                      >
                        {inCart}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item.id);
                        }}
                        disabled={inCart >= item.stock}
                        data-testid={`button-increase-${item.id}`}
                        className="h-6 w-6"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div
          className="w-72 md:w-80 border-l border-border bg-card flex flex-col flex-shrink-0"
          data-testid="cart-panel"
        >
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground" data-testid="text-cart-heading">
              Your Cart
            </h2>
            {totalCartItems > 0 && (
              <span
                className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full"
                data-testid="text-cart-count"
              >
                {totalCartItems}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm" data-testid="text-cart-empty">Cart is empty</p>
                <p className="text-xs mt-1">Tap items to add them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((entry) => {
                  const item = items.find((i) => i.id === entry.itemId);
                  if (!item) return null;

                  return (
                    <div
                      key={entry.itemId}
                      className="flex items-center gap-2 p-2 bg-background rounded-md border border-border"
                      data-testid={`cart-item-${entry.itemId}`}
                    >
                      <img
                        src={itemImages[item.id]}
                        alt={item.name}
                        className="w-9 h-9 object-contain rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Qty: {entry.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFromCart(entry.itemId)}
                          data-testid={`button-cart-decrease-${entry.itemId}`}
                          className="h-6 w-6"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-5 text-center text-xs font-bold text-foreground">
                          {entry.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => addToCart(entry.itemId)}
                          disabled={entry.quantity >= item.stock}
                          data-testid={`button-cart-increase-${entry.itemId}`}
                          className="h-6 w-6"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItemFromCart(entry.itemId)}
                          data-testid={`button-cart-remove-${entry.itemId}`}
                          className="h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-3 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total Items</span>
                <span
                  className="text-lg font-display font-bold text-foreground"
                  data-testid="text-cart-total"
                >
                  {totalCartItems}
                </span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                data-testid="button-checkout"
              >
                <CheckCircle className="w-4 h-4" />
                {checkoutMutation.isPending ? "Processing..." : "Checkout"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
