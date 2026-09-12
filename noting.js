/* ==========================================================================
   AddCo — noting.js
   All application JavaScript, organized into clearly labeled sections.
   ========================================================================== */

/* ==========================================================================
   1. CONSTANTS & DEFAULT DATA
   ========================================================================== */

const STORAGE_KEYS = {
  EXPENSES: "addco_expenses",
  BUDGET: "addco_budget",
  CATEGORIES: "addco_categories",
  SETTINGS: "addco_settings",
  CURRENT_PAGE: "addco_current_page",
};

const DEFAULT_CATEGORIES = [
  {
    id: "cat_electronics",
    name: "Electronics",
    icon: "fa-mobile-screen",
    color: "#3E8EFF",
    isDefault: true,
  },
  {
    id: "cat_clothing",
    name: "Clothing",
    icon: "fa-shirt",
    color: "#EC4899",
    isDefault: true,
  },
  {
    id: "cat_food",
    name: "Food",
    icon: "fa-utensils",
    color: "#F5A623",
    isDefault: true,
  },
  {
    id: "cat_grocery",
    name: "Grocery",
    icon: "fa-cart-shopping",
    color: "#1FA971",
    isDefault: true,
  },
  {
    id: "cat_other",
    name: "Other",
    icon: "fa-ellipsis",
    color: "#75748C",
    isDefault: true,
  },
];

const DEFAULT_SETTINGS = {
  name: "Riya Agarwal",
  email: "riya.agarwal@email.com",
  currency: "INR",
  theme: "light",
  notifications: true,
};

const DEFAULT_BUDGET = { monthlyBudget: 0, categoryBudgets: {} };

const ICON_OPTIONS = [
  "fa-mobile-screen",
  "fa-shirt",
  "fa-utensils",
  "fa-cart-shopping",
  "fa-ellipsis",
  "fa-house",
  "fa-car",
  "fa-plane",
  "fa-heart-pulse",
  "fa-graduation-cap",
  "fa-gift",
  "fa-film",
];

const COLOR_OPTIONS = [
  "#5B4FE9",
  "#3E8EFF",
  "#1FA971",
  "#F5A623",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
];

const PAYMENT_ICON_MAP = {
  UPI: "fa-mobile-screen-button",
  Cash: "fa-money-bill-wave",
  "Debit Card": "fa-credit-card",
  "Credit Card": "fa-credit-card",
  "Bank Transfer": "fa-building-columns",
};

const PAYMENT_COLOR_MAP = {
  UPI: "#3E8EFF",
  Cash: "#1FA971",
  "Debit Card": "#5B4FE9",
  "Credit Card": "#F5A623",
  "Bank Transfer": "#EC4899",
};

/* ==========================================================================
   2. STORAGE HELPERS
   ========================================================================== */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("AddCo: failed to read", key, error);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("AddCo: failed to save", key, error);
    return false;
  }
}

function seedDefaultDataIfNeeded() {
  if (localStorage.getItem(STORAGE_KEYS.CATEGORIES) === null)
    saveCategories(DEFAULT_CATEGORIES);
  if (localStorage.getItem(STORAGE_KEYS.SETTINGS) === null)
    saveSettings(DEFAULT_SETTINGS);
  if (localStorage.getItem(STORAGE_KEYS.BUDGET) === null)
    saveBudget(DEFAULT_BUDGET);
  if (localStorage.getItem(STORAGE_KEYS.EXPENSES) === null) saveExpenses([]);
}

/* ==========================================================================
   3. UTILITY FUNCTIONS
   ========================================================================== */

function generateId() {
  return (
    "id_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 9)
  );
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  const sign = value < 0 ? "-" : "";
  return (
    sign +
    "₹" +
    Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

/* ---------- Date range helpers ---------- */

function getPeriodRange(period) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  switch (period) {
    case "today":
      return { start: startOfToday, end: endOfToday };
    case "week": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - start.getDay());
      return { start, end: endOfToday };
    }
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfToday,
      };
    case "lastMonth":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday };
    default:
      return { start: new Date(0), end: endOfToday };
  }
}

function filterByPeriod(expenses, period) {
  if (!period || period === "all") return expenses.slice();
  const { start, end } = getPeriodRange(period);
  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate <= end;
  });
}

/* ==========================================================================
   4. EXPENSE DATA MANAGEMENT
   ========================================================================== */

function getExpenses() {
  return loadJSON(STORAGE_KEYS.EXPENSES, []);
}

function saveExpenses(list) {
  saveJSON(STORAGE_KEYS.EXPENSES, list);
}

function getExpenseById(id) {
  return getExpenses().find((expense) => expense.id === id);
}

function addExpense(data) {
  const expenses = getExpenses();
  const expense = {
    id: generateId(),
    amount: parseFloat(data.amount),
    category: data.category,
    date: data.date,
    paymentMethod: data.paymentMethod,
    description: (data.description || "").trim(),
    createdAt: Date.now(),
  };
  expenses.push(expense);
  saveExpenses(expenses);
  return expense;
}

function updateExpense(id, data) {
  const expenses = getExpenses();
  const index = expenses.findIndex((expense) => expense.id === id);
  if (index === -1) return null;
  expenses[index] = {
    ...expenses[index],
    amount: parseFloat(data.amount),
    category: data.category,
    date: data.date,
    paymentMethod: data.paymentMethod,
    description: (data.description || "").trim(),
  };
  saveExpenses(expenses);
  return expenses[index];
}

function deleteExpense(id) {
  saveExpenses(getExpenses().filter((expense) => expense.id !== id));
}

function sortExpenses(list, sortBy) {
  const copy = list.slice();
  switch (sortBy) {
    case "dateAsc":
      copy.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "amountDesc":
      copy.sort((a, b) => b.amount - a.amount);
      break;
    case "amountAsc":
      copy.sort((a, b) => a.amount - b.amount);
      break;
    default:
      copy.sort(
        (a, b) =>
          new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt,
      );
  }
  return copy;
}

