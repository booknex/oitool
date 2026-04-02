import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle, RotateCcw, ChevronDown, Settings, X, Save, PlusCircle, Maximize, Minimize, ChevronLeft } from "lucide-react";
import { type InventoryItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { itemImages } from "@/lib/itemData";

const spanishNames: Record<string, string> = {
  "All-Purpose Cleaner": "Limpiador Multiusos",
  "Glass Cleaner": "Limpiador de Vidrios",
  "Disinfectant Spray": "Spray Desinfectante",
  "Microfiber Cloths": "Pa\u00f1os de Microfibra",
  "Sponges": "Esponjas",
  "Trash Bags": "Bolsas de Basura",
  "Toilet Bowl Cleaner": "Limpiador de Inodoro",
  "Floor Cleaner": "Limpiador de Pisos",
  "Dusting Spray": "Spray para Polvo",
  "Rubber Gloves": "Guantes de Goma",
  "Mop Heads": "Cabezas de Trapeador",
  "Vacuum Bags": "Bolsas de Aspiradora",
  "Water Bottles": "Botellas de Agua",
  "Wash Cloths": "Pa\u00f1os de Lavado",
  "Paper Towels": "Toallas de Papel",
  "Salt": "Sal",
  "Pepper": "Pimienta",
  "Diffuser Oil": "Aceite para Difusor",
  "Bleach": "Cloro",
  "Dish Soap Re-fill": "Recarga de Jab\u00f3n para Platos",
  "Mini Dish Soap": "Mini Jab\u00f3n para Platos",
  "Broom": "Escoba",
  "Mop": "Trapeador",
  "Dust Pan": "Recogedor",
  "Mop Bucket": "Cubeta para Trapeador",
  "Glass Cook Top": "Limpiador de Estufa de Vidrio",
  "Scorch Pad": "Estropajo",
  "Hand Soap Refill": "Recarga de Jab\u00f3n de Manos",
  "Coffee Packs": "Paquetes de Caf\u00e9",
  "Bathroom Trash Bags": "Bolsas de Basura para Ba\u00f1o",
  "Scrub Brushes": "Cepillos de Fregar",
  "Masks": "Mascarillas",
  "Spray Bottle": "Botella Rociadora",
  "Shampoo": "Champ\u00fa",
  "Body Soap": "Jab\u00f3n Corporal",
  "Body Bar Soap": "Jab\u00f3n en Barra",
  "Lotion": "Loci\u00f3n",
  "Conditioner": "Acondicionador",
  "Laundry Soap": "Jab\u00f3n para Ropa",
};

interface CartEntry {
  itemId: number;
  quantity: number;
}

export default function Kiosk() {
  const [, navigate] = useLocation();
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [restockDropdownOpen, setRestockDropdownOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", category: "", maxStock: 10, cost: "0.00", itemType: "consumable" as "consumable" | "cleaning", lowStockThreshold: null as number | null });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const restockDropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (restockDropdownRef.current && !restockDropdownRef.current.contains(e.target as Node)) {
        setRestockDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

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

  const restockItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", "/api/items/restock", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: { id: number; name?: string; description?: string; category?: string; maxStock?: number; stock?: number; cost?: string; visible?: boolean; itemType?: string; lowStockThreshold?: number | null }) => {
      const res = await apiRequest("PATCH", `/api/items/${data.id}`, data);
      return res.json() as Promise<InventoryItem>;
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(["/api/items"], (old: InventoryItem[] | undefined) => {
        if (!old) return old;
        return old.map(item => item.id === updatedItem.id ? updatedItem : item);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setEditingItem(null);
      toast({ title: "Item Updated", description: "Item has been updated successfully." });
    },
    onError: (err) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; category: string; maxStock: number; cost: string; itemType: string; lowStockThreshold?: number | null }) => {
      return apiRequest("POST", "/api/items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setAddingItem(false);
      setNewItem({ name: "", description: "", category: "", maxStock: 10, cost: "0.00", itemType: "consumable", lowStockThreshold: null });
      toast({ title: "Item Added", description: "New item has been added to inventory." });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setCart(prev => prev.filter(c => c.itemId !== id));
      toast({ title: "Item Deleted", description: "Item has been removed from inventory." });
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

  const getStockColor = (stock: number, maxStock: number, lowStockThreshold?: number | null) => {
    if (stock <= 0) return "text-red-600";
    if (lowStockThreshold != null && lowStockThreshold > 0) {
      if (stock <= lowStockThreshold) return "text-red-500";
      if (stock <= lowStockThreshold * 2) return "text-yellow-600";
      return "text-emerald-600";
    }
    const ratio = stock / maxStock;
    if (ratio <= 0.25) return "text-red-500";
    if (ratio <= 0.5) return "text-yellow-600";
    return "text-emerald-600";
  };

  const isLowStock = (item: InventoryItem) => {
    if (item.stock <= 0) return false;
    if (item.lowStockThreshold != null && item.lowStockThreshold > 0) {
      return item.stock <= item.lowStockThreshold;
    }
    return item.stock === 1;
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
      <header className="px-3 py-1.5 border-b border-border flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back-home"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Package className="w-5 h-5 text-primary" />
          <h1
            className="text-lg font-semibold tracking-tight text-foreground"
            data-testid="text-heading"
          >
            Supply Kiosk
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            data-testid="button-fullscreen-toggle"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setManageOpen(true); setEditingItem(null); setAddingItem(false); }}
            data-testid="button-manage-items"
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Items
          </Button>
          <div className="relative" ref={restockDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestockDropdownOpen(!restockDropdownOpen)}
              data-testid="button-restock-item-toggle"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restock Item
              <ChevronDown className="w-3 h-3" />
            </Button>
            {restockDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-md shadow-lg z-50 max-h-72 overflow-y-auto" data-testid="restock-item-dropdown">
                {items.filter(i => i.stock < i.maxStock).length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">All items fully stocked</div>
                ) : (
                  <>
                    {items.filter(i => i.stock < i.maxStock).map(item => {
                      const unitsNeeded = item.maxStock - item.stock;
                      const restockCost = unitsNeeded * (Number(item.cost) || 0);
                      return (
                        <button
                          key={item.id}
                          className="w-full text-left px-3 py-2 text-sm hover-elevate flex items-center justify-between gap-2"
                          onClick={() => {
                            restockItemMutation.mutate(item.id);
                            setRestockDropdownOpen(false);
                          }}
                          data-testid={`button-restock-${item.id}`}
                        >
                          <span className="truncate text-foreground">{item.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {restockCost > 0 && (
                              <span className="text-[10px] text-muted-foreground">${restockCost.toFixed(2)}</span>
                            )}
                            <span className={`text-xs font-semibold ${getStockColor(item.stock, item.maxStock, item.lowStockThreshold)}`}>
                              {item.stock}/{item.maxStock}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {(() => {
                      const totalRestockCost = items
                        .filter(i => i.stock < i.maxStock)
                        .reduce((sum, item) => sum + (item.maxStock - item.stock) * (Number(item.cost) || 0), 0);
                      return totalRestockCost > 0 ? (
                        <div className="px-3 py-2 border-t border-border text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Total Restock Cost</span>
                          <span className="text-primary" data-testid="text-restock-total-cost">${totalRestockCost.toFixed(2)}</span>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
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
        </div>
      </header>

      {showSuccess && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-600 font-medium text-sm flex-shrink-0"
          data-testid="checkout-success"
        >
          <CheckCircle className="w-4 h-4" />
          Checkout complete! Supplies have been deducted from inventory.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-hide">
          {[
            { type: "consumable" as const, label: "Consumable Items", subtitle: "Used every cleaning" },
            { type: "cleaning" as const, label: "Cleaning Items", subtitle: "Used over time" },
          ].map(section => {
            const sectionItems = items.filter(item => item.visible && item.itemType === section.type);
            if (sectionItems.length === 0) return null;
            return (
              <div key={section.type} className="mb-5 rounded-xl p-4 bg-muted/50 border border-border/40" data-testid={`section-${section.type}`}>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-base font-semibold text-foreground">{section.label}</h2>
                  <span className="text-xs text-muted-foreground">{section.subtitle}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
          {sectionItems.map((item) => {
              const inCart = getCartQuantity(item.id);
              const outOfStock = item.stock <= 0;

              return (
                <Card
                  key={item.id}
                  className={`relative overflow-visible p-0 ${outOfStock ? "opacity-50" : ""} ${inCart > 0 ? "ring-2 ring-primary shadow-md" : ""} ${isLowStock(item) ? "border-2 border-red-500" : ""}`}
                  style={isLowStock(item) ? { animation: "blink-red-border 1s ease-in-out infinite" } : undefined}
                  data-testid={`item-card-${item.id}`}
                >
                  <button
                    onClick={() => !outOfStock && addToCart(item.id)}
                    disabled={outOfStock}
                    className={`w-full text-left ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
                    data-testid={`button-add-item-${item.id}`}
                  >
                    <div className="aspect-square relative rounded-t-md overflow-hidden flex items-center justify-center p-2" style={{ backgroundColor: "#E8F4FD" }}>
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

                      {isLowStock(item) && (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{ animation: "blink-red 1s ease-in-out infinite" }}
                          data-testid={`last-item-warning-${item.id}`}
                        >
                          <span className="text-red-500/60 font-bold text-8xl select-none">
                            !
                          </span>
                        </div>
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/60">
                          <span className="text-red-500 font-semibold text-xs">
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
                      {spanishNames[item.name] && (
                        <p className="text-[10px] text-muted-foreground truncate italic">{spanishNames[item.name]}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span
                          className={`text-sm font-semibold ${getStockColor(item.stock, item.maxStock, item.lowStockThreshold)}`}
                          data-testid={`text-stock-${item.id}`}
                        >
                          {item.stock}/{item.maxStock}
                        </span>
                        {(Number(item.cost) || 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground" data-testid={`text-cost-${item.id}`}>
                            Don't pay over ${(Number(item.cost) || 0).toFixed(2)}
                          </span>
                        )}
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
            );
          })}
        </div>

        <div
          className="w-96 md:w-[28rem] border-l border-border bg-card flex flex-col flex-shrink-0"
          data-testid="cart-panel"
        >
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground" data-testid="text-cart-heading">
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
                      className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border"
                      data-testid={`cart-item-${entry.itemId}`}
                    >
                      <img
                        src={itemImages[item.id]}
                        alt={item.name}
                        className="w-14 h-14 object-contain rounded-lg flex-shrink-0"
                        style={{ backgroundColor: "#E8F4FD" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
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
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold text-foreground">
                          {entry.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => addToCart(entry.itemId)}
                          disabled={entry.quantity >= item.stock}
                          data-testid={`button-cart-increase-${entry.itemId}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItemFromCart(entry.itemId)}
                          data-testid={`button-cart-remove-${entry.itemId}`}
                        >
                          <Trash2 className="w-4 h-4" />
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
                  className="text-lg font-semibold text-foreground"
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

      {manageOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="manage-modal-overlay">
          <div className="bg-card border border-border/60 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" data-testid="manage-modal">
            <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Manage Items</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAddingItem(true); setEditingItem(null); }}
                  data-testid="button-add-item"
                  className="gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Item
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setManageOpen(false)}
                  data-testid="button-close-manage"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {addingItem && (
                <div className="p-4 border border-primary/50 rounded-md bg-background space-y-3" data-testid="add-item-form">
                  <h3 className="text-sm font-bold text-foreground">New Item</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Name</label>
                      <input
                        className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Item name"
                        data-testid="input-new-name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Category</label>
                      <input
                        className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                        value={newItem.category}
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g. Sprays, Supplies"
                        data-testid="input-new-category"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Description</label>
                      <input
                        className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                        value={newItem.description}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description"
                        data-testid="input-new-description"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Stock</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                        value={newItem.maxStock}
                        onChange={(e) => setNewItem(prev => ({ ...prev, maxStock: parseInt(e.target.value) || 1 }))}
                        data-testid="input-new-maxstock"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Cost per Unit ($)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                        value={newItem.cost}
                        onChange={(e) => setNewItem(prev => ({ ...prev, cost: e.target.value }))}
                        data-testid="input-new-cost"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Type</label>
                      <div className="flex mt-1 rounded-md overflow-visible border border-border">
                        <button
                          type="button"
                          className={`flex-1 px-3 py-2 text-sm font-bold ${newItem.itemType === "consumable" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                          onClick={() => setNewItem(prev => ({ ...prev, itemType: "consumable" }))}
                          data-testid="button-new-type-consumable"
                        >
                          Consumable
                        </button>
                        <button
                          type="button"
                          className={`flex-1 px-3 py-2 text-sm font-bold ${newItem.itemType === "cleaning" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                          onClick={() => setNewItem(prev => ({ ...prev, itemType: "cleaning" }))}
                          data-testid="button-new-type-cleaning"
                        >
                          Cleaning
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Low Stock Alert (red warning when stock reaches this number)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                      value={newItem.lowStockThreshold ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewItem(prev => ({ ...prev, lowStockThreshold: val === "" ? null : parseInt(val) || 0 }));
                      }}
                      placeholder="Leave empty for default (stock = 1)"
                      data-testid="input-new-low-stock"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setAddingItem(false)} data-testid="button-cancel-add">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newItem.name || !newItem.description || !newItem.category) {
                          toast({ title: "Missing Fields", description: "Please fill in all fields.", variant: "destructive" });
                          return;
                        }
                        createItemMutation.mutate(newItem);
                      }}
                      disabled={createItemMutation.isPending}
                      data-testid="button-save-new-item"
                      className="gap-2"
                    >
                      <Save className="w-3 h-3" />
                      {createItemMutation.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 border border-border rounded-md bg-background ${!item.visible ? "opacity-50" : ""}`}
                  data-testid={`manage-item-${item.id}`}
                >
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={() => updateItemMutation.mutate({ id: item.id, visible: !item.visible })}
                    className="w-4 h-4 accent-primary flex-shrink-0 cursor-pointer"
                    title={item.visible ? "Visible on kiosk" : "Hidden from kiosk"}
                    data-testid={`checkbox-visible-${item.id}`}
                  />
                  {itemImages[item.id] && (
                    <img src={itemImages[item.id]} alt={item.name} className="w-10 h-10 object-contain rounded" />
                  )}
                  {editingItem?.id === item.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Name</label>
                          <input
                            className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                            data-testid={`input-edit-name-${item.id}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Category</label>
                          <input
                            className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                            value={editingItem.category}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                            data-testid={`input-edit-category-${item.id}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Max Stock</label>
                          <input
                            type="number"
                            min={1}
                            className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                            value={editingItem.maxStock}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, maxStock: parseInt(e.target.value) || 1 } : null)}
                            data-testid={`input-edit-maxstock-${item.id}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Current Stock</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                            value={editingItem.stock}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, stock: parseInt(e.target.value) || 0 } : null)}
                            data-testid={`input-edit-stock-${item.id}`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <input
                          className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                          value={editingItem.description}
                          onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                          data-testid={`input-edit-description-${item.id}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Cost per Unit ($)</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                            value={editingItem.cost}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, cost: e.target.value } : null)}
                            data-testid={`input-edit-cost-${item.id}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Type</label>
                          <div className="flex mt-1 rounded-md overflow-visible border border-border">
                            <button
                              type="button"
                              className={`flex-1 px-2 py-1 text-xs font-bold ${editingItem.itemType === "consumable" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                              onClick={() => setEditingItem(prev => prev ? { ...prev, itemType: "consumable" } : null)}
                              data-testid={`button-type-consumable-${item.id}`}
                            >
                              Consumable
                            </button>
                            <button
                              type="button"
                              className={`flex-1 px-2 py-1 text-xs font-bold ${editingItem.itemType === "cleaning" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                              onClick={() => setEditingItem(prev => prev ? { ...prev, itemType: "cleaning" } : null)}
                              data-testid={`button-type-cleaning-${item.id}`}
                            >
                              Cleaning
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Low Stock Alert (red warning when stock reaches this number)</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full mt-1 px-2 py-1 bg-card border border-border rounded-md text-sm text-foreground"
                          value={editingItem.lowStockThreshold ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingItem(prev => prev ? { ...prev, lowStockThreshold: val === "" ? null : parseInt(val) || 0 } : null);
                          }}
                          placeholder="Leave empty for default (stock = 1)"
                          data-testid={`input-edit-low-stock-${item.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)} data-testid={`button-cancel-edit-${item.id}`}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateItemMutation.mutate({
                            id: editingItem.id,
                            name: editingItem.name,
                            description: editingItem.description,
                            category: editingItem.category,
                            maxStock: editingItem.maxStock,
                            stock: editingItem.stock,
                            cost: editingItem.cost,
                            itemType: editingItem.itemType,
                            lowStockThreshold: editingItem.lowStockThreshold,
                          })}
                          disabled={updateItemMutation.isPending}
                          data-testid={`button-save-edit-${item.id}`}
                          className="gap-2"
                        >
                          <Save className="w-3 h-3" />
                          {updateItemMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                          <span className={`text-xs font-semibold ${getStockColor(item.stock, item.maxStock, item.lowStockThreshold)}`}>
                            {item.stock}/{item.maxStock}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.itemType === "consumable" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`} data-testid={`badge-type-${item.id}`}>
                            {item.itemType === "consumable" ? "Consumable" : "Cleaning"}
                          </span>
                          {item.lowStockThreshold != null && item.lowStockThreshold > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700" data-testid={`badge-threshold-${item.id}`}>
                              Alert: {item.lowStockThreshold}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditingItem({ ...item }); setAddingItem(false); }}
                          data-testid={`button-edit-item-${item.id}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          disabled={deleteItemMutation.isPending}
                          data-testid={`button-delete-item-${item.id}`}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
