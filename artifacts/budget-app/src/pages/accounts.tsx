import React, { useState } from "react";
import { 
  useListAccounts, 
  useCreateAccount, 
  useUpdateAccount, 
  useDeleteAccount,
  getListAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Wallet, Edit2, Trash2, MoreVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["checking", "savings", "credit", "cash", "investment"]),
  balance: z.coerce.number(),
  currency: z.string().default("USD"),
  color: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function Accounts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: accounts, isLoading } = useListAccounts({ query: { queryKey: getListAccountsQueryKey() } });
  
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      balance: 0,
      currency: "USD",
      color: "#4A6B5C",
    },
  });

  const onSubmit = (data: AccountFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
            toast({ title: "Account updated" });
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
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
            toast({ title: "Account created" });
            setIsCreateOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (account: any) => {
    form.reset({
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      color: account.color || "#4A6B5C",
    });
    setEditingId(account.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
            toast({ title: "Account deleted" });
          },
        }
      );
    }
  };

  const openCreateDialog = () => {
    form.reset({
      name: "",
      type: "checking",
      balance: 0,
      currency: "USD",
      color: "#4A6B5C",
    });
    setEditingId(null);
    setIsCreateOpen(true);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  };

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your financial accounts</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Account" : "Add Account"}</DialogTitle>
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
                        <Input placeholder="e.g. Main Checking" {...field} />
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
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="credit">Credit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
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
                    {editingId ? "Save Changes" : "Create Account"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3 bg-primary text-primary-foreground border-none">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <span className="text-primary-foreground/80 font-medium">Net Worth</span>
            {isLoading ? (
              <Skeleton className="h-12 w-48 mt-2 bg-primary-foreground/20" />
            ) : (
              <span className="text-5xl font-mono tracking-tight mt-2">{formatCurrency(totalBalance)}</span>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <>
            <Skeleton className="h-[140px] w-full" />
            <Skeleton className="h-[140px] w-full" />
            <Skeleton className="h-[140px] w-full" />
          </>
        ) : accounts?.length === 0 ? (
          <div className="md:col-span-3 py-12 text-center border-2 border-dashed border-border rounded-xl">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No accounts yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">Add your first account to start tracking</p>
            <Button onClick={openCreateDialog} variant="outline">Add Account</Button>
          </div>
        ) : (
          accounts?.map((account) => (
            <Card key={account.id} className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div 
                className="absolute top-0 left-0 w-1 h-full" 
                style={{ backgroundColor: account.color || 'hsl(var(--primary))' }} 
              />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-lg leading-none mb-1">{account.name}</h3>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{account.type}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(account)} className="gap-2">
                        <Edit2 className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <span className={`text-2xl font-mono tracking-tight ${account.type === 'credit' ? 'text-destructive' : ''}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