function getFilteredPurchases() {
  let list = getExpenses();
  const search = val("searchInput").trim().toLowerCase();
  const category = val("filterCategory");
  const dateRange = val("filterDateRange");
  const sortBy = val("sortSelect");

  if (search) {
    list = list.filter(
      (expense) =>
        (expense.description || "").toLowerCase().includes(search) ||
        expense.category.toLowerCase().includes(search) ||
        expense.paymentMethod.toLowerCase().includes(search),
    );
  }
  if (category) list = list.filter((expense) => expense.category === category);
  if (dateRange && dateRange !== "all") list = filterByPeriod(list, dateRange);

  return sortExpenses(list, sortBy);
}

/* ==========================================================================
   5. CATEGORY DATA MANAGEMENT
   ========================================================================== */

function getCategories() {
  return loadJSON(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
}

function saveCategories(list) {
  saveJSON(STORAGE_KEYS.CATEGORIES, list);
}

function addCategory(data) {
  const categories = getCategories();
  const category = {
    id: generateId(),
    name: data.name,
    icon: data.icon,
    color: data.color,
    isDefault: false,
  };
  categories.push(category);
  saveCategories(categories);
  return category;
}

function updateCategory(id, data) {
  const categories = getCategories();
  const index = categories.findIndex((category) => category.id === id);
  if (index === -1) return null;

  const oldName = categories[index].name;
  categories[index] = {
    ...categories[index],
    name: data.name,
    icon: data.icon,
    color: data.color,
  };
  saveCategories(categories);

  if (data.name && data.name !== oldName) {
    const expenses = getExpenses().map((expense) =>
      expense.category === oldName
        ? { ...expense, category: data.name }
        : expense,
    );
    saveExpenses(expenses);

    const budget = getBudget();
    if (
      budget.categoryBudgets &&
      budget.categoryBudgets[oldName] !== undefined
    ) {
      budget.categoryBudgets[data.name] = budget.categoryBudgets[oldName];
      delete budget.categoryBudgets[oldName];
      saveBudget(budget);
    }
  }
  return categories[index];
}

function deleteCategory(id) {
  const categories = getCategories();
  const category = categories.find((item) => item.id === id);
  saveCategories(categories.filter((item) => item.id !== id));

  if (category) {
    const budget = getBudget();
    if (
      budget.categoryBudgets &&
      budget.categoryBudgets[category.name] !== undefined
    ) {
      delete budget.categoryBudgets[category.name];
      saveBudget(budget);
    }
  }
}

function isCategoryInUse(name) {
  return getExpenses().some((expense) => expense.category === name);
}

function getCategoryMeta(name) {
  const category = getCategories().find((item) => item.name === name);
  return category
    ? { icon: category.icon, color: category.color }
    : { icon: "fa-ellipsis", color: "#75748C" };
}

function populateCategorySelects() {
  const categories = getCategories();
  const options = categories
    .map(
      (category) =>
        `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`,
    )
    .join("");

  document.getElementById("categorySelect").innerHTML =
    '<option value="">Select category</option>' + options;
  document.getElementById("editCategorySelect").innerHTML = options;
  document.getElementById("filterCategory").innerHTML =
    '<option value="">All categories</option>' + options;
}

/* ==========================================================================
   6. BUDGET DATA MANAGEMENT
   ========================================================================== */

function getBudget() {
  const budget = loadJSON(STORAGE_KEYS.BUDGET, { ...DEFAULT_BUDGET });
  if (!budget.categoryBudgets) budget.categoryBudgets = {};
  return budget;
}

function saveBudget(budget) {
  saveJSON(STORAGE_KEYS.BUDGET, budget);
}

function setMonthlyBudget(amount) {
  const budget = getBudget();
  budget.monthlyBudget = Number(amount) || 0;
  saveBudget(budget);
}

function setCategoryBudget(categoryName, amount) {
  const budget = getBudget();
  budget.categoryBudgets[categoryName] = Number(amount) || 0;
  saveBudget(budget);
}

/* ==========================================================================
   7. SETTINGS DATA MANAGEMENT
   ========================================================================== */

function getSettings() {
  return loadJSON(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
}

function saveSettings(settings) {
  saveJSON(STORAGE_KEYS.SETTINGS, settings);
}

/* ==========================================================================
   8. CALCULATIONS
   ========================================================================== */

function calculateTotal(list) {
  return list.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function calculateCategoryTotals(list) {
  const totals = {};
  list.forEach((expense) => {
    totals[expense.category] =
      (totals[expense.category] || 0) + Number(expense.amount || 0);
  });
  return totals;
}

function calculatePaymentTotals(list) {
  const totals = {};
  list.forEach((expense) => {
    totals[expense.paymentMethod] =
      (totals[expense.paymentMethod] || 0) + Number(expense.amount || 0);
  });
  return totals;
}

function getHighestExpense(list) {
  if (!list.length) return null;
  return list.reduce(
    (max, expense) =>
      Number(expense.amount) > Number(max.amount) ? expense : max,
    list[0],
  );
}

/* ==========================================================================
   9. NAVIGATION
   ========================================================================== */

function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.remove("is-active"));
  const target = document.getElementById("page-" + pageId);
  if (target) {
    void target.offsetWidth; // force reflow so the entrance animation restarts
    target.classList.add("is-active");
  } else {
    pageId = "dashboard";
    const fallback = document.getElementById("page-dashboard");
    void fallback.offsetWidth;
    fallback.classList.add("is-active");
  }

  setActivePage(pageId);
  localStorage.setItem(STORAGE_KEYS.CURRENT_PAGE, pageId);
  renderPageContent(pageId);
  closeMenu();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function setActivePage(pageId) {
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.page === pageId);
  });
  document.querySelectorAll(".footer-nav-item[data-page]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.page === pageId);
  });
}

function renderPageContent(pageId) {
  switch (pageId) {
    case "dashboard":
      renderDashboard();
      break;
    case "addExpense":
      prepareAddExpenseForm();
      break;
    case "myPurchases":
      renderPurchasesList();
      break;
    case "budget":
      renderBudgetPage();
      break;
    case "reports":
      renderReportsPage();
      break;
    case "categories":
      renderCategoriesPage();
      break;
    case "settings":
      renderSettingsPage();
      break;
  }
}

