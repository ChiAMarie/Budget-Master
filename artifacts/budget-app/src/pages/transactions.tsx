import React, { useState } from "react";
import { 
  useListTransactions, 
  useCreateTransaction, 
  useUpdateTransaction, 
  useDeleteTransaction,
  useListAccounts,
  useListCategories,
  getListTransactionsQueryKey,
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
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const transactionSchema = z.object({
  account_id: z.coerce.number().min(1, "Account is required"),
  category_id: z.coerce.number().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  type: z.enum(["income", "expense"]),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  date: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function Transactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [filterType, setFilterType] = useState<"income" | "expense" | "all">("all");
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  const queryParams: any = {};
  if (filterMonth) queryParams.month = filterMonth;
  if (filterType !== "all") queryParams.type = filterType;
  if (filterAccountId !== "all") queryParams.account_id = Number(filterAccountId);
  if (filterCategoryId !== "all") queryParams.category_id = Number(filterCategoryId);

  const { data: transactions, isLoading } = useListTransactions(queryParams, { 
    query: { queryKey: getListTransactionsQueryKey(queryParams) } 
  });
  const { data: accounts } = useListAccounts();
  const { data: categories } = useListCategories();
  
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      account_id: 0,
      category_id: 0,
      amount: 0,
      type: "expense",
      description: "",
      notes: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = (data: TransactionFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(queryParams) });
            queryClient.invalidateQueries({ queryKey: ['/api/summary'] as any });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] as any });
            toast({ title: "Transaction updated" });
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
            queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(queryParams) });
            queryClient.invalidateQueries({ queryKey: ['/api/summary'] as any });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] as any });
            toast({ title: "Transaction created" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (transaction: any) => {
    form.reset({
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      notes: transaction.notes || "",
      date: transaction.date,
    });
    setEditingId(transaction.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(queryParams) });
            queryClient.invalidateQueries({ queryKey: ['/api/summary'] as any });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] as any });
            toast({ title: "Transaction deleted" });
          },
        }
      );
    }
  };

  const openCreateDialog = () => {
    form.reset({
      account_id: accounts?.[0]?.id || 0,
      category_id: categories?.[0]?.id || 0,
      amount: 0,
      type: "expense",
      description: "",
      notes: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setEditingId(null);
    setIsCreateOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">Track and manage your spending</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Transaction" : "New Transaction"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Groceries at Whole Foods" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts?.map((acc) => (
                              <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.filter(c => c.type === form.watch('type')).map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Save Changes" : "Save Transaction"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
            <Filter className="w-4 h-4" />
            <span>Filter by:</span>
          </div>
          <Input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-40 h-9"
          />
          <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAccountId} onValueChange={(val) => setFilterAccountId(val)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategoryId} onValueChange={(val) => setFilterCategoryId(val)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterMonth !== format(new Date(), "yyyy-MM") || filterType !== "all" || filterAccountId !== "all" || filterCategoryId !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setFilterMonth(format(new Date(), "yyyy-MM"));
                setFilterType("all");
                setFilterAccountId("all");
                setFilterCategoryId("all");
              }}
              className="h-9 text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </CardContent>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="group flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 bg-muted/50 text-muted-foreground border border-border">
                      <span className="text-xs font-medium leading-none">{format(parseISO(tx.date), "MMM")}</span>
                      <span className="text-sm font-serif leading-none mt-1">{format(parseISO(tx.date), "dd")}</span>
                    </div>
                    <div>
                      <p className="font-medium text-base leading-none text-foreground">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/80">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.category_color || 'currentColor' }} />
                          {tx.category_name}
                        </span>
                        <span>•</span>
                        <span>{tx.account_name}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`font-mono text-lg text-right ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(tx)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(tx.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border-t border-border">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-muted-foreground mt-1 mb-4">Try adjusting your filters or add a new transaction.</p>
              <Button onClick={openCreateDialog} variant="outline">Add Transaction</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
