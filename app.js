// State management
let state = {
    salary: 0,
    expenses: [],
    currentCurrency: 'INR',
    conversionRate: 1
};

let chart = null;

// DOM Elements
const salaryInput = document.getElementById('salaryInput');
const setSalaryBtn = document.getElementById('setSalaryBtn');
const expenseName = document.getElementById('expenseName');
const expenseAmount = document.getElementById('expenseAmount');
const addExpenseBtn = document.getElementById('addExpenseBtn');
const errorMessage = document.getElementById('errorMessage');
const totalSalaryDisplay = document.getElementById('totalSalaryDisplay');
const totalExpensesDisplay = document.getElementById('totalExpensesDisplay');
const remainingBalanceDisplay = document.getElementById('remainingBalanceDisplay');
const expensesList = document.getElementById('expensesList');
const thresholdAlert = document.getElementById('thresholdAlert');
const currencyToggleBtn = document.getElementById('currencyToggleBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

// Initialize app
function init() {
    loadFromLocalStorage();
    render();
    initChart();
    fetchConversionRate();
}

// Load data from localStorage
function loadFromLocalStorage() {
    const savedSalary = localStorage.getItem('salary');
    const savedExpenses = localStorage.getItem('expenses');
    
    if (savedSalary) {
        state.salary = parseFloat(savedSalary);
    }
    if (savedExpenses) {
        state.expenses = JSON.parse(savedExpenses);
    }
}

// Save data to localStorage
function saveToLocalStorage() {
    localStorage.setItem('salary', state.salary.toString());
    localStorage.setItem('expenses', JSON.stringify(state.expenses));
}

// Format currency
function formatCurrency(amount) {
    if (state.currentCurrency === 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    } else {
        const usdAmount = amount / state.conversionRate;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(usdAmount);
    }
}

// Calculate totals
function calculateTotals() {
    const totalExpenses = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remainingBalance = state.salary - totalExpenses;
    return { totalExpenses, remainingBalance };
}

// Render all data
function render() {
    const { totalExpenses, remainingBalance } = calculateTotals();
    
    totalSalaryDisplay.textContent = formatCurrency(state.salary);
    totalExpensesDisplay.textContent = formatCurrency(totalExpenses);
    remainingBalanceDisplay.textContent = formatCurrency(remainingBalance);
    
    // Check threshold alert
    if (state.salary > 0 && remainingBalance < state.salary * 0.1) {
        thresholdAlert.classList.remove('hidden');
        remainingBalanceDisplay.parentElement.classList.remove('bg-green-500');
        remainingBalanceDisplay.parentElement.classList.add('bg-red-600');
    } else {
        thresholdAlert.classList.add('hidden');
        remainingBalanceDisplay.parentElement.classList.remove('bg-red-600');
        remainingBalanceDisplay.parentElement.classList.add('bg-green-500');
    }

    // Render expenses list
    expensesList.innerHTML = '';
    state.expenses.forEach((expense, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors';
        li.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800">${expense.name}</p>
                <p class="text-sm text-gray-600">${formatCurrency(expense.amount)}</p>
            </div>
            <button 
                class="delete-btn p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                data-index="${index}"
            >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        expensesList.appendChild(li);
    });

    // Re-attach delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteExpense);
    });

    // Update chart
    updateChart();
}

// Initialize chart
function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const { totalExpenses, remainingBalance } = calculateTotals();

    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Remaining Balance', 'Total Expenses'],
            datasets: [{
                data: [remainingBalance, totalExpenses],
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update chart
function updateChart() {
    if (!chart) return;

    const { totalExpenses, remainingBalance } = calculateTotals();
    chart.data.datasets[0].data = [remainingBalance, totalExpenses];
    chart.update();
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 3000);
}

// Handle set salary
function handleSetSalary() {
    const salary = parseFloat(salaryInput.value);

    if (isNaN(salary) || salary <= 0) {
        showError('Please enter a valid positive salary amount');
        return;
    }

    state.salary = salary;
    salaryInput.value = '';
    saveToLocalStorage();
    render();
}

// Handle add expense
function handleAddExpense() {
    const name = expenseName.value.trim();
    const amount = parseFloat(expenseAmount.value);

    if (!name) {
        showError('Please enter an expense name');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showError('Please enter a valid positive expense amount');
        return;
    }

    state.expenses.push({ name, amount });
    expenseName.value = '';
    expenseAmount.value = '';
    saveToLocalStorage();
    render();
}

// Handle delete expense
function handleDeleteExpense(e) {
    const index = parseInt(e.target.closest('.delete-btn').dataset.index);
    state.expenses.splice(index, 1);
    saveToLocalStorage();
    render();
}

// Fetch conversion rate from Frankfurter API
async function fetchConversionRate() {
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
        const data = await response.json();
        state.conversionRate = data.rates.INR;
    } catch (error) {
        console.error('Error fetching conversion rate:', error);
    }
}

// Toggle currency
async function handleCurrencyToggle() {
    if (state.currentCurrency === 'INR') {
        state.currentCurrency = 'USD';
        currencyToggleBtn.textContent = 'Switch to INR';
    } else {
        state.currentCurrency = 'INR';
        currencyToggleBtn.textContent = 'Switch to USD';
    }
    render();
}

// Download PDF report
function handleDownloadPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Cash Flow Report', 20, 30);

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
    
    const { totalExpenses, remainingBalance } = calculateTotals();
    doc.text(`Total Salary: ${formatCurrency(state.salary)}`, 20, 60);
    doc.text(`Total Expenses: ${formatCurrency(totalExpenses)}`, 20, 75);
    doc.text(`Remaining Balance: ${formatCurrency(remainingBalance)}`, 20, 90);

    doc.text('Expenses:', 20, 110);
    let yPosition = 125;

    state.expenses.forEach((expense, index) => {
        if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
        }
        doc.text(`${index + 1}. ${expense.name}: ${formatCurrency(expense.amount)}`, 25, yPosition);
        yPosition += 15;
    });

    doc.save('cash-flow-report.pdf');
}

// Event listeners
setSalaryBtn.addEventListener('click', handleSetSalary);
addExpenseBtn.addEventListener('click', handleAddExpense);
currencyToggleBtn.addEventListener('click', handleCurrencyToggle);
downloadPdfBtn.addEventListener('click', handleDownloadPdf);

// Allow enter key for inputs
salaryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSetSalary();
});
expenseAmount.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddExpense();
});

// Start the app
init();