function openMenu() {
  document.getElementById("navMenu").classList.add("is-open");
  document.getElementById("menuOverlay").classList.add("is-visible");
  document.getElementById("navMenu").setAttribute("aria-hidden", "false");
  document.getElementById("hamburgerBtn").setAttribute("aria-expanded", "true");
  document.getElementById("hamburgerIcon").className = "fa-solid fa-xmark";
  document.body.classList.add("menu-open");
}

function closeMenu() {
  document.getElementById("navMenu").classList.remove("is-open");
  document.getElementById("menuOverlay").classList.remove("is-visible");
  document.getElementById("navMenu").setAttribute("aria-hidden", "true");
  document
    .getElementById("hamburgerBtn")
    .setAttribute("aria-expanded", "false");
  document.getElementById("hamburgerIcon").className = "fa-solid fa-bars";
  document.body.classList.remove("menu-open");
  showProfileMainView();
}

function toggleMenu() {
  const isOpen = document
    .getElementById("navMenu")
    .classList.contains("is-open");
  if (isOpen) closeMenu();
  else openMenu();
}

function showProfileExpandedView() {
  document.getElementById("navViewMain").hidden = true;
  document.getElementById("navViewProfile").hidden = false;
}

function showProfileMainView() {
  document.getElementById("navViewMain").hidden = false;
  document.getElementById("navViewProfile").hidden = true;
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateProfileDisplay() {
  const settings = getSettings();
  const initials = getInitials(settings.name);

  document.getElementById("profileNameLabel").textContent = settings.name;
  document.getElementById("profileEmailLabel").textContent = settings.email;

  const nameLg = document.getElementById("profileNameLg");
  const emailLg = document.getElementById("profileEmailLg");
  if (nameLg) nameLg.textContent = settings.name;
  if (emailLg) emailLg.textContent = settings.email;

  const avatarSm = document.getElementById("userAvatarSm");
  const avatarMd = document.getElementById("userAvatarMd");
  const avatarLg = document.getElementById("userAvatarLg");
  if (avatarSm) avatarSm.textContent = initials;
  if (avatarMd) avatarMd.textContent = initials;
  if (avatarLg) avatarLg.textContent = initials;
}

/* ==========================================================================
   10. TOAST
   ========================================================================== */

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  document.getElementById("toastMessage").textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      toast.hidden = true;
    }, 250);
  }, 2600);
}

/* ==========================================================================
   11. SHARED RENDERING HELPERS (category bars, payment bars)
   ========================================================================== */

function renderCategoryBars(container, totals) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    container.innerHTML =
      '<p class="empty-hint">No expenses in this period.</p>';
    return;
  }
  const max = entries[0][1];
  container.innerHTML = entries
    .map(([name, total]) => {
      const meta = getCategoryMeta(name);
      const pct = max > 0 ? Math.round((total / max) * 100) : 0;
      return `
      <div class="category-bar-row">
        <div class="category-bar-top">
          <span class="category-bar-name">
            <span class="category-bar-icon" style="background:${meta.color}"><i class="fa-solid ${meta.icon}"></i></span>
            ${escapeHtml(name)}
          </span>
          <span class="category-bar-amount">${formatCurrency(total)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${meta.color}"></div></div>
      </div>`;
    })
    .join("");
}

function renderPaymentBars(container, totals) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    container.innerHTML =
      '<p class="empty-hint">No expenses in this period.</p>';
    return;
  }
  const max = entries[0][1];
  container.innerHTML = entries
    .map(([name, total]) => {
      const icon = PAYMENT_ICON_MAP[name] || "fa-wallet";
      const color = PAYMENT_COLOR_MAP[name] || "#75748C";
      const pct = max > 0 ? Math.round((total / max) * 100) : 0;
      return `
      <div class="category-bar-row">
        <div class="category-bar-top">
          <span class="category-bar-name">
            <span class="category-bar-icon" style="background:${color}"><i class="fa-solid ${icon}"></i></span>
            ${escapeHtml(name)}
          </span>
          <span class="category-bar-amount">${formatCurrency(total)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${color}"></div></div>
      </div>`;
    })
    .join("");
}

/* ==========================================================================
   12. DASHBOARD
   ========================================================================== */

function renderDashboard() {
  const expenses = getExpenses();
  const budget = getBudget();
  const monthExpenses = filterByPeriod(expenses, "month");
  const todayExpenses = filterByPeriod(expenses, "today");

  const totalSpent = calculateTotal(monthExpenses);
  const totalIncome = budget.monthlyBudget || 0;
  const remaining = totalIncome - totalSpent;

  const settings = getSettings();
  const firstName = String(settings.name || "").trim().split(/\s+/)[0];
  const greetingEl = document.getElementById("dashboardGreeting");
  if (greetingEl) {
    greetingEl.textContent = firstName ? `Welcome back, ${firstName}` : "Welcome back";
  }

  document.getElementById("statTotalSpent").textContent =
    formatCurrency(totalSpent);
  document.getElementById("statTotalIncome").textContent =
    formatCurrency(totalIncome);
  document.getElementById("statRemaining").textContent =
    formatCurrency(remaining);
  document.getElementById("statPurchaseCount").textContent =
    monthExpenses.length;
  document.getElementById("statTodaySpent").textContent = formatCurrency(
    calculateTotal(todayExpenses),
  );
  document.getElementById("statTodayDate").textContent = formatDate(todayISO());
  document.getElementById("dashboardDateLabel").textContent =
    "Overview for " +
    new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  renderCategoryBars(
    document.getElementById("dashCategoryBars"),
    calculateCategoryTotals(monthExpenses),
  );
  renderBudgetStatusMini(totalIncome, totalSpent);
  renderRecentTransactions();
}

function renderBudgetStatusMini(budgetAmount, spent) {
  const container = document.getElementById("dashBudgetStatus");
  if (!budgetAmount) {
    container.innerHTML =
      '<p class="empty-hint">Set a monthly budget to track your progress.</p>';
    return;
  }
  const pct = Math.round((spent / budgetAmount) * 100);
  const barClass = pct >= 100 ? "is-danger" : pct >= 80 ? "is-warning" : "";
  const statusText =
    pct >= 100 ? "— over budget" : pct >= 80 ? "— approaching limit" : "";

  container.innerHTML = `
    <div class="budget-progress-labels">
      <span>Spent: <strong>${formatCurrency(spent)}</strong></span>
      <span>Budget: <strong>${formatCurrency(budgetAmount)}</strong></span>
    </div>
    <div class="progress-track"><div class="progress-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div></div>
    <p class="stat-sub" style="margin-top:8px;">${pct}% used ${statusText}</p>`;
}

