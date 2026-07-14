import React, { useState } from "react";
import { 
  useListCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Tags, Edit2, Trash2, Coffee, ShoppingCart, Home, Car, Zap, Heart, Gift, Briefcase, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const ICONS = [
  { name: "Coffee", icon: Coffee },
  { name: "ShoppingCart", icon: ShoppingCart },
  { name: "Home", icon: Home },
  { name: "Car", icon: Car },
  { name: "Zap", icon: Zap },
  { name: "Heart", icon: Heart },
  { name: "Gift", icon: Gift },
  { name: "Briefcase", icon: Briefcase },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Tags", icon: Tags },
];

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string(),
  icon: z.string(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Categories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories, isLoading } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#4A6B5C",
      icon: "Tags",
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: "Category updated" });
            setIsCreateOpen(false);
            setEditingId(null);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: "Category created" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (category: any) => {
    form.reset({
      name: category.name,
      type: category.type,
      color: category.color || "#4A6B5C",
      icon: category.icon || "Tags",
    });
    setEditingId(category.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category? It may break transactions linked to it.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: "Category deleted" });
          },
          onError: () => {
            toast({ title: "Error deleting category", variant: "destructive" });
          }
        }
      );
    }
  };

  const openCreateDialog = () => {
    form.reset({
      name: "",
      type: "expense",
      color: "#4A6B5C",
      icon: "Tags",
    });
    setEditingId(null);
    setIsCreateOpen(true);
  };

  const incomeCategories = categories?.filter(c => c.type === 'income') || [];
  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];

  const CategoryList = ({ title, items }: { title: string, items: any[] }) => (
    <div className="space-y-4">
      <h2 className="text-xl font-serif border-b border-border pb-2">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(category => {
          const Icon = ICONS.find(i => i.name === category.icon)?.icon || Tags;
          return (
            <Card key={category.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" 
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(category)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full py-8 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
            No {title.toLowerCase()} categories found.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">Organize your transactions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Groceries" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICONS.map((i) => {
                            const IconCmp = i.icon;
                            return (
                              <SelectItem key={i.name} value={i.name}>
                                <div className="flex items-center gap-2">
                                  <IconCmp className="w-4 h-4" />
                                  <span>{i.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-12 h-10 p-1" {...field} value={field.value || "#000000"} />
                          <Input type="text" className="flex-1" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Save Changes" : "Create Category"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <CategoryList title="Expenses" items={expenseCategories} />
          <CategoryList title="Income" items={incomeCategories} />
        </div>
      )}
    </div>
  );
}
