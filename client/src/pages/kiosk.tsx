import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle, RotateCcw, X } from "lucide-react";
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
  const [showCart, setShowCart] = useState(false);
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
      setShowCart(false);
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
    <div className="min-h-screen bg-background pb-12 md:pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="pt-8 mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Package className="w-8 h-8 text-primary" />
            <h1
              className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground"
              data-testid="text-heading"
            >
              Supply Kiosk
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Select the supplies you need for your property
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
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

            <Button
              onClick={() => setShowCart(true)}
              data-testid="button-open-cart"
              className="gap-2 relative"
            >
              <ShoppingCart className="w-4 h-4" />
              View Cart
              {totalCartItems > 0 && (
                <span
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                  data-testid="text-cart-count"
                >
                  {totalCartItems}
                </span>
              )}
            </Button>
          </div>
        </header>

        {showSuccess && (
          <div
            className="mb-8 flex items-center justify-center gap-3 p-4 bg-emerald-500/20 border-2 border-emerald-500 rounded-xl text-emerald-400 font-bold text-lg animate-in fade-in"
            data-testid="checkout-success"
          >
            <CheckCircle className="w-6 h-6" />
            Checkout complete! Supplies have been deducted from inventory.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => {
            const inCart = getCartQuantity(item.id);
            const outOfStock = item.stock <= 0;

            return (
              <Card
                key={item.id}
                className={`relative overflow-visible p-0 ${outOfStock ? "opacity-50" : ""}`}
                data-testid={`item-card-${item.id}`}
              >
                <button
                  onClick={() => !outOfStock && addToCart(item.id)}
                  disabled={outOfStock}
                  className={`w-full text-left ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
                  data-testid={`button-add-item-${item.id}`}
                >
                  <div className="aspect-square relative bg-gray-800/50 rounded-t-md overflow-hidden flex items-center justify-center p-4">
                    <img
                      src={itemImages[item.id]}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      data-testid={`image-item-${item.id}`}
                    />

                    {inCart > 0 && (
                      <div
                        className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                        data-testid={`text-in-cart-${item.id}`}
                      >
                        {inCart}
                      </div>
                    )}

                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="text-red-400 font-bold text-lg font-display">
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3
                      className="text-sm font-bold text-foreground truncate"
                      data-testid={`text-item-name-${item.id}`}
                    >
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.category}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`text-lg font-display font-bold ${getStockColor(item.stock, item.maxStock)}`}
                        data-testid={`text-stock-${item.id}`}
                      >
                        {item.stock}/{item.maxStock}
                      </span>
                      {!outOfStock && (
                        <span className="text-xs text-muted-foreground">in stock</span>
                      )}
                    </div>
                  </div>
                </button>

                {inCart > 0 && (
                  <div className="px-3 pb-3 flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.id);
                      }}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span
                      className="flex-1 text-center text-sm font-bold text-foreground"
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

      {showCart && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          data-testid="cart-overlay"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCart(false)}
          />
          <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold text-foreground" data-testid="text-cart-heading">
                  Your Cart
                </h2>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowCart(false)}
                data-testid="button-close-cart"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg" data-testid="text-cart-empty">Cart is empty</p>
                  <p className="text-sm mt-1">Tap on items to add them</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((entry) => {
                    const item = items.find((i) => i.id === entry.itemId);
                    if (!item) return null;

                    return (
                      <div
                        key={entry.itemId}
                        className="flex items-center gap-3 p-3 bg-background rounded-md border border-border"
                        data-testid={`cart-item-${entry.itemId}`}
                      >
                        <img
                          src={itemImages[item.id]}
                          alt={item.name}
                          className="w-12 h-12 object-contain rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {entry.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeFromCart(entry.itemId)}
                            data-testid={`button-cart-decrease-${entry.itemId}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold text-foreground">
                            {entry.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => addToCart(entry.itemId)}
                            disabled={entry.quantity >= item.stock}
                            data-testid={`button-cart-increase-${entry.itemId}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItemFromCart(entry.itemId)}
                            data-testid={`button-cart-remove-${entry.itemId}`}
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
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Total Items</span>
                  <span
                    className="text-xl font-display font-bold text-foreground"
                    data-testid="text-cart-total"
                  >
                    {totalCartItems}
                  </span>
                </div>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={checkoutMutation.isPending}
                  data-testid="button-checkout"
                >
                  <CheckCircle className="w-5 h-5" />
                  {checkoutMutation.isPending ? "Processing..." : "Checkout"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