function renderRecentTransactions() {
  const sorted = sortExpenses(getExpenses(), "dateDesc").slice(0, 5);
  const container = document.getElementById("recentTransactionsList");
  if (!sorted.length) {
    container.innerHTML = '<p class="empty-hint">No transactions yet.</p>';
    return;
  }
  container.innerHTML = sorted
    .map((expense) => {
      const meta = getCategoryMeta(expense.category);
      return `
      <div class="recent-item">
        <span class="recent-item-icon" style="background:${meta.color}"><i class="fa-solid ${meta.icon}"></i></span>
        <span class="recent-item-info">
          <span class="recent-item-desc">${escapeHtml(expense.description || expense.category)}</span>
          <span class="recent-item-meta">${formatDate(expense.date)} · ${escapeHtml(expense.paymentMethod)}</span>
        </span>
        <span class="recent-item-amount">${formatCurrency(expense.amount)}</span>
      </div>`;
    })
    .join("");
}

/* ==========================================================================
   13. ADD / EDIT EXPENSE FORM
   ========================================================================== */

function prepareAddExpenseForm() {
  const dateInput = document.getElementById("dateInput");
  if (!dateInput.value) dateInput.value = todayISO();
}

function validateExpenseFields(fields) {
  const errors = {};
  const amountNum = parseFloat(fields.amount);

  if (fields.amount === "" || fields.amount === undefined || isNaN(amountNum)) {
    errors.amount = "Amount is required";
  } else if (amountNum <= 0) {
    errors.amount = "Amount must be greater than 0";
  }
  if (!fields.category) errors.category = "Category is required";
  if (!fields.date) errors.date = "Date is required";
  if (!fields.paymentMethod)
    errors.paymentMethod = "Payment method is required";
  if (fields.description.length > 70)
    errors.description = "Description must be 70 characters or less";

  return errors;
}

function showFormErrors(errors, idMap, inputIdMap) {
  Object.entries(idMap).forEach(([field, errorId]) => {
    const el = document.getElementById(errorId);
    if (el) el.textContent = errors[field] || "";
  });
  Object.entries(inputIdMap).forEach(([field, inputId]) => {
    const el = document.getElementById(inputId);
    if (el) el.classList.toggle("has-error", !!errors[field]);
  });
}

function clearFormErrors(errorIds) {
  errorIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

let isSubmittingExpense = false;

function handleAddExpenseSubmit(event) {
  event.preventDefault();
  if (isSubmittingExpense) return;

  const fields = {
    amount: val("amountInput"),
    category: val("categorySelect"),
    date: val("dateInput"),
    paymentMethod: val("paymentMethodSelect"),
    description: val("descriptionInput").trim(),
  };

  const errors = validateExpenseFields(fields);
  showFormErrors(
    errors,
    {
      amount: "amountError",
      category: "categoryError",
      date: "dateError",
      paymentMethod: "paymentMethodError",
      description: "descriptionError", // 👈 add
    },
    {
      amount: "amountInput",
      category: "categorySelect",
      date: "dateInput",
      paymentMethod: "paymentMethodSelect",
      description: "descriptionInput", // 👈 add
    },
  );
  if (Object.keys(errors).length) return;

  isSubmittingExpense = true;
  const button = document.getElementById("addExpenseButton");
  const cancelBtn = document.getElementById("cancelExpenseBtn");
  const textEl = button.querySelector(".btn-text");
  const iconEl = button.querySelector(".btn-content i");
  const originalText = textEl.textContent;

  button.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  button.classList.add("is-loading");

  setTimeout(() => {
    addExpense(fields);

    button.classList.remove("is-loading");
    button.classList.add("is-success");
    textEl.textContent = "Added!";
    iconEl.className = "fa-solid fa-check";

    setTimeout(() => {
      button.classList.remove("is-success");
      textEl.textContent = originalText;
      iconEl.className = "fa-solid fa-plus";
      button.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      isSubmittingExpense = false;

      resetExpenseForm();
      showToast("Expense added successfully");
      if (
        document
          .getElementById("page-dashboard")
          .classList.contains("is-active")
      )
        renderDashboard();
    }, 900);
  }, 700);
}

function handleCancelExpense() {
  if (isSubmittingExpense) return;
  resetExpenseForm();
  showPage("dashboard");
}

function resetExpenseForm() {
  document.getElementById("expenseForm").reset();
  document.getElementById("dateInput").value = todayISO();
  clearFormErrors([
    "amountError",
    "categoryError",
    "dateError",
    "paymentMethodError",
    "descriptionError",
  ]);
  ["amountInput", "categorySelect", "dateInput", "paymentMethodSelect", "descriptionInput"].forEach(
    (id) => document.getElementById(id).classList.remove("has-error"),
  );
}

/* ---------- Edit expense modal ---------- */

let pendingEditExpenseId = null;

function openEditExpenseModal(id) {
  const expense = getExpenseById(id);
  if (!expense) return;

  pendingEditExpenseId = id;
  document.getElementById("editAmountInput").value = expense.amount;
  document.getElementById("editCategorySelect").value = expense.category;
  document.getElementById("editDateInput").value = expense.date;
  document.getElementById("editPaymentMethodSelect").value =
    expense.paymentMethod;
  document.getElementById("editDescriptionInput").value =
    expense.description || "";
  clearFormErrors([
    "editAmountError",
    "editCategoryError",
    "editDateError",
    "editPaymentMethodError",
  ]);
  document.getElementById("editModal").hidden = false;
}

/* ---------- shared modal close animation ---------- */
function closeModalAnimated(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.hidden) return;
  modal.classList.add("is-closing");
  setTimeout(() => {
    modal.hidden = true;
    modal.classList.remove("is-closing");
  }, 160);
}

function closeEditExpenseModal() {
  closeModalAnimated("editModal");
  pendingEditExpenseId = null;
}

