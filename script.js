document.addEventListener('DOMContentLoaded', () => {
    // ---- ESTADO DO APLICATIVO ----
    let expenses = [];
    let categories = [];
    let editingExpenseId = null;
    let categoryChart = null;
    let currentFilter = 'monthly';

    // ---- SELETORES DO DOM ----
    const mainContent = document.querySelector('.main-content');
    const navButtons = document.querySelectorAll('.nav-button');
    
    // Despesas
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expenseListContainer = document.getElementById('expense-list');
    const expenseModal = document.getElementById('expense-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const expenseForm = document.getElementById('expense-form');
    const modalTitle = document.getElementById('modal-title');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const categorySelect = document.getElementById('category');

    // Categorias
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryListContainer = document.getElementById('category-list');
    const categoryModal = document.getElementById('category-modal');
    const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');
    const addCategoryForm = document.getElementById('add-category-form');
    const newCategoryNameInput = document.getElementById('new-category-name');
    
    // Alertas e Confirmações
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

    // Filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    Chart.register(ChartDataLabels);

    // ---- FUNÇÕES DE DADOS ----
    const loadData = () => {
        expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        const storedCategories = localStorage.getItem('categories');
        if (storedCategories) {
            categories = JSON.parse(storedCategories);
        } else {
            categories = [
                { id: '1', name: 'Alimentação' }, { id: '2', name: 'Transporte' },
                { id: '3', name: 'Moradia' }, { id: '4', name: 'Lazer' }, { id: '5', name: 'Outros' }
            ];
            saveCategories();
        }
    };
    const saveExpenses = () => localStorage.setItem('expenses', JSON.stringify(expenses));
    const saveCategories = () => localStorage.setItem('categories', JSON.stringify(categories));

    // ---- LÓGICA DE FILTRAGEM ----
    const getFilteredExpenses = () => {
        const now = new Date();
        let startDate, endDate = new Date();
        switch (currentFilter) {
            case 'monthly': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarterly': const quarter = Math.floor(now.getMonth() / 3); startDate = new Date(now.getFullYear(), quarter * 3, 1); break;
            case 'semiannual': const semester = now.getMonth() < 6 ? 0 : 6; startDate = new Date(now.getFullYear(), semester, 1); break;
            case 'annual': startDate = new Date(now.getFullYear(), 0, 1); break;
            case 'custom':
                startDate = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
                endDate = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;
                if (!startDate || !endDate) return expenses;
                break;
            default: return expenses;
        }
        return expenses.filter(exp => { const expDate = new Date(exp.date + 'T00:00:00'); return expDate >= startDate && expDate <= endDate; });
    };

    // ---- FUNÇÕES DE RENDERIZAÇÃO ----
    const renderAll = () => {
        const filteredExpenses = getFilteredExpenses();
        renderExpenses(filteredExpenses);
        renderCategories();
        renderDashboard(filteredExpenses);
    };
    
    const renderExpenses = (expensesToRender) => {
        expenseListContainer.innerHTML = '';
        if (expensesToRender.length === 0) { expenseListContainer.innerHTML = '<p class="empty-state">Nenhuma despesa encontrada para este período.</p>'; return; }
        const sortedExpenses = [...expensesToRender].sort((a, b) => new Date(b.date) - new Date(a.date));
        const categoriesMap = categories.reduce((acc, cat) => ({...acc, [cat.id]: cat.name}), {});
        sortedExpenses.forEach(expense => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const formattedDate = new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR');
            item.innerHTML = `<div class="list-item-content"><span class="description">${expense.description}</span><span class="details">${formattedDate} | ${categoriesMap[expense.categoryId] || 'Sem Categoria'}</span></div><div class="amount">R$ ${parseFloat(expense.amount).toFixed(2)}</div><div class="actions"><button class="action-btn edit-btn" data-id="${expense.id}">✏️</button><button class="action-btn delete-btn" data-id="${expense.id}">🗑️</button></div>`;
            expenseListContainer.appendChild(item);
        });
    };

    const renderCategories = () => {
        categoryListContainer.innerHTML = '';
        categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';
        categories.forEach(category => {
            const catItem = document.createElement('div');
            catItem.className = 'list-item';
            catItem.innerHTML = `<span>${category.name}</span><div class="actions"><button class="action-btn delete-cat-btn" data-id="${category.id}">🗑️</button></div>`;
            categoryListContainer.appendChild(catItem);
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    };

    const renderDashboard = (expensesToRender) => {
        const total = expensesToRender.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const count = expensesToRender.length;
        const average = count > 0 ? total / count : 0;
        document.getElementById('total-expenses').textContent = `R$ ${total.toFixed(2)}`;
        document.getElementById('average-expense').textContent = `R$ ${average.toFixed(2)}`;
        document.getElementById('expense-count').textContent = count;
        renderCategoryChart(expensesToRender);
    };

    const renderCategoryChart = (expensesToRender) => {
        const ctx = document.getElementById('category-chart').getContext('2d');
        const expensesByCategory = categories.map(category => ({ name: category.name, total: expensesToRender.filter(exp => exp.categoryId === category.id).reduce((sum, exp) => sum + parseFloat(exp.amount), 0), })).filter(c => c.total > 0).sort((a, b) => a.total - b.total);
        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(ctx, { type: 'bar', data: { labels: expensesByCategory.map(c => c.name), datasets: [{ label: 'Gasto por Categoria', data: expensesByCategory.map(c => c.total), backgroundColor: '#38bdf8', }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 80 } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', color: '#f1f5f9', font: { weight: 'bold' }, formatter: (value) => `R$ ${value.toFixed(2)}`, } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(71, 85, 105, 0.5)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'transparent' } } } } });
    };

    // ---- LÓGICA DO MODAL E ALERTAS ----
    const openExpenseModal = (expense = null) => {
        expenseForm.reset();
        if (expense) {
            editingExpenseId = expense.id;
            modalTitle.textContent = 'Editar Despesa';
            descriptionInput.value = expense.description;
            amountInput.value = expense.amount;
            dateInput.value = expense.date;
            categorySelect.value = expense.categoryId;
        } else {
            editingExpenseId = null;
            modalTitle.textContent = 'Adicionar Despesa';
            dateInput.valueAsDate = new Date();
        }
        expenseModal.classList.add('visible');
    };
    const closeExpenseModal = () => expenseModal.classList.remove('visible');
    
    const openCategoryModal = () => {
        addCategoryForm.reset();
        categoryModal.classList.add('visible');
    };
    const closeCategoryModal = () => {
        categoryModal.classList.remove('visible');
    };

    const showAlert = (message) => { alertMessage.textContent = message; alertModal.classList.add('visible'); };
    const showConfirmation = (message, onConfirm) => {
        confirmMessage.textContent = message;
        confirmModal.classList.add('visible');
        confirmOkBtn.onclick = () => { onConfirm(); confirmModal.classList.remove('visible'); };
    };

    // ---- MANIPULADORES DE EVENTOS ----
    navButtons.forEach(button => { button.addEventListener('click', () => { const viewId = button.dataset.view; mainContent.querySelectorAll('.view').forEach(view => view.classList.remove('active-view')); document.getElementById(viewId).classList.add('active-view'); navButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); }); });
    filterButtons.forEach(button => { button.addEventListener('click', () => { currentFilter = button.dataset.filter; filterButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); customDateRange.classList.toggle('visible', currentFilter === 'custom'); renderAll(); }); });
    [startDateInput, endDateInput].forEach(input => input.addEventListener('change', () => { if (currentFilter === 'custom') renderAll(); }));

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) { showAlert('A data da despesa não pode ser no futuro.'); return; }
        const expenseData = { id: editingExpenseId || Date.now().toString(), description: descriptionInput.value.trim(), amount: parseFloat(amountInput.value), date: dateInput.value, categoryId: categorySelect.value, };
        if(!expenseData.description || !expenseData.amount || !expenseData.date || !expenseData.categoryId) { showAlert('Por favor, preencha todos os campos.'); return; }
        if (editingExpenseId) { expenses = expenses.map(exp => exp.id === editingExpenseId ? expenseData : exp); } else { expenses.push(expenseData); }
        saveExpenses();
        renderAll();
        closeExpenseModal();
    });

    addCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newCategoryNameInput.value.trim();
        if (!name) { showAlert('O nome da categoria não pode estar vazio.'); return; }
        if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) { showAlert('Esta categoria já existe.'); return; }
        
        categories.push({ id: Date.now().toString(), name });
        saveCategories();
        renderAll();
        closeCategoryModal();
    });

    expenseListContainer.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) { const expense = expenses.find(exp => exp.id === editBtn.dataset.id); openExpenseModal(expense); }
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) { showConfirmation('Tem certeza que deseja excluir esta despesa?', () => { expenses = expenses.filter(exp => exp.id !== deleteBtn.dataset.id); saveExpenses(); renderAll(); }); }
    });
    
    categoryListContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-cat-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if(expenses.some(exp => exp.categoryId === id)) { showAlert('Esta categoria não pode ser excluída porque está em uso.'); return; }
            showConfirmation('Tem certeza que deseja excluir esta categoria?', () => { categories = categories.filter(cat => cat.id !== id); saveCategories(); renderAll(); });
        }
    });
    
    // Eventos para abrir e fechar modais
    addExpenseBtn.addEventListener('click', openExpenseModal);
    closeModalBtn.addEventListener('click', closeExpenseModal);
    addCategoryBtn.addEventListener('click', openCategoryModal);
    closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    alertOkBtn.addEventListener('click', () => alertModal.classList.remove('visible'));
    confirmCancelBtn.addEventListener('click', () => confirmModal.classList.remove('visible'));
    
    // ---- INICIALIZAÇÃO ----
    const init = () => {
        loadData();
        endDateInput.valueAsDate = new Date();
        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        startDateInput.valueAsDate = firstOfMonth;
        renderAll();
    };

    init();
});