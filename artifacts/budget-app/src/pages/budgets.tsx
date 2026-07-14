import React, { useState } from "react";
import { 
  useListBudgets, 
  useCreateBudget, 
  useUpdateBudget, 
  useDeleteBudget,
  useListCategories,
  getListBudgetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, PieChart as PieChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const budgetSchema = z.object({
  category_id: z.coerce.number().min(1, "Category is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format"),
  limit_amount: z.coerce.number().min(0.01, "Amount must be positive"),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export default function Budgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const { data: budgets, isLoading } = useListBudgets(
    { month: filterMonth }, 
    { query: { queryKey: getListBudgetsQueryKey({ month: filterMonth }) } }
  );
  const { data: categories } = useListCategories();
  
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: 0,
      month: format(new Date(), "yyyy-MM"),
      limit_amount: 0,
    },
  });

  const onSubmit = (data: BudgetFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: { limit_amount: data.limit_amount } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ month: filterMonth }) });
            toast({ title: "Budget updated" });
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
            queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ month: filterMonth }) });
            toast({ title: "Budget created" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (budget: any) => {
    form.reset({
      category_id: budget.category_id,
      month: budget.month,
      limit_amount: budget.limit_amount,
    });
    setEditingId(budget.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this budget limit?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ month: filterMonth }) });
            toast({ title: "Budget deleted" });
          },
        }
      );
    }
  };

  const openCreateDialog = () => {
    form.reset({
      category_id: expenseCategories[0]?.id || 0,
      month: filterMonth,
      limit_amount: 0,
    });
    setEditingId(null);
    setIsCreateOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const totalBudget = budgets?.reduce((sum, b) => sum + b.limit_amount, 0) || 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + b.spent_amount, 0) || 0;
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const totalOverBudget = totalSpent > totalBudget;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Budgets</h1>
          <p className="text-muted-foreground mt-1">Set limits and track your spending</p>
        </div>
        <div className="flex items-center gap-4">
          <Input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-40 bg-card"
          />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Budget" : "Create Budget"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <FormControl>
                          <Input type="month" {...field} disabled={!!editingId} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(Number(val))} 
                          value={field.value ? String(field.value) : undefined}
                          disabled={!!editingId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="limit_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Limit</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingId ? "Save Changes" : "Set Budget"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-primary text-primary-foreground border-none shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between gap-6 md:items-end">
            <div className="space-y-2">
              <h2 className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">Total Monthly Budget</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-mono tracking-tight">{formatCurrency(totalSpent)}</span>
                <span className="text-primary-foreground/60 font-mono text-xl">/ {formatCurrency(totalBudget)}</span>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 space-y-2">
              <div className="flex justify-between text-sm text-primary-foreground/80">
                <span>{totalPercentage.toFixed(0)}% used</span>
                <span>{formatCurrency(Math.max(0, totalBudget - totalSpent))} remaining</span>
              </div>
              <div className="h-3 w-full bg-primary-foreground/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${totalOverBudget ? 'bg-destructive' : 'bg-primary-foreground'}`}
                  style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-[180px] w-full" />
          </>
        ) : budgets && budgets.length > 0 ? (
          budgets.map((budget) => {
            const percentage = (budget.spent_amount / budget.limit_amount) * 100;
            const overBudget = percentage > 100;
            const remaining = budget.limit_amount - budget.spent_amount;

            return (
              <Card key={budget.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${budget.category_color}20`, color: budget.category_color || 'currentColor' }}>
                        <div className="w-4 h-4 rounded bg-current opacity-70" />
                      </div>
                      <CardTitle className="text-lg">{budget.category_name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEdit(budget)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(budget.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-2xl font-mono tracking-tight ${overBudget ? 'text-destructive' : 'text-foreground'}`}>
                      {formatCurrency(budget.spent_amount)}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">
                      / {formatCurrency(budget.limit_amount)}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ 
                          width: `${Math.min(percentage, 100)}%`, 
                          backgroundColor: !overBudget ? budget.category_color || undefined : undefined 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}%</span>
                      <span className={overBudget ? 'text-destructive font-medium' : ''}>
                        {overBudget ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-1 md:col-span-2 py-16 text-center border-2 border-dashed border-border rounded-xl">
            <PieChartIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No budgets set</h3>
            <p className="text-muted-foreground mt-1 mb-4">Start by setting a budget for a category</p>
            <Button onClick={openCreateDialog} variant="outline">Add Budget</Button>
          </div>
        )}
      </div>
    </div>
  );
}