function handleEditExpenseSubmit(event) {
  event.preventDefault();
  if (!pendingEditExpenseId) return;

  const fields = {
    amount: val("editAmountInput"),
    category: val("editCategorySelect"),
    date: val("editDateInput"),
    paymentMethod: val("editPaymentMethodSelect"),
    description: val("editDescriptionInput").trim(),
  };

  const errors = validateExpenseFields(fields);
  showFormErrors(
    errors,
    {
      amount: "editAmountError",
      category: "editCategoryError",
      date: "editDateError",
      paymentMethod: "editPaymentMethodError",
      description: "editDescriptionError", // 👈 add this
    },
    {
      amount: "editAmountInput",
      category: "editCategorySelect",
      date: "editDateInput",
      paymentMethod: "editPaymentMethodSelect",
      description: "editDescriptionInput", // 👈 add this
    },
  );
  if (Object.keys(errors).length) return;

  updateExpense(pendingEditExpenseId, fields);
  closeEditExpenseModal();
  renderPurchasesList();
  renderDashboard();
  showToast("Expense updated");
}

/* ---------- Delete expense modal ---------- */

let pendingDeleteExpenseId = null;

function openDeleteExpenseModal(id) {
  pendingDeleteExpenseId = id;
  document.getElementById("deleteModal").hidden = false;
}

function closeDeleteExpenseModal() {
  closeModalAnimated("deleteModal");
  pendingDeleteExpenseId = null;
}

function handleConfirmDeleteExpense() {
  if (!pendingDeleteExpenseId) return;
  deleteExpense(pendingDeleteExpenseId);
  closeDeleteExpenseModal();
  renderPurchasesList();
  renderDashboard();
  showToast("Expense deleted");
}

/* ==========================================================================
   14. MY PURCHASES PAGE
   ========================================================================== */

