import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Plus,
  AlertCircle,
  X,
  BarChart3,
  DollarSign,
} from "lucide-react";
import api from "../services/api";
import accountService from "../services/accountService";
import TransactionCard from "../components/TransactionCard";
import OverviewCard from "../components/OverviewCard";
import Layout from "../components/layout/Layout";

const Dashboard = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [view, setView] = useState("monthly"); // monthly, weekly, yearly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    transferOut: { total: 0, count: 0 },
    transferIn: { total: 0, count: 0 },
  });
  const [allTimeStats, setAllTimeStats] = useState({
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    transferOut: { total: 0, count: 0 },
    transferIn: { total: 0, count: 0 },
  });
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNegativeAlert, setShowNegativeAlert] = useState(false);

  useEffect(() => {
    fetchData();
  }, [accountId, currentDate, view]);

  useEffect(() => {
    if (currentBalance < 0) {
      setShowNegativeAlert(true);
    } else {
      setShowNegativeAlert(false);
    }
  }, [currentBalance]);

  const fetchBalance = async () => {
    try {
      const balanceData = await accountService.getAccountBalance(accountId);
      setCurrentBalance(balanceData.data);
    } catch (error) {
      logger.error("Error fetching balance:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const [transactionsRes, statsRes, allTimeStatsRes] = await Promise.all([
        api.get(`/account/${accountId}/transactions`, {
          params: { startDate, endDate, limit: 5 },
        }),
        api.get(`/account/${accountId}/transactions/stats`, {
          params: { startDate, endDate },
        }),
        api.get(`/account/${accountId}/transactions/stats`, {
          params: {},
        }),
      ]);

      setTransactions(transactionsRes.data);
      setStats(statsRes.data);
      setAllTimeStats(allTimeStatsRes.data);

      await fetchBalance();
    } catch (error) {
      logger.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const date = new Date(currentDate);
    let startDate, endDate;

    if (view === "monthly") {
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    } else if (view === "weekly") {
      const day = date.getDay();
      startDate = new Date(date);
      startDate.setDate(date.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear(), 11, 31);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);

    if (view === "monthly") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === "weekly") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }

    setCurrentDate(newDate);
  };

  const getDisplayDate = () => {
    const options =
      view === "yearly"
        ? { year: "numeric" }
        : view === "monthly"
          ? { month: "long", year: "numeric" }
          : { month: "short", day: "numeric", year: "numeric" };

    return currentDate.toLocaleDateString("en-US", options);
  };

  const filteredTransactions = transactions.filter((t) =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Layout>
      <div className="min-h-screen p-6 bg-gray-50 text-gray-800">
        {/* Negative Balance Alert */}
        {showNegativeAlert && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="text-red-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div>
                <h3 className="font-semibold text-red-900">
                  Account Balance is Negative
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  Your current balance is ₹{currentBalance.toFixed(2)}. Please
                  add funds or review your transactions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNegativeAlert(false)}
              className="text-red-600 hover:text-red-800"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-gray-700 text-sm"
              onClick={() => navigate(`/category-analytics?account=${accountId}`)}
              title="View category-wise analytics"
            >
              <BarChart3 size={18} />
              Analytics
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-gray-700 text-sm"
              onClick={() => navigate(`/accounts/${accountId}/budgets`)}
              title="Manage budgets"
            >
              <DollarSign size={18} />
              Budget
            </button>
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => navigate(`/accounts/${accountId}/settings`)}
            >
              <Settings size={20} />
            </button>
            <button
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
              onClick={() => navigate(`/accounts/${accountId}/transaction/new`)}
            >
              <Plus size={20} />
              New Transaction
            </button>
          </div>
        </header>

        {/* All-Time Summary Section */}
        <section className="mb-6">
          <div className="card p-6 mb-2 bg-gradient-to-br from-indigo-50 to-white shadow fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Total Income
                </span>
                <span className="text-3xl font-bold text-green-600">
                  ₹
                  {(
                    (allTimeStats.income?.total || 0) +
                    (allTimeStats.transferIn?.total || 0)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Total Expense
                </span>
                <span className="text-3xl font-bold text-red-600">
                  ₹
                  {(
                    (allTimeStats.expense?.total || 0) +
                    (allTimeStats.transferOut?.total || 0)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Current Balance
                </span>
                <span
                  className={`text-3xl font-bold ${currentBalance < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  ₹
                  {currentBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Period Summary Section */}
        <section className="mb-6">
          <div className="card p-5 bg-white/90 rounded-xl shadow fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                {view.charAt(0).toUpperCase() + view.slice(1)} Summary
              </h3>
              <div className="flex items-center gap-1 bg-gray-100 rounded px-1 py-0.5">
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${view === "weekly" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
                  onClick={() => setView("weekly")}
                >
                  Weekly
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${view === "monthly" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
                  onClick={() => setView("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${view === "yearly" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
                  onClick={() => setView("yearly")}
                >
                  Yearly
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                <ChevronLeft
                  size={16}
                  className="cursor-pointer hover:text-indigo-600"
                  onClick={() => navigateDate(-1)}
                />
                <span className="font-semibold text-gray-700">
                  {getDisplayDate()}
                </span>
                <ChevronRight
                  size={16}
                  className="cursor-pointer hover:text-indigo-600"
                  onClick={() => navigateDate(1)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Income</span>
                <span className="text-xl font-bold text-green-600">
                  ₹
                  {(
                    (stats.income?.total || 0) + (stats.transferIn?.total || 0)
                  ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Expense</span>
                <span className="text-xl font-bold text-red-600">
                  ₹
                  {(
                    (stats.expense?.total || 0) +
                    (stats.transferOut?.total || 0)
                  ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Net</span>
                <span className="text-xl font-bold text-indigo-600">
                  ₹
                  {(
                    (stats.income?.total || 0) +
                    (stats.transferIn?.total || 0) -
                    (stats.expense?.total || 0) -
                    (stats.transferOut?.total || 0)
                  ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-white border rounded px-3 py-2 mb-6 shadow-sm">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none"
          />
        </div>

        {/* Recent Transactions */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Recent Transactions</h2>
            <button
              className="text-indigo-600 hover:underline"
              onClick={() => navigate(`/accounts/${accountId}/transactions`)}
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction._id}
                  transaction={transaction}
                  onClick={() =>
                    navigate(
                      `/accounts/${accountId}/transaction/${transaction._id}`,
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="card fade-in mb-8" style={{ animationDelay: "0.3s" }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <button
              className="btn btn-primary flex items-center justify-center gap-2 py-3"
              onClick={() =>
                navigate(`/accounts/${accountId}/transaction/expense`)
              }
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Expense
            </button>
            <button
              className="btn btn-success flex items-center justify-center gap-2 py-3"
              onClick={() =>
                navigate(`/accounts/${accountId}/transaction/income`)
              }
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Income
            </button>
            <button
              className="btn btn-outline flex items-center justify-center gap-2 py-3"
              onClick={() =>
                navigate(`/accounts/${accountId}/transaction/transfer`)
              }
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Transfer
            </button>
          </div>
        </div>

        {/* Budget Section - Placeholder */}
        {/* <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Budget</h2>
            <button className="text-indigo-600 hover:underline" onClick={() => navigate('/budget')}>
              Manage
            </button>
          </div>
          <div className="text-gray-500">Coming Soon</div>
        </section> */}
      </div>
    </Layout>
  );
};

export default Dashboard;
