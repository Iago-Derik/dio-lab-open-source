document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentDate = new Date();
    let people = JSON.parse(localStorage.getItem('calendar_people')) || [];
    let tasks = JSON.parse(localStorage.getItem('calendar_tasks')) || [];
    // assignments: { 'YYYY-MM-DD': [ { taskId, personName, color, title } ] }
    let assignments = JSON.parse(localStorage.getItem('calendar_assignments')) || {};

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Holidays (Fixed for Brazil as example, can be expanded)
    const fixedHolidays = {
        '01-01': 'Ano Novo',
        '04-21': 'Tiradentes',
        '05-01': 'Dia do Trabalho',
        '09-07': 'Independência do Brasil',
        '10-12': 'Nossa Senhora Aparecida',
        '11-02': 'Finados',
        '11-15': 'Proclamação da República',
        '12-25': 'Natal'
    };

    // DOM Elements
    const monthSelect = document.getElementById('monthSelect');
    const yearDisplay = document.getElementById('yearDisplay');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    const personInput = document.getElementById('personInput');
    const addPersonBtn = document.getElementById('addPersonBtn');
    const peopleList = document.getElementById('peopleList');
    const taskInput = document.getElementById('taskInput');
    const taskColor = document.getElementById('taskColor');
    const taskType = document.getElementById('taskType');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const legendContainer = document.getElementById('legendContainer');
    const clearDataBtn = document.getElementById('clearDataBtn');

    // Initialize
    init();

    function init() {
        populateMonthSelect();
        render();
        setupEventListeners();
    }

    function setupEventListeners() {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            render();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            render();
        });

        monthSelect.addEventListener('change', (e) => {
            currentDate.setMonth(parseInt(e.target.value));
            render();
        });

        addPersonBtn.addEventListener('click', addPerson);
        addTaskBtn.addEventListener('click', addTask);
        clearDataBtn.addEventListener('click', clearData);
    }

    function populateMonthSelect() {
        monthSelect.innerHTML = '';
        months.forEach((m, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = m;
            monthSelect.appendChild(option);
        });
    }

    function render() {
        // Update Header
        monthSelect.value = currentDate.getMonth();
        yearDisplay.textContent = currentDate.getFullYear();

        // Save State
        saveState();

        // Render Components
        renderCalendar();
        renderSidebarLists();
        renderLegend();
    }

    function saveState() {
        localStorage.setItem('calendar_people', JSON.stringify(people));
        localStorage.setItem('calendar_tasks', JSON.stringify(tasks));
        localStorage.setItem('calendar_assignments', JSON.stringify(assignments));
    }

    function addPerson() {
        const name = personInput.value.trim();
        if (name && !people.includes(name)) {
            people.push(name);
            personInput.value = '';
            render();
        } else if (people.includes(name)) {
            alert('Essa pessoa já foi adicionada.');
        }
    }

    function addTask() {
        const title = taskInput.value.trim();
        const color = taskColor.value;
        const type = taskType.value; // 'even', 'odd', 'random'

        if (!title) {
            alert('Por favor, digite o nome da tarefa.');
            return;
        }

        if (people.length === 0) {
            alert('Adicione pelo menos uma pessoa antes de criar tarefas.');
            return;
        }

        const newTask = {
            id: Date.now(),
            title,
            color,
            type
        };

        tasks.push(newTask);
        distributeTask(newTask);

        taskInput.value = '';
        render();
    }

    function distributeTask(task) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Helper to check if a person works on prev/next day
        const hasConflict = (person, dateKey) => {
            const checkDate = new Date(dateKey + 'T00:00:00'); // Safe date parsing

            // Previous day
            const prevDate = new Date(year, month, checkDate.getDate() - 1);
            const prevKey = formatDate(prevDate);
            if (assignments[prevKey]) {
                if (assignments[prevKey].some(a => a.personName === person)) return true;
            }

            // Next day
            const nextDate = new Date(year, month, checkDate.getDate() + 1);
            const nextKey = formatDate(nextDate);
            if (assignments[nextKey]) {
                if (assignments[nextKey].some(a => a.personName === person)) return true;
            }

            return false;
        };

        // Determine target days
        let targetDays = [];
        for (let d = 1; d <= daysInMonth; d++) {
            if (task.type === 'even' && d % 2 === 0) targetDays.push(d);
            if (task.type === 'odd' && d % 2 !== 0) targetDays.push(d);
            if (task.type === 'random') targetDays.push(d); // We will pick from these later
        }

        if (task.type === 'random') {
            // For random, we want to distribute tasks across the month for available people
            // Let's try to assign this task roughly (days / people) times?
            // OR the requirement implies "distribute randomly among people".
            // Let's assume we want to fill SOME days with this task.
            // Let's try to assign it to ~50% of days randomly or let user specify?
            // The prompt says "distribuir aletoriamente as tarefas entre essas pessoas".
            // It sounds like we should assign the task to ALL applicable days (even/odd is explicit),
            // but for 'random', maybe it means "Assign to random days"?
            // Re-reading: "opção de caso tenha mais de uma tarefa ou pessoa, que possa distribuir aletoriamente as tarefas entre essas pessoas"
            // It seems "Random" applies to WHO gets the task, not necessarily WHICH days.
            // BUT "sem repetir as tarefas para as mesmas pessoas em dias consecutivos".

            // Let's interpret "Random" as: Assign this task to Every Day (or Random Days?), but pick a random person.
            // Given "Even/Odd" are date selectors, "Random" might be interpreted as "Assign to random days".
            // BUT the prompt links random distribution to PEOPLE.

            // Let's assume for "Even/Odd" we assign to ALL even/odd days.
            // For "Random", let's assign to ALL days (or a subset?) but randomize the person.
            // Let's stick to: Assign to ALL days of the month by default if not even/odd, but shuffle people.

            // Wait, "distribute randomly... among people".
            // I will implement: Assign to ALL days of the month, but pick a person randomly for each day, respecting the constraint.

            targetDays = [];
            for (let d = 1; d <= daysInMonth; d++) targetDays.push(d);
        }

        targetDays.forEach(day => {
            const date = new Date(year, month, day);
            const dateKey = formatDate(date);

            // Filter available people (constraint: no consecutive days)
            let availablePeople = people.filter(p => !hasConflict(p, dateKey));

            // If everyone has a conflict, relax the constraint or just pick random?
            // Let's just pick random from all if strict constraint fails, to ensure assignment.
            if (availablePeople.length === 0) availablePeople = people;

            const randomPerson = availablePeople[Math.floor(Math.random() * availablePeople.length)];

            if (!assignments[dateKey]) assignments[dateKey] = [];
            assignments[dateKey].push({
                taskId: task.id,
                title: task.title,
                color: task.color,
                personName: randomPerson
            });
        });
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';

        // Days of week headers
        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        daysOfWeek.forEach(day => {
            const el = document.createElement('div');
            el.className = 'calendar-day-name';
            el.textContent = day;
            calendarGrid.appendChild(el);
        });

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDayOfMonth; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day empty';
            calendarGrid.appendChild(el);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = formatDate(date);
            const dayKey = formatDateMonthDay(date); // MM-DD for holidays

            const el = document.createElement('div');
            el.className = 'calendar-day';

            // Holiday Check
            if (fixedHolidays[dayKey]) {
                el.classList.add('holiday');
                el.title = fixedHolidays[dayKey];
            }

            const numberEl = document.createElement('div');
            numberEl.className = 'day-number';
            numberEl.textContent = d;
            el.appendChild(numberEl);

            // Tasks
            if (assignments[dateKey]) {
                assignments[dateKey].forEach(assign => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'task-item';
                    taskEl.style.backgroundColor = assign.color;
                    taskEl.textContent = `${assign.title} (${assign.personName})`;
                    taskEl.title = `${assign.title} - ${assign.personName}`;
                    el.appendChild(taskEl);
                });
            }

            calendarGrid.appendChild(el);
        }
    }

    function renderSidebarLists() {
        // People
        peopleList.innerHTML = '';
        people.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            const btn = document.createElement('button');
            btn.textContent = 'X';
            btn.style.marginLeft = '10px';
            btn.style.color = 'red';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                people = people.filter(person => person !== p);
                render(); // Re-render to potential cleanup assignments?
                // Note: keeping assignments even if person deleted for history, or should we remove?
                // For simplicity, we keep history.
            };
            li.appendChild(btn);
            peopleList.appendChild(li);
        });

        // Tasks (definitions)
        taskList.innerHTML = '';
        tasks.forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="width: 10px; height: 10px; display: inline-block; background: ${t.color}; margin-right: 5px;"></span> ${t.title} [${t.type}]`;
            taskList.appendChild(li);
        });
    }

    function renderLegend() {
        legendContainer.innerHTML = '';

        // Holiday Legend
        const holidayItem = document.createElement('div');
        holidayItem.className = 'legend-item';
        holidayItem.innerHTML = `<div class="color-box" style="background-color: var(--holiday-color)"></div> <span>Feriado</span>`;
        legendContainer.appendChild(holidayItem);

        // Tasks Legend
        tasks.forEach(t => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<div class="color-box" style="background-color: ${t.color}"></div> <span>${t.title}</span>`;
            legendContainer.appendChild(item);
        });
    }

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDateMonthDay(date) {
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${m}-${d}`;
    }

    function clearData() {
        if(confirm('Tem certeza que deseja limpar todos os dados?')) {
            localStorage.clear();
            location.reload();
        }
    }
});
