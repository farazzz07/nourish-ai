document.addEventListener('DOMContentLoaded', () => {
    // 0. Authentication Check
    const user = JSON.parse(localStorage.getItem('nourishUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    let userMeals = JSON.parse(localStorage.getItem('nourishMeals')) || [];
    let aiHealthScore = parseInt(localStorage.getItem('nourishHealthScore')) || 50;
    let userHabits = JSON.parse(localStorage.getItem('nourishHabits')) || [
        { id: 1, name: "Drink 2L of Water", streak: 0, completed: false, color: "var(--primary-color)" },
        { id: 2, name: "Eat 3 Servings of Veggies", streak: 0, completed: false, color: "#f59e0b" },
        { id: 3, name: "No Sugar After 8 PM", streak: 0, completed: false, color: "#8b5cf6" }
    ];
    let caloriesChartInstance = null;
    let macrosChartInstance = null;

    // Update Profile UI
    const userNameEl = document.querySelector('.user-name');
    const userStatusEl = document.querySelector('.user-status');
    const avatarImg = document.querySelector('.avatar img');
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`;
    
    if (userNameEl) userNameEl.textContent = user.name;
    if (userStatusEl) userStatusEl.textContent = user.goal;
    if (avatarImg) avatarImg.src = avatarUrl;

    // Update Settings Page Profile
    const settingsName = document.getElementById('settings-name');
    const settingsGoal = document.getElementById('settings-goal');
    const settingsAvatar = document.querySelector('.settings-avatar');
    
    if (settingsName) settingsName.textContent = user.name;
    if (settingsGoal) settingsGoal.textContent = user.goal;
    if (settingsAvatar) settingsAvatar.src = avatarUrl;

    // 1. Contextual Greeting
    const updateContextualUI = () => {
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('greeting-text');
        
        let greeting = 'Good Evening';
        if (hour >= 5 && hour < 12) greeting = 'Good Morning';
        else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';

        const firstName = user.name.split(' ')[0];
        if (greetingEl) greetingEl.textContent = `${greeting}, ${firstName}`;
    };

    // 1b. Rotating Suggestions Every Minute
    const initRotatingSuggestions = () => {
        const suggestions = [
            {
                context: "Lunchtime",
                title: "Grilled Chicken Quinoa Bowl",
                reason: "Based on your intense workout this morning and low protein intake yesterday, this high-protein, complex-carb meal will optimize your recovery.",
                macros: { p: "45g", c: "50g", f: "15g" }
            },
            {
                context: "Energy Boost",
                title: "Matcha Avocado Smoothie",
                reason: "You usually experience a mid-afternoon energy slump. This antioxidant-rich, healthy-fat smoothie provides sustained energy without the crash.",
                macros: { p: "15g", c: "30g", f: "20g" }
            },
            {
                context: "Heart Health",
                title: "Baked Salmon with Asparagus",
                reason: "To meet your weekly Omega-3 targets and support cardiovascular health, this light and delicious dinner is highly recommended.",
                macros: { p: "40g", c: "15g", f: "22g" }
            },
            {
                context: "Brain Power",
                title: "Walnut & Berry Oatmeal",
                reason: "Kickstart cognitive function for your upcoming deep-work session. Walnuts provide brain-healthy fats while berries offer vital antioxidants.",
                macros: { p: "12g", c: "45g", f: "18g" }
            }
        ];

        let currentIndex = 0;
        const contextBadge = document.getElementById('context-badge');
        const suggestionTitle = document.getElementById('suggestion-title');
        const suggestionReason = document.getElementById('suggestion-reason');
        const macroProtein = document.getElementById('macro-protein');
        const macroCarbs = document.getElementById('macro-carbs');
        const macroFat = document.getElementById('macro-fat');

        const updateSuggestion = () => {
            const suggestion = suggestions[currentIndex];
            
            // Add a subtle fade effect if elements exist
            if(suggestionTitle) {
                suggestionTitle.style.opacity = '0.5';
                setTimeout(() => {
                    if(contextBadge) contextBadge.textContent = suggestion.context;
                    if(suggestionTitle) suggestionTitle.textContent = suggestion.title;
                    if(suggestionReason) suggestionReason.textContent = suggestion.reason;
                    if(macroProtein) macroProtein.textContent = `${suggestion.macros.p} Protein`;
                    if(macroCarbs) macroCarbs.textContent = `${suggestion.macros.c} Carbs`;
                    if(macroFat) macroFat.textContent = `${suggestion.macros.f} Fat`;
                    suggestionTitle.style.opacity = '1';
                }, 200);
            }

            currentIndex = (currentIndex + 1) % suggestions.length;
        };

        // Initialize first suggestion right away, then rotate every 60 seconds (60000ms)
        updateSuggestion();
        setInterval(updateSuggestion, 60000);
    };

    // 2. Render Recent Meals
    const renderRecentMeals = () => {
        const mealList = document.getElementById('meal-list');
        const journalList = document.getElementById('journal-meal-list');
        
        const renderHtml = (meals) => {
            if(meals.length === 0) {
                return '<div style="padding: 1rem; color: var(--text-secondary);">No meals logged yet. Log your first meal to get started!</div>';
            }
            return meals.map(meal => `
                <div class="meal-item" style="background: rgba(0,0,0,0.2);">
                    <div class="meal-icon" style="color: ${meal.color || '#3b82f6'};">
                        <i class="fa-solid ${meal.icon || 'fa-utensils'}"></i>
                    </div>
                    <div class="meal-details">
                        <h4>${meal.name}</h4>
                        <p>${meal.time}</p>
                    </div>
                    <div class="meal-calories">${meal.cals}</div>
                </div>
            `).join('');
        };

        if(mealList) mealList.innerHTML = renderHtml(userMeals.slice(0, 4)); // Only 4 for dashboard
        if(journalList) journalList.innerHTML = renderHtml(userMeals);
    };

    // 3. Modal Logic
    const initModal = () => {
        const modal = document.getElementById('meal-modal');
        const openBtn = document.getElementById('log-meal-btn');
        const closeBtn = document.getElementById('close-modal');

        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    };

    // 4. Animate Circular Progress
    const updateHealthScoreUI = (score) => {
        const circle = document.querySelector('.circular-progress');
        const scoreVal = document.querySelector('.score-value');
        const scoreStatus = document.querySelector('.score-status');
        
        if(!circle || !scoreVal) return;
        
        circle.setAttribute('data-progress', score);
        scoreVal.textContent = score;

        if(scoreStatus) {
            if(score >= 80) { scoreStatus.textContent = "Excellent"; scoreStatus.className = "score-status text-success"; }
            else if(score >= 60) { scoreStatus.textContent = "Good"; scoreStatus.className = "score-status" ; scoreStatus.style.color = "var(--primary-color)"; }
            else { scoreStatus.textContent = "Needs Improvement"; scoreStatus.className = "score-status" ; scoreStatus.style.color = "var(--warning)"; }
        }

        let current = 0;
        const interval = setInterval(() => {
            if (current >= score) {
                clearInterval(interval);
            } else {
                current++;
                circle.style.background = `conic-gradient(var(--primary-color) ${current * 3.6}deg, rgba(255,255,255,0.1) 0deg)`;
            }
        }, 15);
    };

    const initProgressBars = () => {
        updateHealthScoreUI(aiHealthScore);
        
        document.querySelectorAll('.progress').forEach(p => {
            const width = p.style.width;
            if(!width) return;
            p.style.width = '0';
            setTimeout(() => { p.style.width = width; }, 100);
        });
    };

    // 5. Navigation Logic
    const initNavigation = () => {
        const navLinks = document.querySelectorAll('#sidebar-nav a');
        const pageViews = document.querySelectorAll('.page-view');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('#sidebar-nav li').forEach(li => {
                    li.classList.remove('active');
                });

                // Add active class to clicked nav item
                link.parentElement.classList.add('active');

                // Hide all views
                pageViews.forEach(view => {
                    view.style.display = 'none';
                    view.classList.remove('active');
                });

                // Show target view
                const targetViewId = `view-${link.getAttribute('data-view')}`;
                const targetView = document.getElementById(targetViewId);
                if (targetView) {
                    targetView.style.display = 'block';
                    setTimeout(() => targetView.classList.add('active'), 10);
                }
            });
        });
    };

    // 6. AI Analysis Logic
    const initAIAnalysis = () => {
        const analyzeBtn = document.getElementById('ai-analyze-btn');
        const inputArea = document.getElementById('ai-meal-input');
        const resultContainer = document.getElementById('ai-analysis-result');
        const resultText = document.getElementById('ai-analysis-text');
        const confirmBtn = document.getElementById('confirm-log-btn');

        if(analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                const text = inputArea.value.trim();
                if (!text) {
                    alert('Please describe what you ate first!');
                    return;
                }

                // Show loading state
                const originalText = analyzeBtn.innerHTML;
                analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
                analyzeBtn.disabled = true;

                // Simulate AI processing delay
                setTimeout(() => {
                    analyzeBtn.innerHTML = originalText;
                    analyzeBtn.disabled = false;
                    
                    // Show mock result
                    resultContainer.style.display = 'block';
                    resultText.innerHTML = `<strong>Estimated Macros:</strong><br>Calories: ~350 kcal | Protein: 12g | Carbs: 45g | Fat: 15g<br><br><em>Insight: Great choice! Blueberries provide excellent antioxidants.</em>`;
                }, 1500);
            });
        }

        if(confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const now = new Date();
                const timeStr = `Today, ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                
                // Add new meal
                userMeals.unshift({
                    name: "AI Logged Meal",
                    time: timeStr,
                    cals: "~350 kcal",
                    icon: "fa-wand-magic-sparkles",
                    color: "#f59e0b"
                });
                
                // Update Health Score (Max 100)
                aiHealthScore = Math.min(100, aiHealthScore + 5);
                
                // Save to localStorage
                localStorage.setItem('nourishMeals', JSON.stringify(userMeals));
                localStorage.setItem('nourishHealthScore', aiHealthScore.toString());
                
                // Re-render UI
                renderRecentMeals();
                updateHealthScoreUI(aiHealthScore);
                initCharts(); // Re-render charts with new data

                // Reset Modal
                alert('Meal logged successfully! Your AI Health Score increased by 5 points.');
                document.getElementById('meal-modal').classList.remove('active');
                inputArea.value = '';
                resultContainer.style.display = 'none';
            });
        }
    };

    // 6b. Render Habits
    const renderHabits = () => {
        const habitsList = document.getElementById('habits-list');
        if(!habitsList) return;

        habitsList.innerHTML = userHabits.map((habit, index) => {
            const btnBg = habit.completed ? 'var(--success)' : 'transparent';
            const btnColor = habit.completed ? 'white' : 'var(--text-secondary)';
            const btnBorder = habit.completed ? 'none' : '2px solid var(--text-secondary)';
            const streakColor = habit.completed ? 'var(--success)' : 'var(--text-secondary)';
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; background: rgba(0,0,0,0.2); border-radius: var(--border-radius-sm); border-left: 4px solid ${habit.color};">
                    <div>
                        <h3 style="margin-bottom: 0.3rem;">${habit.name}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;"><i class="fa-solid fa-fire" style="color: ${streakColor};"></i> ${habit.streak} day streak</p>
                    </div>
                    <button class="habit-btn" data-index="${index}" style="background: ${btnBg}; color: ${btnColor}; border: ${btnBorder}; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; transition: all 0.2s;"><i class="fa-solid fa-check"></i></button>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.habit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                const habit = userHabits[idx];
                habit.completed = !habit.completed;
                habit.streak += habit.completed ? 1 : -1;
                if(habit.streak < 0) habit.streak = 0;
                
                localStorage.setItem('nourishHabits', JSON.stringify(userHabits));
                renderHabits();
            });
        });
    };

    // 7. Add to Plan & Profile Click Logic
    const initInteractions = () => {
        const addToPlanBtn = document.getElementById('add-to-plan-btn');
        if(addToPlanBtn) {
            addToPlanBtn.addEventListener('click', () => {
                const originalText = addToPlanBtn.innerText;
                addToPlanBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
                addToPlanBtn.style.background = 'var(--success)';
                setTimeout(() => {
                    addToPlanBtn.innerText = originalText;
                    addToPlanBtn.style.background = 'var(--accent-gradient)';
                }, 2000);
            });
        }

        const orderBtn = document.getElementById('order-ingredients-btn');
        if(orderBtn) {
            orderBtn.addEventListener('click', () => {
                const originalText = orderBtn.innerHTML;
                orderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ordering...';
                orderBtn.style.borderColor = 'var(--primary-color)';
                orderBtn.style.color = 'var(--primary-color)';
                
                setTimeout(() => {
                    orderBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Ingredients Ordered!';
                    orderBtn.style.background = 'rgba(59, 130, 246, 0.1)';
                    
                    setTimeout(() => {
                        orderBtn.innerHTML = originalText;
                        orderBtn.style.background = 'transparent';
                        orderBtn.style.borderColor = 'var(--glass-border)';
                        orderBtn.style.color = 'var(--text-primary)';
                    }, 2500);
                }, 1500);
            });
        }

        const profileBtn = document.getElementById('profile-btn');
        if(profileBtn) {
            profileBtn.addEventListener('click', () => {
                // Navigate to settings view
                const settingsLink = document.querySelector('a[data-view="settings"]');
                if(settingsLink) {
                    settingsLink.click();
                }
            });
        }
    };

    // 9. Global Search Logic
    const initSearch = () => {
        const searchInput = document.getElementById('global-search');
        const searchResults = document.getElementById('search-results');

        if(searchInput && searchResults) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if(query.length === 0) {
                    searchResults.style.display = 'none';
                    return;
                }

                const matchedMeals = userMeals.filter(meal => meal.name.toLowerCase().includes(query));
                const matchedHabits = userHabits.filter(habit => habit.name.toLowerCase().includes(query));

                if(matchedMeals.length === 0 && matchedHabits.length === 0) {
                    searchResults.innerHTML = '<div style="padding: 0.5rem; color: var(--text-secondary); text-align: center; font-size: 0.9rem;">No results found</div>';
                    searchResults.style.display = 'flex';
                    return;
                }

                let html = '';
                if(matchedMeals.length > 0) {
                    html += '<div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); padding: 0.2rem 0.5rem; text-transform: uppercase;">Meals</div>';
                    matchedMeals.slice(0, 3).forEach(meal => {
                        html += `
                            <div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.5rem; border-radius: var(--border-radius-sm); cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <div style="color: ${meal.color || '#3b82f6'};"><i class="fa-solid ${meal.icon || 'fa-utensils'}"></i></div>
                                <div>
                                    <div style="font-size: 0.95rem;">${meal.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${meal.cals}</div>
                                </div>
                            </div>
                        `;
                    });
                }

                if(matchedHabits.length > 0) {
                    html += '<div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); padding: 0.2rem 0.5rem; margin-top: 0.5rem; text-transform: uppercase;">Habits</div>';
                    matchedHabits.forEach(habit => {
                        const statusColor = habit.completed ? 'var(--success)' : 'var(--text-secondary)';
                        html += `
                            <div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.5rem; border-radius: var(--border-radius-sm); cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <div style="color: ${habit.color};"><i class="fa-solid fa-bullseye"></i></div>
                                <div>
                                    <div style="font-size: 0.95rem;">${habit.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);"><i class="fa-solid fa-check" style="color: ${statusColor};"></i> ${habit.completed ? 'Completed' : 'Pending'}</div>
                                </div>
                            </div>
                        `;
                    });
                }

                searchResults.innerHTML = html;
                searchResults.style.display = 'flex';
            });

            document.addEventListener('click', (e) => {
                if(!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.style.display = 'none';
                }
            });
            
            searchInput.addEventListener('focus', (e) => {
                if(e.target.value.trim().length > 0) {
                    searchInput.dispatchEvent(new Event('input'));
                }
            });
        }
    };

    // Initialize all functions
    updateContextualUI();
    initRotatingSuggestions();
    renderRecentMeals();
    initModal();
    initNavigation();
    initAIAnalysis();
    initInteractions();
    initSearch();
    
    // 8. Chart Initialization
    const initCharts = () => {
        if(typeof Chart === 'undefined') return;

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Outfit', sans-serif";

        // Calculate dynamic data based on userMeals
        const totalMeals = userMeals.length;
        const totalCalories = totalMeals * 350;
        const totalProtein = totalMeals * 12;
        const totalCarbs = totalMeals * 45;
        const totalFat = totalMeals * 15;

        // Mock historical data for previous days, today is accurate
        const calData = [1800, 2000, 2100, 1900, 2200, 2400, totalCalories || 0];

        const calCtx = document.getElementById('caloriesChart');
        if(calCtx) {
            if(caloriesChartInstance) caloriesChartInstance.destroy();
            caloriesChartInstance = new Chart(calCtx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun (Today)'],
                    datasets: [{
                        label: 'Calories Consumed',
                        data: calData,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderRadius: 6
                    }, {
                        label: 'Goal',
                        data: [2200, 2200, 2200, 2200, 2200, 2200, 2200],
                        type: 'line',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        const macroCtx = document.getElementById('macrosChart');
        if(macroCtx) {
            if(macrosChartInstance) macrosChartInstance.destroy();
            macrosChartInstance = new Chart(macroCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Protein', 'Carbs', 'Fat'],
                    datasets: [{
                        data: totalMeals > 0 ? [totalProtein, totalCarbs, totalFat] : [0, 0, 0],
                        backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    },
                    cutout: '75%'
                }
            });
        }
        
        // Also dynamically update today's macros text
        const macrosTrackers = document.querySelectorAll('.macro-amount h3');
        if(macrosTrackers.length === 4) {
            macrosTrackers[0].textContent = totalCalories.toLocaleString();
            macrosTrackers[1].textContent = totalProtein + 'g';
            macrosTrackers[2].textContent = totalCarbs + 'g';
            macrosTrackers[3].textContent = totalFat + 'g';
        }
    };

    // Initialize charts slightly delayed to ensure canvas is ready
    setTimeout(() => {
        initCharts();
        renderHabits();
        initProgressBars();
    }, 500);
});
