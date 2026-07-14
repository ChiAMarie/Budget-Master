import React from "react";
import { useGetSummaryOverview, useGetSpendingByCategory, useGetMonthlyTrend, useGetBudgetVsActual, useListTransactions, getGetSummaryOverviewQueryKey, getGetSpendingByCategoryQueryKey, getGetMonthlyTrendQueryKey, getGetBudgetVsActualQueryKey, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, title } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, LineChart, Line } from "recharts";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownRight, ArrowUpRight, Wallet, Target, Activity } from "lucide-react";

export default function Dashboard() {
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: summary, isLoading: isLoadingSummary } = useGetSummaryOverview({ month: currentMonth }, { query: { queryKey: getGetSummaryOverviewQueryKey({ month: currentMonth }) } });
  const { data: spending, isLoading: isLoadingSpending } = useGetSpendingByCategory({ month: currentMonth }, { query: { queryKey: getGetSpendingByCategoryQueryKey({ month: currentMonth }) } });
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend({ query: { queryKey: getGetMonthlyTrendQueryKey() } });
  const { data: budgets, isLoading: isLoadingBudgets } = useGetBudgetVsActual({ month: currentMonth }, { query: { queryKey: getGetBudgetVsActualQueryKey({ month: currentMonth }) } });
  const { data: transactions, isLoading: isLoadingTransactions } = useListTransactions({ month: currentMonth }, { query: { queryKey: getListTransactionsQueryKey({ month: currentMonth }) } });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const recentTransactions = transactions?.slice(0, 5) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-foreground">Dashboard</h1>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">{format(new Date(), "MMMM yyyy")}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </div>
            {isLoadingSummary ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <span className="text-3xl font-mono tracking-tight mt-1">{formatCurrency(summary?.total_balance || 0)}</span>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">Monthly Income</span>
              <ArrowDownRight className="w-4 h-4 text-primary" />
            </div>
            {isLoadingSummary ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <span className="text-3xl font-mono tracking-tight text-primary mt-1">+{formatCurrency(summary?.monthly_income || 0)}</span>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">Monthly Expenses</span>
              <ArrowUpRight className="w-4 h-4 text-accent" />
            </div>
            {isLoadingSummary ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <span className="text-3xl font-mono tracking-tight text-accent mt-1">-{formatCurrency(summary?.monthly_expenses || 0)}</span>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">Net Savings</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            {isLoadingSummary ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <span className={`text-3xl font-mono tracking-tight mt-1 ${(summary?.net_savings || 0) >= 0 ? 'text-primary' : 'text-accent'}`}>
                {formatCurrency(summary?.net_savings || 0)}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-serif">Spending by Category</h2>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingSpending ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-[200px] h-[200px] rounded-full" />
              </div>
            ) : spending && spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spending}
                    dataKey="amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {spending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.category_color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No spending data for this month.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-serif">6-Month Trend</h2>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingTrend ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-[200px]" />
              </div>
            ) : trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(val) => format(parseISO(`${val}-01`), 'MMM')}
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    tickMargin={10}
                  />
                  <YAxis 
                    hide 
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  />
                  <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No trend data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif">Recent Transactions</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTransactions ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${tx.category_color}20`, color: tx.category_color || 'currentColor' }}>
                        {/* Fake icon logic since we don't have lucide mapped dynamically */}
                        <div className="w-5 h-5 rounded bg-current opacity-70" />
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-none">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex gap-2">
                          <span>{format(parseISO(tx.date), "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span>{tx.account_name}</span>
                        </p>
                      </div>
                    </div>
                    <div className={`font-mono text-sm ${tx.type === 'income' ? 'text-primary' : ''}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No recent transactions found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50">
            <h2 className="text-lg font-serif">Budget vs Actual</h2>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingBudgets ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : budgets && budgets.length > 0 ? (
              <div className="space-y-6 mt-2">
                {budgets.slice(0, 4).map((budget) => {
                  const overBudget = budget.percentage_used > 100;
                  return (
                    <div key={budget.category_id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.category_color || 'hsl(var(--primary))' }} />
                          {budget.category_name}
                        </span>
                        <span className="font-mono text-xs">
                          {formatCurrency(budget.actual_spent)} / {formatCurrency(budget.budget_limit)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
                          style={{ width: `${Math.min(budget.percentage_used, 100)}%`, backgroundColor: !overBudget ? budget.category_color || undefined : undefined }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{budget.percentage_used.toFixed(0)}% used</span>
                        <span className={overBudget ? 'text-destructive font-medium' : ''}>
                          {overBudget ? 'Over budget' : `${formatCurrency(budget.remaining)} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No budgets set for this month.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
