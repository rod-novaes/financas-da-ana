document.addEventListener('DOMContentLoaded', () => {
    // ---- ESTADO DO APLICATIVO ----
    let expenses = [];
    let categories = [];
    let editingExpenseId = null;
    let categoryChart = null;

    // ---- SELETORES DO DOM ----
    const mainContent = document.querySelector('.main-content');
    const navButtons = document.querySelectorAll('.nav-button');
    
    // Elementos da tela de Despesas
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expenseListContainer = document.getElementById('expense-list');

    // Elementos da tela de Categorias
    const addCategoryForm = document.getElementById('add-category-form');
    const newCategoryNameInput = document.getElementById('new-category-name');
    const categoryListContainer = document.getElementById('category-list');

    // Elementos do Modal de Despesas
    const expenseModal = document.getElementById('expense-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const expenseForm = document.getElementById('expense-form');
    const modalTitle = document.getElementById('modal-title');
    const expenseIdInput = document.getElementById('expense-id');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const categorySelect = document.getElementById('category');
    
    // Elementos dos Modais de Alerta/Confirmação
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

    // ---- FUNÇÕES DE DADOS (LOCALSTORAGE) ----
    const loadData = () => {
        const storedExpenses = localStorage.getItem('expenses');
        const storedCategories = localStorage.getItem('categories');

        expenses = storedExpenses ? JSON.parse(storedExpenses) : [];
        if (storedCategories) {
            categories = JSON.parse(storedCategories);
        } else {
            // Categorias padrão se não houver nenhuma salva
            categories = [
                { id: '1', name: 'Alimentação' }, { id: '2', name: 'Transporte' },
                { id: '3', name: 'Moradia' }, { id: '4', name: 'Lazer' }, { id: '5', name: 'Outros' }
            ];
            saveCategories();
        }
    };

    const saveExpenses = () => localStorage.setItem('expenses', JSON.stringify(expenses));
    const saveCategories = () => localStorage.setItem('categories', JSON.stringify(categories));

    // ---- FUNÇÕES DE RENDERIZAÇÃO ----
    const renderAll = () => {
        renderExpenses();
        renderCategories();
        renderDashboard();
    };
    
    const renderExpenses = () => {
        expenseListContainer.innerHTML = '';
        if (expenses.length === 0) {
            expenseListContainer.innerHTML = '<p class="empty-state">Nenhuma despesa adicionada ainda.</p>';
            return;
        }
        
        const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        const categoriesMap = categories.reduce((acc, cat) => ({...acc, [cat.id]: cat.name}), {});

        sortedExpenses.forEach(expense => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-content">
                    <span class="description">${expense.description}</span>
                    <span class="details">${new Date(expense.date).toLocaleDateString()} | ${categoriesMap[expense.categoryId] || 'Sem Categoria'}</span>
                </div>
                <div class="amount">R$ ${parseFloat(expense.amount).toFixed(2)}</div>
                <div class="actions">
                    <button class="action-btn edit-btn" data-id="${expense.id}">✏️</button>
                    <button class="action-btn delete-btn" data-id="${expense.id}">🗑️</button>
                </div>
            `;
            expenseListContainer.appendChild(item);
        });
    };

    const renderCategories = () => {
        categoryListContainer.innerHTML = '';
        categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';

        categories.forEach(category => {
            // Renderiza na lista de gerenciamento
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <span>${category.name}</span>
                <div class="actions">
                    <button class="action-btn delete-cat-btn" data-id="${category.id}">🗑️</button>
                </div>
            `;
            categoryListContainer.appendChild(item);

            // Adiciona como opção no formulário de despesas
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    };
    
    const renderDashboard = () => {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const count = expenses.length;
        const average = count > 0 ? total / count : 0;

        document.getElementById('total-expenses').textContent = `R$ ${total.toFixed(2)}`;
        document.getElementById('average-expense').textContent = `R$ ${average.toFixed(2)}`;
        document.getElementById('expense-count').textContent = count;

        renderCategoryChart();
    };

    const renderCategoryChart = () => {
        const ctx = document.getElementById('category-chart').getContext('2d');
        const expensesByCategory = categories.map(category => {
            const total = expenses
                .filter(exp => exp.categoryId === category.id)
                .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            return { name: category.name, total };
        }).filter(c => c.total > 0);

        if (categoryChart) {
            categoryChart.destroy();
        }

        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: expensesByCategory.map(c => c.name),
                datasets: [{
                    data: expensesByCategory.map(c => c.total),
                    backgroundColor: ['#38bdf8', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#fb923c'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f1f5f9' } }
                }
            }
        });
    };

    // ---- LÓGICA DO MODAL ----
    const openExpenseModal = (expense = null) => {
        expenseForm.reset();
        if (expense) {
            editingExpenseId = expense.id;
            modalTitle.textContent = 'Editar Despesa';
            expenseIdInput.value = expense.id;
            descriptionInput.value = expense.description;
            amountInput.value = expense.amount;
            dateInput.value = expense.date;
            categorySelect.value = expense.categoryId;
        } else {
            editingExpenseId = null;
            modalTitle.textContent = 'Adicionar Despesa';
            dateInput.valueAsDate = new Date(); // Preenche com data atual
        }
        expenseModal.classList.add('visible');
    };

    const closeExpenseModal = () => expenseModal.classList.remove('visible');

    const showAlert = (message) => {
        alertMessage.textContent = message;
        alertModal.classList.add('visible');
    };
    
    const showConfirmation = (message, onConfirm) => {
        confirmMessage.textContent = message;
        confirmModal.classList.add('visible');
        confirmOkBtn.onclick = () => {
            onConfirm();
            confirmModal.classList.remove('visible');
        };
    };

    // ---- MANIPULADORES DE EVENTOS ----
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewId = button.dataset.view;
            
            // Troca a view ativa no conteúdo
            mainContent.querySelectorAll('.view').forEach(view => view.classList.remove('active-view'));
            document.getElementById(viewId).classList.add('active-view');

            // Troca o botão ativo na navegação
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            id: editingExpenseId || Date.now().toString(),
            description: descriptionInput.value,
            amount: parseFloat(amountInput.value),
            date: dateInput.value,
            categoryId: categorySelect.value,
        };
        
        if (editingExpenseId) {
            expenses = expenses.map(exp => exp.id === editingExpenseId ? expenseData : exp);
        } else {
            expenses.push(expenseData);
        }
        
        saveExpenses();
        renderAll();
        closeExpenseModal();
    });

    addCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newCategoryNameInput.value.trim();

        if (!name) {
            showAlert('O nome da categoria não pode estar vazio.');
            return;
        }
        if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            showAlert('Esta categoria já existe.');
            return;
        }

        categories.push({ id: Date.now().toString(), name });
        saveCategories();
        renderAll();
        newCategoryNameInput.value = '';
    });
    
    // Delegação de eventos para botões de editar/excluir
    expenseListContainer.addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            const id = e.target.closest('.edit-btn').dataset.id;
            const expense = expenses.find(exp => exp.id === id);
            openExpenseModal(expense);
        }
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('.delete-btn').dataset.id;
            showConfirmation('Tem certeza que deseja excluir esta despesa?', () => {
                expenses = expenses.filter(exp => exp.id !== id);
                saveExpenses();
                renderAll();
            });
        }
    });

    categoryListContainer.addEventListener('click', (e) => {
        if (e.target.closest('.delete-cat-btn')) {
            const id = e.target.closest('.delete-cat-btn').dataset.id;
            const isCategoryInUse = expenses.some(exp => exp.categoryId === id);
            if(isCategoryInUse) {
                showAlert('Esta categoria não pode ser excluída porque está em uso.');
                return;
            }
            showConfirmation('Tem certeza que deseja excluir esta categoria?', () => {
                categories = categories.filter(cat => cat.id !== id);
                saveCategories();
                renderAll();
            });
        }
    });
    
    // Eventos para fechar modais
    addExpenseBtn.addEventListener('click', () => openExpenseModal());
    closeModalBtn.addEventListener('click', closeExpenseModal);
    alertOkBtn.addEventListener('click', () => alertModal.classList.remove('visible'));
    confirmCancelBtn.addEventListener('click', () => confirmModal.classList.remove('visible'));
    
    // ---- INICIALIZAÇÃO ----
    const init = () => {
        loadData();
        renderAll();
    };

    init();
});