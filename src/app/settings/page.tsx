"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, ArrowLeft, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Item {
  id: number;
  name: string;
}

type TabKey = "categories" | "stores" | "persons";

interface TabConfig {
  key: TabKey;
  label: string;
  endpoint: string;
  entityLabel: string;
  relatedLabel: string;
}

const TABS: TabConfig[] = [
  {
    key: "categories",
    label: "Kategorie",
    endpoint: "/api/categories",
    entityLabel: "kategorię",
    relatedLabel: "produktów",
  },
  {
    key: "stores",
    label: "Sklepy",
    endpoint: "/api/stores",
    entityLabel: "sklep",
    relatedLabel: "produktów",
  },
  {
    key: "persons",
    label: "Osoby",
    endpoint: "/api/persons",
    entityLabel: "osobę",
    relatedLabel: "ocen",
  },
];

function EntityList({ tab }: { tab: TabConfig }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteCount, setDeleteCount] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(tab.endpoint);
      const data = await res.json();
      setItems(data);
    } catch {
      toast.error("Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  }, [tab.endpoint]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditValue(item.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(id: number) {
    if (!editValue.trim()) return;
    if (editValue.trim() === items.find((i) => i.id === id)?.name) {
      cancelEdit();
      return;
    }

    try {
      const res = await fetch(`${tab.endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editValue.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nie udało się zapisać");
        return;
      }

      toast.success("Zapisano");
      cancelEdit();
      fetchItems();
    } catch {
      toast.error("Nie udało się zapisać");
    }
  }

  async function handleDeleteClick(id: number) {
    try {
      const res = await fetch(`${tab.endpoint}/${id}?count=true`);
      const data = await res.json();
      setDeletingId(id);
      setDeleteCount(data.count);
    } catch {
      toast.error("Nie udało się sprawdzić powiązań");
    }
  }

  async function confirmDelete(id: number) {
    try {
      const res = await fetch(`${tab.endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nie udało się usunąć");
        return;
      }

      toast.success("Usunięto");
      setDeletingId(null);
      setDeleteCount(null);
      fetchItems();
    } catch {
      toast.error("Nie udało się usunąć");
    }
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteCount(null);
  }

  async function addItem() {
    if (!newName.trim()) return;

    try {
      const res = await fetch(tab.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nie udało się dodać");
        return;
      }

      toast.success("Dodano");
      setNewName("");
      fetchItems();
      newInputRef.current?.focus();
    } catch {
      toast.error("Nie udało się dodać");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id}>
          <div className="group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
            {editingId === item.id ? (
              <>
                <Input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(item.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => saveEdit(item.id)}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={cancelEdit}
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <button
                  className="flex-1 text-left text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => startEdit(item)}
                >
                  {item.name}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                  onClick={() => startEdit(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteClick(item.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>

          {deletingId === item.id && (
            <div className="mx-3 mb-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm">
                Czy na pewno chcesz usunąć {tab.entityLabel}{" "}
                <span className="font-semibold">{item.name}</span>?
                {deleteCount !== null && deleteCount > 0 && (
                  <span className="text-destructive font-medium">
                    {" "}
                    Powiązanych {tab.relatedLabel}: {deleteCount}. Zostaną usunięte!
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => confirmDelete(item.id)}
                >
                  Usuń
                </Button>
                <Button variant="outline" size="sm" onClick={cancelDelete}>
                  Anuluj
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Brak elementów. Dodaj pierwszy poniżej.
        </p>
      )}

      {/* Add new */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Input
          ref={newInputRef}
          placeholder="Nowa nazwa..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
          className="flex-1 h-9"
        />
        <Button
          size="sm"
          onClick={addItem}
          disabled={!newName.trim()}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Dodaj
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("categories");

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-bold tracking-tight">Ustawienia</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-5 max-w-2xl mx-auto w-full space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{currentTab.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityList key={currentTab.key} tab={currentTab} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