function renderPurchasesList() {
  const list = getFilteredPurchases();
  const container = document.getElementById("purchasesList");
  const emptyState = document.getElementById("purchasesEmptyState");

  const header = `
    <div class="purchase-row purchase-row-header">
      <span>Date</span><span>Description</span><span>Category</span><span>Payment</span><span>Amount</span><span></span>
    </div>`;

  if (!list.length) {
    container.innerHTML = header;
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const rows = list
    .map((expense) => {
      const meta = getCategoryMeta(expense.category);
      return `
      <div class="purchase-row" data-id="${expense.id}">
        <span class="purchase-date">${formatDate(expense.date)}</span>
        <span class="purchase-desc-cell">
          <span class="purchase-cat-icon" style="background:${meta.color}"><i class="fa-solid ${meta.icon}"></i></span>
          <span class="purchase-desc-text">${escapeHtml(expense.description || expense.category)}</span>
        </span>
        <span class="purchase-category-tag">${escapeHtml(expense.category)}</span>
        <span class="purchase-payment">${escapeHtml(expense.paymentMethod)}</span>
        <span class="purchase-amount">${formatCurrency(expense.amount)}</span>
        <span class="purchase-actions">
          <button class="purchase-action-btn purchase-action-btn--edit" data-edit-id="${expense.id}" aria-label="Edit expense"><i class="fa-solid fa-pen"></i></button>
          <button class="purchase-action-btn purchase-action-btn--delete" data-delete-id="${expense.id}" aria-label="Delete expense"><i class="fa-solid fa-trash"></i></button>
        </span>
      </div>`;
    })
    .join("");

  container.innerHTML = header + rows;
}

/* ==========================================================================
   15. BUDGET PAGE
   ========================================================================== */

function renderBudgetPage() {
  const budget = getBudget();
  const monthExpenses = filterByPeriod(getExpenses(), "month");
  const spent = calculateTotal(monthExpenses);
  const monthlyBudget = budget.monthlyBudget || 0;

  document.getElementById("monthlyBudgetInput").value = monthlyBudget || "";
  document.getElementById("budgetSpentLabel").textContent =
    formatCurrency(spent);
  document.getElementById("budgetRemainingLabel").textContent = formatCurrency(
    monthlyBudget - spent,
  );

  const pct = monthlyBudget > 0 ? Math.round((spent / monthlyBudget) * 100) : 0;
  const bar = document.getElementById("budgetOverviewBar");
  bar.style.width = Math.min(pct, 100) + "%";
  bar.className =
    "progress-fill" +
    (pct >= 100 ? " is-danger" : pct >= 80 ? " is-warning" : "");
  document.getElementById("budgetPercentLabel").textContent = pct + "% used";

  const warningEl = document.getElementById("budgetWarning");
  if (pct >= 100) {
    warningEl.hidden = false;
    warningEl.classList.add("is-danger");
    warningEl.innerHTML =
      '<i class="fa-solid fa-triangle-exclamation"></i> Over budget';
  } else if (pct >= 80) {
    warningEl.hidden = false;
    warningEl.classList.remove("is-danger");
    warningEl.innerHTML =
      '<i class="fa-solid fa-triangle-exclamation"></i> Approaching limit';
  } else {
    warningEl.hidden = true;
  }

  renderCategoryBudgetList(budget, monthExpenses);
}

function renderCategoryBudgetList(budget, monthExpenses) {
  const categories = getCategories();
  const categoryTotals = calculateCategoryTotals(monthExpenses);
  const container = document.getElementById("categoryBudgetList");

  container.innerHTML = categories
    .map((category) => {
      const budgeted = budget.categoryBudgets[category.name] || 0;
      const spent = categoryTotals[category.name] || 0;
      const pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
      const barClass = pct >= 100 ? "is-danger" : pct >= 80 ? "is-warning" : "";

      const progressMarkup =
        budgeted > 0
          ? `<div class="progress-track"><div class="progress-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div></div>
         <p class="category-budget-meta">${formatCurrency(spent)} of ${formatCurrency(budgeted)} spent (${pct}%)</p>`
          : `<p class="category-budget-meta">${formatCurrency(spent)} spent this month · no budget set</p>`;

      return `
      <div class="category-budget-item">
        <div class="category-budget-top">
          <span class="category-budget-name">
            <span class="category-bar-icon" style="background:${category.color}"><i class="fa-solid ${category.icon}"></i></span>
            ${escapeHtml(category.name)}
          </span>
          <span class="category-budget-input-wrap">
            <span class="amount-input-wrap">
              <span class="currency-symbol">₹</span>
              <input type="number" class="form-input" min="0" value="${budgeted || ""}" placeholder="0" data-category-budget-input="${escapeHtml(category.name)}">
            </span>
            <button class="category-budget-save-btn" data-save-category-budget="${escapeHtml(category.name)}" aria-label="Save budget"><i class="fa-solid fa-check"></i></button>
          </span>
        </div>
        ${progressMarkup}
      </div>`;
    })
    .join("");
}

/* ==========================================================================
   16. REPORTS PAGE
   ========================================================================== */

function renderReportsPage() {
  const period = val("reportPeriodSelect");
  const expenses = filterByPeriod(getExpenses(), period);
  const categoryTotals = calculateCategoryTotals(expenses);
  const paymentTotals = calculatePaymentTotals(expenses);
  const totalSpent = calculateTotal(expenses);
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  document.getElementById("reportHighestCategory").textContent = entries.length
    ? `${entries[0][0]} (${formatCurrency(entries[0][1])})`
    : "—";

  const highest = getHighestExpense(expenses);
  document.getElementById("reportHighestExpense").textContent = highest
    ? `${formatCurrency(highest.amount)} · ${highest.category}`
    : "—";

  document.getElementById("reportTotalSpent").textContent =
    formatCurrency(totalSpent);

  renderCategoryBars(
    document.getElementById("reportCategoryChart"),
    categoryTotals,
  );
  renderPaymentBars(
    document.getElementById("reportPaymentChart"),
    paymentTotals,
  );
  renderDailyChart(expenses, period);
}

function renderDailyChart(expenses, period) {
  const container = document.getElementById("reportDailyChart");
  let buckets = [];

  if (period === "year") {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    buckets = monthNames.map((name) => ({ label: name, total: 0 }));
    expenses.forEach((expense) => {
      const month = new Date(expense.date).getMonth();
      buckets[month].total += Number(expense.amount);
    });
  } else {
    const { start, end } = getPeriodRange(period);
    const days = [];
    const cursor = new Date(start);
    while (cursor <= end && days.length < 31) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    buckets = days.map((day) => ({
      label: String(day.getDate()),
      dateKey: day.toDateString(),
      total: 0,
    }));
    expenses.forEach((expense) => {
      const key = new Date(expense.date).toDateString();
      const bucket = buckets.find((item) => item.dateKey === key);
      if (bucket) bucket.total += Number(expense.amount);
    });
  }

  const max = Math.max(...buckets.map((bucket) => bucket.total), 1);
  container.innerHTML = buckets
    .map((bucket) => {
      const heightPct = Math.max(
        Math.round((bucket.total / max) * 100),
        bucket.total > 0 ? 4 : 2,
      );
      return `
      <div class="mini-bar-col ${bucket.total > 0 ? "has-value" : ""}">
        <div class="mini-bar" style="height:${heightPct}%"></div>
        <span class="mini-bar-label">${bucket.label}</span>
      </div>`;
    })
    .join("");
}

/* ==========================================================================
   17. CATEGORIES PAGE
   ========================================================================== */

function renderCategoriesPage() {
  const categories = getCategories();
  const expenses = getExpenses();
  const container = document.getElementById("categoryGrid");

  container.innerHTML = categories
    .map((category) => {
      const categoryExpenses = expenses.filter(
        (expense) => expense.category === category.name,
      );
      const total = calculateTotal(categoryExpenses);
      return `
      <div class="category-card">
        <span class="category-card-icon" style="background:${category.color}"><i class="fa-solid ${category.icon}"></i></span>
        <div class="category-card-body">
          <span class="category-card-name">${escapeHtml(category.name)}</span>
          <p class="category-card-count">${categoryExpenses.length} purchase${categoryExpenses.length === 1 ? "" : "s"}</p>
          <p class="category-card-total">${formatCurrency(total)}</p>
          ${category.isDefault ? '<span class="category-card-default-tag">Default category</span>' : ""}
        </div>
        <div class="category-card-actions">
          <button data-edit-category="${category.id}" aria-label="Edit category"><i class="fa-solid fa-pen"></i></button>
          <button data-delete-category="${category.id}" aria-label="Delete category"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    })
    .join("");
}

/* ---------- Add / edit category modal ---------- */

let pendingEditCategoryId = null;
let selectedCategoryIcon = ICON_OPTIONS[0];
let selectedCategoryColor = COLOR_OPTIONS[0];

function openCategoryModal(categoryId) {
  pendingEditCategoryId = categoryId || null;
  const titleEl = document.getElementById("categoryModalTitle");
  const nameInput = document.getElementById("categoryNameInput");
  document.getElementById("categoryNameError").textContent = "";
  nameInput.classList.remove("has-error");

  if (categoryId) {
    const category = getCategories().find((item) => item.id === categoryId);
    titleEl.textContent = "Edit Category";
    nameInput.value = category.name;
    selectedCategoryIcon = category.icon;
    selectedCategoryColor = category.color;
  } else {
    titleEl.textContent = "Add Category";
    nameInput.value = "";
    selectedCategoryIcon = ICON_OPTIONS[0];
    selectedCategoryColor = COLOR_OPTIONS[0];
  }

  renderIconPicker();
  renderColorPicker();
  document.getElementById("categoryModal").hidden = false;
}

function closeCategoryModal() {
  closeModalAnimated("categoryModal");
  pendingEditCategoryId = null;
}

function renderIconPicker() {
  const container = document.getElementById("categoryIconPicker");
  container.innerHTML = ICON_OPTIONS.map(
    (icon) => `
    <button type="button" class="icon-picker-option ${icon === selectedCategoryIcon ? "is-selected" : ""}" data-icon="${icon}">
      <i class="fa-solid ${icon}"></i>
    </button>`,
  ).join("");
}

function renderColorPicker() {
  const container = document.getElementById("categoryColorPicker");
  container.innerHTML = COLOR_OPTIONS.map(
    (color) => `
    <button type="button" class="color-picker-option ${color === selectedCategoryColor ? "is-selected" : ""}" data-color="${color}" style="background:${color}" aria-label="${color}"></button>
  `,
  ).join("");
}

function handleCategoryFormSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById("categoryNameInput");
  const name = nameInput.value.trim();
  const errorEl = document.getElementById("categoryNameError");
  const categories = getCategories();
  const isDuplicate = categories.some(
    (category) =>
      category.name.toLowerCase() === name.toLowerCase() &&
      category.id !== pendingEditCategoryId,
  );

  if (!name) {
    errorEl.textContent = "Category name is required";
    nameInput.classList.add("has-error");
    return;
  }
  if (isDuplicate) {
    errorEl.textContent = "A category with this name already exists";
    nameInput.classList.add("has-error");
    return;
  }
  errorEl.textContent = "";
  nameInput.classList.remove("has-error");

  const data = {
    name,
    icon: selectedCategoryIcon,
    color: selectedCategoryColor,
  };
  if (pendingEditCategoryId) {
    updateCategory(pendingEditCategoryId, data);
    showToast("Category updated");
  } else {
    addCategory(data);
    showToast("Category added");
  }

  closeCategoryModal();
  populateCategorySelects();
  renderCategoriesPage();
  renderDashboard();
}

/* ---------- Delete category modal ---------- */

let pendingDeleteCategoryId = null;

function openCategoryDeleteModal(id) {
  pendingDeleteCategoryId = id;
  const category = getCategories().find((item) => item.id === id);
  if (!category) return;

  const inUse = isCategoryInUse(category.name);
  const messageEl = document.getElementById("categoryDeleteMessage");
  const reassignGroup = document.getElementById("categoryReassignGroup");
  const reassignSelect = document.getElementById("categoryReassignSelect");
  const confirmBtn = document.getElementById("confirmCategoryDeleteBtn");

  if (inUse) {
    const otherCategories = getCategories().filter((item) => item.id !== id);
    if (!otherCategories.length) {
      messageEl.textContent = `"${category.name}" is used by existing expenses, and there are no other categories to move them to. Add another category first.`;
      reassignGroup.hidden = true;
      confirmBtn.disabled = true;
    } else {
      messageEl.textContent = `"${category.name}" is used by existing expenses. Choose a category to move them to before deleting.`;
      reassignSelect.innerHTML = otherCategories
        .map(
          (item) =>
            `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`,
        )
        .join("");
      reassignGroup.hidden = false;
      confirmBtn.disabled = false;
    }
  } else {
    messageEl.textContent = `Are you sure you want to delete "${category.name}"? This cannot be undone.`;
    reassignGroup.hidden = true;
    confirmBtn.disabled = false;
  }

  document.getElementById("categoryDeleteModal").hidden = false;
}

function closeCategoryDeleteModal() {
  closeModalAnimated("categoryDeleteModal");
  pendingDeleteCategoryId = null;
}

function handleConfirmCategoryDelete() {
  if (!pendingDeleteCategoryId) return;
  const category = getCategories().find(
    (item) => item.id === pendingDeleteCategoryId,
  );
  if (!category) return;

  if (isCategoryInUse(category.name)) {
    const newName = val("categoryReassignSelect");
    if (!newName) return;
    const expenses = getExpenses().map((expense) =>
      expense.category === category.name
        ? { ...expense, category: newName }
        : expense,
    );
    saveExpenses(expenses);
  }

  deleteCategory(pendingDeleteCategoryId);
  closeCategoryDeleteModal();
  populateCategorySelects();
  renderCategoriesPage();
  renderDashboard();
  showToast("Category deleted");
}

/* ==========================================================================
   18. SETTINGS PAGE
   ========================================================================== */

function renderSettingsPage() {
  const settings = getSettings();
  document.getElementById("settingsNameInput").value = settings.name;
  document.getElementById("settingsEmailInput").value = settings.email;
  document.getElementById("settingsThemeSelect").value = settings.theme;
  document.getElementById("settingsNotificationsToggle").checked =
    settings.notifications;
}

function handleSaveProfile() {
  const name = val("settingsNameInput").trim();
  const email = val("settingsEmailInput").trim();
  if (!name || !email) {
    showToast("Name and email cannot be empty");
    return;
  }
  const settings = getSettings();
  settings.name = name;
  settings.email = email;
  saveSettings(settings);
  updateProfileDisplay();
  showToast("Profile updated");
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

function handleExportData() {
  const data = {
    expenses: getExpenses(),
    budget: getBudget(),
    categories: getCategories(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "addco-data-" + todayISO() + ".json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("Data exported");
}

function handleClearData() {
  if (
    !window.confirm(
      "This will permanently delete all your AddCo data from this device. Continue?",
    )
  )
    return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  seedDefaultDataIfNeeded();
  populateCategorySelects();
  updateProfileDisplay();
  applyTheme(getSettings().theme);
  showPage("dashboard");
  showToast("All data cleared");
}

function handleLogout() {
  if (!window.confirm("Are you sure you want to logout?")) return;
  if (window.AddCoAuth) window.AddCoAuth.logout();
  showToast("Logging out…");
  setTimeout(() => window.location.reload(), 700);
}

/* ==========================================================================
   19. EVENT LISTENERS
   ========================================================================== */

function attachEventListeners() {
  /* ---- Top nav / menu ---- */
  document.getElementById("hamburgerBtn").addEventListener("click", toggleMenu);
  document.getElementById("closeMenuBtn").addEventListener("click", closeMenu);
  document.getElementById("menuOverlay").addEventListener("click", closeMenu);
  document
    .getElementById("userChipBtn")
    .addEventListener("click", () => showPage("settings"));
  document
    .getElementById("notifBtn")
    .addEventListener("click", () => showToast("No new notifications"));

  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(link.dataset.page);
    });
  });

  document.querySelectorAll(".footer-nav-item[data-page]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(item.dataset.page);
    });
  });

  /* ---- Profile section ---- */
  document
    .getElementById("profileToggleBtn")
    .addEventListener("click", showProfileExpandedView);
  document
    .getElementById("profileBackBtn")
    .addEventListener("click", showProfileMainView);
  document
    .getElementById("logoutBtnMain")
    .addEventListener("click", handleLogout);

  document.querySelectorAll(".nav-link[data-profile-panel]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const panel = link.dataset.profilePanel;
      if (panel === "personal" || panel === "security") {
        showPage("settings");
      } else if (panel === "help") {
        closeMenu();
        showToast("For help, contact support@addCo.com");
      } else if (panel === "about") {
        closeMenu();
        showToast("AddCo v1.0 — your personal expense tracker");
      }
    });
  });

  /* ---- Dashboard ---- */
  document.querySelectorAll(".panel-link[data-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(link.dataset.page);
    });
  });

  /* ---- Add expense ---- */
  document
    .getElementById("expenseForm")
    .addEventListener("submit", handleAddExpenseSubmit);
  document
    .getElementById("cancelExpenseBtn")
    .addEventListener("click", handleCancelExpense);

  /* ---- My purchases ---- */
  document
    .getElementById("searchInput")
    .addEventListener("input", debounce(renderPurchasesList, 200));
  document
    .getElementById("filterCategory")
    .addEventListener("change", renderPurchasesList);
  document
    .getElementById("filterDateRange")
    .addEventListener("change", renderPurchasesList);
  document
    .getElementById("sortSelect")
    .addEventListener("change", renderPurchasesList);

  document
    .getElementById("purchasesList")
    .addEventListener("click", (event) => {
      const editBtn = event.target.closest("[data-edit-id]");
      const deleteBtn = event.target.closest("[data-delete-id]");
      if (editBtn) openEditExpenseModal(editBtn.dataset.editId);
      if (deleteBtn) openDeleteExpenseModal(deleteBtn.dataset.deleteId);
    });

  /* ---- Edit expense modal ---- */
  document
    .getElementById("editExpenseForm")
    .addEventListener("submit", handleEditExpenseSubmit);
  document
    .getElementById("closeEditModalBtn")
    .addEventListener("click", closeEditExpenseModal);
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", closeEditExpenseModal);

  /* ---- Delete expense modal ---- */
  document
    .getElementById("closeDeleteModalBtn")
    .addEventListener("click", closeDeleteExpenseModal);
  document
    .getElementById("cancelDeleteBtn")
    .addEventListener("click", closeDeleteExpenseModal);
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", handleConfirmDeleteExpense);

  /* ---- Budget page ---- */
  document.getElementById("saveBudgetBtn").addEventListener("click", () => {
    const amount = val("monthlyBudgetInput");
    if (amount === "" || Number(amount) < 0) {
      showToast("Enter a valid budget amount");
      return;
    }
    setMonthlyBudget(amount);
    renderBudgetPage();
    renderDashboard();
    showToast("Monthly budget saved");
  });

  document
    .getElementById("categoryBudgetList")
    .addEventListener("click", (event) => {
      const saveBtn = event.target.closest("[data-save-category-budget]");
      if (!saveBtn) return;
      const categoryName = saveBtn.dataset.saveCategoryBudget;
      const input = document.querySelector(
        `[data-category-budget-input="${CSS.escape(categoryName)}"]`,
      );
      setCategoryBudget(categoryName, input.value);
      renderBudgetPage();
      showToast("Category budget saved");
    });

  /* ---- Reports page ---- */
  document
    .getElementById("reportPeriodSelect")
    .addEventListener("change", renderReportsPage);

  /* ---- Categories page ---- */
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", () => openCategoryModal(null));

  document.getElementById("categoryGrid").addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-edit-category]");
    const deleteBtn = event.target.closest("[data-delete-category]");
    if (editBtn) openCategoryModal(editBtn.dataset.editCategory);
    if (deleteBtn) openCategoryDeleteModal(deleteBtn.dataset.deleteCategory);
  });

  document
    .getElementById("categoryForm")
    .addEventListener("submit", handleCategoryFormSubmit);
  document
    .getElementById("closeCategoryModalBtn")
    .addEventListener("click", closeCategoryModal);
  document
    .getElementById("cancelCategoryBtn")
    .addEventListener("click", closeCategoryModal);

  document
    .getElementById("categoryIconPicker")
    .addEventListener("click", (event) => {
      const btn = event.target.closest("[data-icon]");
      if (!btn) return;
      selectedCategoryIcon = btn.dataset.icon;
      renderIconPicker();
    });

  document
    .getElementById("categoryColorPicker")
    .addEventListener("click", (event) => {
      const btn = event.target.closest("[data-color]");
      if (!btn) return;
      selectedCategoryColor = btn.dataset.color;
      renderColorPicker();
    });

  document
    .getElementById("closeCategoryDeleteModalBtn")
    .addEventListener("click", closeCategoryDeleteModal);
  document
    .getElementById("cancelCategoryDeleteBtn")
    .addEventListener("click", closeCategoryDeleteModal);
  document
    .getElementById("confirmCategoryDeleteBtn")
    .addEventListener("click", handleConfirmCategoryDelete);

  /* ---- Settings page ---- */
  document
    .getElementById("saveProfileBtn")
    .addEventListener("click", handleSaveProfile);

  document
    .getElementById("settingsThemeSelect")
    .addEventListener("change", (event) => {
      const settings = getSettings();
      settings.theme = event.target.value;
      saveSettings(settings);
      applyTheme(settings.theme);
      showToast("Theme updated");
    });

  document
    .getElementById("settingsNotificationsToggle")
    .addEventListener("change", (event) => {
      const settings = getSettings();
      settings.notifications = event.target.checked;
      saveSettings(settings);
    });

  document
    .getElementById("exportDataBtn")
    .addEventListener("click", handleExportData);
  document
    .getElementById("clearDataBtn")
    .addEventListener("click", handleClearData);
  document
    .getElementById("settingsLogoutBtn")
    .addEventListener("click", handleLogout);
}

/* ==========================================================================
   20. INITIALIZATION
   ========================================================================== */

function initApp() {
  seedDefaultDataIfNeeded();
  populateCategorySelects();
  updateProfileDisplay();
  applyTheme(getSettings().theme);
  document.getElementById("dateInput").value = todayISO();
  attachEventListeners();

  const savedPage =
    localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE) || "dashboard";
  showPage(savedPage);
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  setTimeout(() => {
    document.getElementById("loadingScreen").classList.add("is-hidden");
  }, 600);
});
