// --- SUPABASE & STATE MANAGEMENT ---
const SUPABASE_URL = 'https://cswghahhhpcmxulwyxyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzd2doYWhoaHBjbXh1bHd5eHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2ODAxMzAsImV4cCI6MjA3MjI1NjEzMH0.R-rSKNv79jiR-AC_1cU09GRkAtJ6PTFkrlwy8OoGMNY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const appState = {
    currentUser: null,
    isPremium: false,
    inventory: [
        { id: 1, name: "Organic Bananas", quantity: "1 bunch", purchaseDate: "2025-08-28", status: "Fresh" },
        { id: 2, name: "Chicken Breast", quantity: "2 lbs", purchaseDate: "2025-08-30", status: "Fresh" },
        { id: 3, name: "Baby Spinach", quantity: "1 bag", purchaseDate: "2025-08-27", status: "Nearing Expiration" },
        { id: 4, name: "Sourdough Bread", quantity: "1 loaf", purchaseDate: "2025-08-29", status: "Fresh" },
        { id: 5, name: "Milk (2%)", quantity: "1/2 gallon", purchaseDate: "2025-08-25", status: "Expired" },
    ],
    marketplaceItems: [
        { id: 101, name: "Fresh Lettuce Bundle", from: "Alex P. (1.2 miles away)", description: "I have too much lettuce from my garden! Free to a good home.", imageUrl: "https://placehold.co/400x300/a7f3d0/166534?text=Fresh+Lettuce" },
        { id: 102, name: "Sourdough Starter", from: "Maria G. (2.5 miles away)", description: "Active sourdough starter, \"Doughseph\". Needs feeding!", imageUrl: "https://placehold.co/400x300/fde68a/854d0e?text=Sourdough+Starter" },
        { id: 103, name: "Vine-Ripened Tomatoes", from: "Chef Rob's (3.1 miles away)", description: "Restaurant surplus. Perfect for sauce. Approx 5 lbs available.", imageUrl: "https://placehold.co/400x300/fecaca/991b1b?text=Tomatoes" },
    ],
    donatedItems: [],
    usedItemsCount: 0,
    wasteData: {
        labels: ['Produce', 'Dairy', 'Meat', 'Grains', 'Other'],
        data: [40, 15, 25, 10, 10]
    },
    nextId: 6,
    nextMarketplaceId: 104,
};

const SHELF_LIFE = {
    'default': 7, 'bananas': 5, 'chicken': 3, 'spinach': 6, 'bread': 5, 'milk': 7,
    'apples': 14, 'tomatoes': 7, 'lettuce': 5, 'eggs': 21,
};

const DONATION_CENTERS = [
     { name: 'Selam Food Bank', address: 'Meskel Square, Addis Ababa', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.733562035244!2d38.7628203153578!3d9.00033899144315!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b85954536c64b%3A0x238515b345717364!2sMeskel%20Square!5e0!3m2!1sen!2set!4v1661895692345!5m2!1sen!2set' },
     { name: 'Unity Community Kitchen', address: 'Bole Medhane Alem, Addis Ababa', mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15763.637152631744!2d38.78918092723795!3d9.00845318181858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b85f3ab245237%3A0x33b3283287661195!2sMedhane%20Alem%20Cathedral!5e0!3m2!1sen!2set!4v1661895828236!5m2!1sen!2set' }
];


// --- SIDEBAR & RESPONSIVENESS ---
function setupResponsiveHandlers() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
    }

    function toggleMobileMenu() {
        sidebar.classList.toggle('-translate-x-full');
        mobileMenuBackdrop.classList.toggle('hidden');
    }

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', toggleMobileMenu);
}


// --- AUTHENTICATION ---
async function handleSignUp(email, password, fullName, avatarFile) {
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
             if (authError.message.includes("User already registered")) {
                closeModal('signUpModal');
                openModal('accountExistsModal');
                return; // Stop execution here
            }
            throw authError;
        }

        if (!authData.user) throw new Error("Sign up successful, but no user data returned.");

        let avatarUrl = null;
        if (avatarFile) {
            const filePath = `public/${authData.user.id}/${Date.now()}_${avatarFile.name}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(filePath, avatarFile);
            
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = urlData.publicUrl;
        }

        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({ 
                id: authData.user.id, 
                full_name: fullName,
                avatar_url: avatarUrl
            });

        if (profileError) throw profileError;
        
        closeModal('signUpModal');
        openModal('signUpSuccessModal');

    } catch (error) {
        console.error('Sign up error:', error.message);
        showToast(`Error: ${error.message}`, 'error');
    }
}


async function handleLogIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        closeModal('logInModal');
    } catch (error) {
        console.error('Log in error:', error.message);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleLogOut(event) {
    if (event) event.stopPropagation(); // Prevents the settings tab from opening
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        appState.isPremium = false;
        updatePremiumUI();
        showToast("You've been logged out.");
        switchTab('dashboard');
    } catch (error) {
        console.error('Log out error:', error.message);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleProfileUpdate(fullName, avatarFile) {
    try {
        const user = appState.currentUser;
        if (!user) throw new Error("You must be logged in to update your profile.");

        let avatarUrl = user.profile.avatar_url; // Keep old URL by default

        if (avatarFile) {
            // Upload new avatar
            const filePath = `public/${user.id}/${Date.now()}_${avatarFile.name}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(filePath, avatarFile);
            
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = urlData.publicUrl;
        }

        const { data, error } = await supabaseClient
            .from('profiles')
            .update({ full_name: fullName, avatar_url: avatarUrl })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;
        
        // Update local state
        appState.currentUser.profile = data;
        updateApp();
        
        showToast("Profile updated successfully!");

    } catch (error) {
        console.error('Profile update error:', error.message);
        showToast(`Error: ${error.message}`, 'error');
    }
}


// --- UI & RENDERING FUNCTIONS ---
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userEmailEl = document.getElementById('user-email');
    const userAvatarEl = document.getElementById('user-avatar');
    const dashboardHeader = document.getElementById('dashboard-header');
    const settingsTab = document.querySelector('.nav-item[onclick="switchTab(\'settings\')"]');

    if (appState.currentUser && appState.currentUser.profile) {
        const profile = appState.currentUser.profile;
        authButtons.classList.add('hidden');
        userProfile.classList.remove('hidden');
        if (settingsTab) settingsTab.classList.remove('hidden');

        userEmailEl.textContent = appState.currentUser.email;
        userAvatarEl.src = profile.avatar_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=??';
        dashboardHeader.textContent = `Welcome, ${profile.full_name ? profile.full_name.split(' ')[0] : 'Back'}!`;
    } else {
        authButtons.classList.remove('hidden');
        userProfile.classList.add('hidden');
        if (settingsTab) settingsTab.classList.add('hidden');

        userEmailEl.textContent = '';
        userAvatarEl.src = '';
        dashboardHeader.textContent = `Welcome Back!`;
    }
}

function updatePremiumUI() {
    const premiumAdBox = document.getElementById('premium-ad-box');
    if (!premiumAdBox) return;

    const textContent = premiumAdBox.querySelector('.nav-text');
    const iconContent = premiumAdBox.querySelector('.hidden');
    
    if (appState.isPremium) {
        if (textContent) {
            textContent.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                     <h3 class="font-bold text-lg">Premium Member</h3>
                </div>`;
        }
        if (iconContent) iconContent.classList.remove('hidden');
        premiumAdBox.classList.remove('bg-green-600');
        premiumAdBox.classList.add('bg-green-700');
    } else {
        if (textContent) {
            textContent.innerHTML = `
                <h3 class="font-bold text-lg">Go Premium!</h3>
                <p class="text-sm mt-2 mb-4">Get advanced AI insights and analytics for your restaurant.</p>
                <button onclick="openModal('upgradeModal')" class="bg-white text-green-600 font-semibold py-2 px-4 rounded-full w-full hover:bg-green-50 transition-colors">Upgrade Now</button>
            `;
        }
        if (iconContent) iconContent.classList.add('hidden');
        premiumAdBox.classList.add('bg-green-600');
        premiumAdBox.classList.remove('bg-green-700');
    }
}

window.switchTab = function(tabId) {
    if (tabId === 'settings' && !appState.currentUser) {
        showToast("You must be logged in to view settings.", "error");
        return;
    }
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-green-100', 'text-green-700');
        item.classList.add('text-slate-600');
    });

    const activeNavItem = document.querySelector(`.nav-item[onclick="switchTab('${tabId}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('bg-green-100', 'text-green-700');
        activeNavItem.classList.remove('text-slate-600');
    }

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            mobileMenuBackdrop.classList.add('hidden');
        }
    }
}

function renderInventory() {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (appState.inventory.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-slate-500">Your inventory is empty. Add an item to get started!</td></tr>`;
        return;
    }

    appState.inventory.forEach(item => {
        const { daysLeft, statusColor, statusText } = calculateExpiration(item.purchaseDate, item.name);
        item.status = statusText;

        const row = document.createElement('tr');
        row.className = 'border-b border-slate-200 hover:bg-slate-50 transition-colors';
        row.innerHTML = `
            <td class="p-4 font-medium text-slate-800">${item.name}</td>
            <td class="p-4 text-slate-600 hidden sm:table-cell">${item.quantity}</td>
            <td class="p-4 text-slate-600 hidden md:table-cell">${new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString()}</td>
            <td class="p-4 text-slate-600">${daysLeft >= 0 ? `${daysLeft} days` : 'Expired'}</td>
            <td class="p-4"><span class="px-3 py-1 text-xs font-semibold rounded-full ${statusColor}">${item.status}</span></td>
            <td class="p-4 text-center">
                <button onclick="openConfirmationModal(${item.id}, 'used')" class="text-green-600 hover:text-green-800 p-1" title="Mark as Used">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </button>
                <button onclick="openConfirmationModal(${item.id}, 'donate')" class="text-blue-600 hover:text-blue-800 p-1 ml-2" title="Donate Item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                </button>
                <button onclick="openConfirmationModal(${item.id}, 'wasted')" class="text-red-600 hover:text-red-800 p-1 ml-2" title="Mark as Wasted">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (appState.marketplaceItems.length === 0) {
        grid.innerHTML = `<p class="text-slate-500 col-span-full text-center">The marketplace is empty. Why not share something?</p>`;
        return;
    }

    appState.marketplaceItems.forEach(item => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-xl shadow-sm overflow-hidden group";
        card.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="w-full h-40 object-cover group-hover:scale-105 transition-transform" onerror="this.onerror=null;this.src='https://placehold.co/400x300/e2e8f0/64748b?text=Image+Not+Found';">
            <div class="p-4">
                <h3 class="font-bold text-lg text-slate-800">${item.name}</h3>
                <p class="text-sm text-slate-500">From: ${item.from}</p>
                <p class="text-sm text-slate-600 mt-2">${item.description}</p>
                <button onclick="claimMarketplaceItem(${item.id})" class="w-full mt-4 bg-green-500 text-white font-semibold py-2 rounded-lg hover:bg-green-600 transition-colors">Claim Item</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderDashboard() {
    document.getElementById('dashboard-item-count').textContent = appState.inventory.length;
    document.getElementById('dashboard-items-used').textContent = appState.usedItemsCount;
    document.getElementById('dashboard-items-donated').textContent = appState.donatedItems.length;
    document.getElementById('dashboard-waste-estimate').textContent = `~${(appState.inventory.filter(i => i.status === 'Nearing Expiration').length / (appState.inventory.length || 1) * 15).toFixed(0)}%`;
    document.getElementById('dashboard-waste-total').textContent = `${(appState.wasteData.data.reduce((a,b) => a+b, 0) * 0.05).toFixed(1)} kg`;
    document.getElementById('dashboard-money-saved').textContent = `$${(appState.usedItemsCount * 4.5).toFixed(2)}`;
    
    renderAiSuggestions();
}

function renderAiSuggestions() {
    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = '';
    const suggestions = getAiSuggestions();

    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = `<p class="text-sm text-slate-500">No suggestions right now. Add more items to your inventory!</p>`;
        return;
    }

    suggestions.forEach(suggestion => {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'bg-slate-100 p-4 rounded-lg';
        suggestionEl.innerHTML = `
            <p class="font-semibold text-slate-700 text-sm">${suggestion.title}</p>
            <p class="text-xs text-slate-500 mt-1">${suggestion.description}</p>
        `;
        suggestionsContainer.appendChild(suggestionEl);
    });
}

function renderDonatedItems() {
    const container = document.getElementById('donated-items-list');
    const dropoffBtn = document.getElementById('find-dropoff-btn');
    if (!container || !dropoffBtn) return;
    container.innerHTML = '';

    if (appState.donatedItems.length === 0) {
        container.innerHTML = `<div class="text-center p-6 bg-slate-100 rounded-lg"><p class="text-slate-500">Your donation basket is empty. Add items from your inventory to donate them.</p></div>`;
        dropoffBtn.disabled = true;
    } else {
        dropoffBtn.disabled = false;
        appState.donatedItems.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = "bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between";
            itemEl.innerHTML = `
                <div>
                    <p class="font-semibold text-slate-800">${item.name}</p>
                    <p class="text-sm text-slate-500">${item.quantity}</p>
                </div>
                <button onclick="undoDonation(${item.id})" class="text-slate-500 hover:text-red-600 transition-colors" title="Remove from donations">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            container.appendChild(itemEl);
        });
    }
}

function renderSettingsPage() {
    if (!appState.currentUser || !appState.currentUser.profile) {
        // Hide or show a placeholder if the user isn't logged in
        // (though the tab itself is hidden, this is good practice)
        return;
    }
    const profile = appState.currentUser.profile;
    
    document.getElementById('settings-avatar-preview').src = profile.avatar_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=??';
    document.getElementById('settings-fullname').value = profile.full_name || '';
    document.getElementById('settings-email').value = appState.currentUser.email;

    const membershipContainer = document.getElementById('membership-status');
    if(appState.isPremium) {
        membershipContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="bg-green-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <div>
                    <p class="font-semibold text-slate-800">Premium Member</p>
                    <p class="text-sm text-slate-500">You have access to all features.</p>
                </div>
            </div>`;
    } else {
        membershipContainer.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                 <div class="bg-slate-100 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M20 12.58A10 10 0 1 1 12 2a10 10 0 0 1 10 10.58Z"/><path d="M12 2v20"/><path d="m18.36 18.36-1.41-1.41"/><path d="m6.05 6.05-1.41-1.41"/><path d="m18.36 5.64-1.41 1.41"/><path d="m6.05 17.95-1.41 1.41"/></svg>
                </div>
                <div>
                    <p class="font-semibold text-slate-800">Free Tier</p>
                    <p class="text-sm text-slate-500">Basic tracking and marketplace access.</p>
                </div>
            </div>
            <button onclick="openModal('upgradeModal')" class="w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">Upgrade to Premium</button>
        `;
    }
}


// --- LOGIC & DATA FUNCTIONS ---
function calculateExpiration(purchaseDateStr, itemName) { 
    const purchaseDate = new Date(purchaseDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const nameKey = itemName.toLowerCase().split(' ')[0];
    const life = SHELF_LIFE[nameKey] || SHELF_LIFE['default'];
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(purchaseDate.getDate() + life);
    const diffTime = expiryDate - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let statusColor, statusText;
    if (daysLeft < 0) { statusColor = 'bg-red-100 text-red-700'; statusText = 'Expired';
    } else if (daysLeft <= 2) { statusColor = 'bg-yellow-100 text-yellow-700'; statusText = 'Nearing Expiration';
    } else { statusColor = 'bg-green-100 text-green-700'; statusText = 'Fresh'; }
    return { daysLeft, statusColor, statusText };
}

function addItem(name, quantity, purchaseDate) {
    const newItem = { id: appState.nextId++, name, quantity, purchaseDate, status: 'Fresh' };
    appState.inventory.unshift(newItem);
    updateApp();
}

function addMarketplaceItem(name, description, imageUrl) {
    const newItem = {
        id: appState.nextMarketplaceId++,
        name,
        description,
        imageUrl: imageUrl || `https://placehold.co/400x300/e2e8f0/64748b?text=${name.replace(/\s/g,'+')}`,
        from: appState.currentUser && appState.currentUser.profile ? appState.currentUser.profile.full_name : "Anonymous User"
    };
    appState.marketplaceItems.unshift(newItem);
    updateApp();
}

function claimMarketplaceItem(itemId) {
    const itemIndex = appState.marketplaceItems.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        const item = appState.marketplaceItems[itemIndex];
        
        const today = new Date().toISOString().split('T')[0];
        addItem(item.name, '1 unit (from marketplace)', today);

        appState.marketplaceItems.splice(itemIndex, 1);
        
        updateApp();
        showToast(`'${item.name}' claimed and added to your inventory!`);
    }
}

let wasteChart;
function logUsage(itemId, status) {
    const itemIndex = appState.inventory.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        const item = appState.inventory[itemIndex];
        if (status === 'wasted' && wasteChart) {
            const categoryIndex = Math.floor(Math.random() * appState.wasteData.labels.length);
            appState.wasteData.data[categoryIndex] += 5;
            wasteChart.data.datasets[0].data = appState.wasteData.data;
            wasteChart.update();
        } else if (status === 'used') {
            appState.usedItemsCount++;
        }
        appState.inventory.splice(itemIndex, 1);
        updateApp();
        showToast(`'${item.name}' marked as ${status}.`);
    }
}

function donateItem(itemId) {
    const itemIndex = appState.inventory.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        const [itemToDonate] = appState.inventory.splice(itemIndex, 1);
        appState.donatedItems.push(itemToDonate);
        updateApp();
        showToast(`'${itemToDonate.name}' added to your donation basket.`);
    }
}

function undoDonation(itemId) {
    const itemIndex = appState.donatedItems.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        const [itemToReturn] = appState.donatedItems.splice(itemIndex, 1);
        appState.inventory.push(itemToReturn);
        appState.inventory.sort((a,b) => b.id - a.id); 
        updateApp();
        showToast(`'${itemToReturn.name}' returned to inventory.`);
    }
}


function getAiSuggestions() {
    const suggestions = [];
    const inventoryNames = appState.inventory.map(i => i.name.toLowerCase());
    if (inventoryNames.includes('chicken breast') && inventoryNames.includes('baby spinach')) {
        suggestions.push({ title: "Meal Idea: Chicken & Spinach", description: "Your chicken and spinach are fresh. Try making a stir-fry or a salad tonight!" });
    }
    const expiringSoon = appState.inventory.find(item => item.status === 'Nearing Expiration');
    if (expiringSoon) {
        suggestions.push({ title: `Use Soon: ${expiringSoon.name}`, description: `Your ${expiringSoon.name.toLowerCase()} is nearing its expiration. Plan to use it.` });
    }
    const ripeBananas = appState.inventory.find(i => i.name.toLowerCase().includes('banana') && i.status === 'Nearing Expiration');
    if (ripeBananas) {
        suggestions.push({ title: "Recipe: Banana Bread", description: "Your bananas are getting ripe! Perfect for making delicious banana bread." });
    }
    return suggestions.slice(0, 3);
}


// --- MODAL & NOTIFICATION HANDLING ---
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
}
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

window.openDirectionsModal = function(name, address, mapUrl) {
    document.getElementById('directions-title').textContent = `Directions to ${name}`;
    document.getElementById('directions-address').textContent = address;
    document.getElementById('directions-map').src = mapUrl;
    
    const openInMapsBtn = document.getElementById('open-in-maps-btn');
    openInMapsBtn.href = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

    const directionsList = document.getElementById('directions-list');
    directionsList.innerHTML = `
        <li class="ml-4">
            <div class="absolute w-3 h-3 bg-green-500 rounded-full mt-1.5 -left-1.5 border border-white"></div>
            <p class="text-sm font-semibold text-slate-700">Start</p>
            <p class="text-xs text-slate-500">Head north on Bole Road.</p>
        </li>
        <li class="ml-4">
            <div class="absolute w-3 h-3 bg-slate-300 rounded-full mt-1.5 -left-1.5 border border-white"></div>
            <p class="text-sm font-semibold text-slate-700">Turn right onto Ring Road</p>
            <p class="text-xs text-slate-500">After 2.5 km</p>
        </li>
        <li class="ml-4">
            <div class="absolute w-3 h-3 bg-slate-300 rounded-full mt-1.5 -left-1.5 border border-white"></div>
            <p class="text-sm font-semibold text-slate-700">Continue straight</p>
            <p class="text-xs text-slate-500">For 1.8 km</p>
        </li>
        <li class="ml-4">
            <div class="absolute w-3 h-3 bg-blue-500 rounded-full mt-1.5 -left-1.5 border border-white"></div>
            <p class="text-sm font-semibold text-slate-700">Destination will be on the left</p>
        </li>
    `;

    openModal('directionsModal');
}

window.openDropOffModal = function() {
    const listContainer = document.getElementById('dropoff-locations-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    DONATION_CENTERS.forEach(center => {
        const itemEl = document.createElement('div');
        itemEl.className = "bg-slate-50 p-4 rounded-lg flex items-center justify-between";
        itemEl.innerHTML = `
            <div>
                <p class="font-semibold text-slate-800">${center.name}</p>
                <p class="text-sm text-slate-500">${center.address}</p>
            </div>
            <button class="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">Get Directions</button>
        `;
        itemEl.querySelector('button').onclick = () => {
            closeModal('donationDropOffModal');
            openDirectionsModal(center.name, center.address, center.mapUrl);
        };
        listContainer.appendChild(itemEl);
    });

    openModal('donationDropOffModal');
}

window.openConfirmationModal = function(itemId, action) {
    const item = appState.inventory.find(i => i.id === itemId);
    if (!item) return;

    const modalTitle = document.getElementById('confirmation-title');
    const modalMessage = document.getElementById('confirmation-message');
    const modalIconContainer = document.getElementById('confirmation-icon-container');
    const confirmBtn = document.getElementById('confirmation-confirm-btn');

    let config;

    switch (action) {
        case 'used':
            config = {
                message: `Are you sure you want to mark '${item.name}' as used?`,
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>`,
                iconBg: 'bg-green-100',
                btnBg: 'bg-green-500 hover:bg-green-600',
                callback: () => logUsage(itemId, 'used')
            };
            break;
        case 'wasted':
            config = {
                message: `Are you sure you want to mark '${item.name}' as wasted?`,
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
                iconBg: 'bg-red-100',
                btnBg: 'bg-red-500 hover:bg-red-600',
                callback: () => logUsage(itemId, 'wasted')
            };
            break;
        case 'donate':
             config = {
                message: `Are you sure you want to add '${item.name}' to your donation basket?`,
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
                iconBg: 'bg-blue-100',
                btnBg: 'bg-blue-500 hover:bg-blue-600',
                callback: () => donateItem(itemId)
            };
            break;
        default:
             return;
    }
    
    modalTitle.textContent = `Confirm Action`;
    modalMessage.textContent = config.message;
    modalIconContainer.innerHTML = config.icon;
    modalIconContainer.className = `mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${config.iconBg}`;
    confirmBtn.className = `text-white font-semibold py-2 px-6 rounded-lg transition-colors ${config.btnBg}`;
    
    confirmBtn.onclick = () => {
        config.callback();
        closeModal('confirmationModal');
    };
    
    openModal('confirmationModal');
}


function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('bg-slate-800', 'bg-red-600');

    if (type === 'error') {
        toast.classList.add('bg-red-600');
    } else {
        toast.classList.add('bg-slate-800');
    }
    
    toast.classList.remove('opacity-0', 'translate-y-4');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
    }, 3000);
}


// --- TOOLTIP HANDLING ---
function setupTooltipHandlers() {
    const sidebar = document.getElementById('sidebar');
    const tooltip = document.getElementById('sidebar-tooltip');
    const tooltipContent = document.getElementById('sidebar-tooltip-content');
    if (!sidebar || !tooltip || !tooltipContent) return;

    const tooltipItems = document.querySelectorAll(
        '.nav-item, #auth-buttons button, #premium-ad-box, #sidebar-toggle-btn, #user-profile button'
    );

    tooltipItems.forEach(item => {
        item.addEventListener('mouseenter', (e) => {
            if (!sidebar.classList.contains('collapsed')) return;

            const target = e.currentTarget;
            let text = '';
            
            if (target.id === 'sidebar-toggle-btn') {
                text = 'Expand Sidebar';
            } else if (target.id === 'premium-ad-box') {
                text = appState.isPremium ? 'Premium Member' : 'Go Premium';
            } else {
                const textEl = target.querySelector('.nav-text');
                if (textEl) {
                    text = textEl.textContent.trim();
                } else if (target.textContent.trim() === 'Log Out') {
                    text = 'Log Out';
                }
            }

            if (!text) return;
            
            tooltipContent.textContent = text;
            const targetRect = target.getBoundingClientRect();
            
            tooltip.style.top = `${targetRect.top + targetRect.height / 2}px`;
            tooltip.style.left = `${targetRect.right + 12}px`;
            
            tooltip.classList.remove('opacity-0');
        });

        item.addEventListener('mouseleave', () => {
            tooltip.classList.add('opacity-0');
        });
    });
}


// --- FILE UPLOAD HANDLING ---
function setupFileUploadHandlers() {
    const scanModal = document.getElementById('scanReceiptModal');
    const dropZone = document.getElementById('drop-zone');
    const browseBtn = document.getElementById('browse-files-btn');
    const fileInput = document.getElementById('receipt-upload-input');
    const progressContainer = document.getElementById('upload-progress-container');

    if (!dropZone || !browseBtn || !fileInput || !progressContainer || !scanModal) return;

    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-green-500', 'bg-green-50');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-green-500', 'bg-green-50');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-green-500', 'bg-green-50');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        progressContainer.classList.remove('hidden');
        progressContainer.innerHTML = `
            <div class="w-full">
                <div class="flex justify-between items-center mb-1">
                    <p class="text-sm font-medium text-slate-700 truncate max-w-xs">${file.name}</p>
                    <p class="text-sm font-medium text-slate-500" id="upload-percentage">0%</p>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2">
                    <div id="progress-bar" class="bg-green-500 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
                <p id="upload-status" class="text-xs text-slate-500 mt-1 text-right"></p>
            </div>
        `;
        simulateUpload(file);
    }

    function simulateUpload(file) {
        const progressBar = document.getElementById('progress-bar');
        const percentageText = document.getElementById('upload-percentage');
        const statusText = document.getElementById('upload-status');
        let progress = 0;
        statusText.textContent = 'Uploading...';
        
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 10) + 5;
            if (progress > 100) progress = 100;

            if(!progressBar || !percentageText) {
                 clearInterval(interval);
                 return;
            }
            progressBar.style.width = `${progress}%`;
            percentageText.textContent = `${progress}%`;

            if (progress === 100) {
                clearInterval(interval);
                statusText.textContent = 'Processing with AI...';
                progressBar.classList.remove('bg-green-500');
                progressBar.classList.add('bg-blue-500');
                
                setTimeout(() => {
                     statusText.textContent = 'Scan Complete!';
                     progressBar.classList.remove('bg-blue-500');
                     progressBar.classList.add('bg-green-500');
                     
                     setTimeout(() => {
                        addItem('Scanned Milk', '1 gallon', new Date().toISOString().split('T')[0]);
                        addItem('Scanned Eggs', '1 dozen', new Date().toISOString().split('T')[0]);
                        
                        const currentModal = document.getElementById('scanReceiptModal');
                        if (currentModal && !currentModal.classList.contains('hidden')) {
                            closeModal('scanReceiptModal');
                        }
                        setTimeout(() => {
                            progressContainer.classList.add('hidden');
                            fileInput.value = '';
                        }, 300);

                     }, 1500);
                }, 2000);
            }
        }, 200);
    }
}


// --- INITIALIZATION ---
function setupEventListeners() {
    document.getElementById('add-item-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.elements['item-name'].value;
        const quantity = e.target.elements['item-quantity'].value;
        const purchaseDate = e.target.elements['purchase-date'].value;
        addItem(name, quantity, purchaseDate);
        closeModal('addItemModal');
        e.target.reset();
        document.getElementById('purchase-date').valueAsDate = new Date();
    });
    
    document.getElementById('share-food-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.elements['share-item-name'].value;
        const description = e.target.elements['share-item-desc'].value;
        const imageUrl = e.target.elements['share-image-url'].value;
        addMarketplaceItem(name, description, imageUrl);
        closeModal('shareFoodModal');
        e.target.reset();
    });

    document.getElementById('sign-up-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('.button-text');
        const spinner = button.querySelector('.button-spinner');

        button.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');

        const email = form.elements.email.value;
        const password = form.elements.password.value;
        const fullName = form.elements.fullname.value;
        const avatarFile = form.elements.avatar.files[0];
        
        try {
            await handleSignUp(email, password, fullName, avatarFile);
        } finally {
            button.disabled = false;
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });
    
    document.getElementById('avatar-upload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('avatar-preview').src = event.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('log-in-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('.button-text');
        const spinner = button.querySelector('.button-spinner');

        button.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
        
        const email = form.elements.email.value;
        const password = form.elements.password.value;
        
        try {
            await handleLogIn(email, password);
        } finally {
            button.disabled = false;
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });
    
    // --- Settings Page Event Listeners ---
    const profileForm = document.getElementById('profile-form');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const settingsFullnameInput = document.getElementById('settings-fullname');
    const settingsAvatarInput = document.getElementById('settings-avatar-upload');
    const settingsAvatarPreview = document.getElementById('settings-avatar-preview');

    function toggleProfileEditMode(isEditing) {
        settingsFullnameInput.disabled = !isEditing;
        settingsAvatarInput.disabled = !isEditing;
        settingsFullnameInput.classList.toggle('bg-slate-100', !isEditing);
        settingsFullnameInput.classList.toggle('bg-white', isEditing);
        
        editProfileBtn.classList.toggle('hidden', isEditing);
        cancelEditBtn.classList.toggle('hidden', !isEditing);
        saveProfileBtn.classList.toggle('hidden', !isEditing);
    }

    editProfileBtn?.addEventListener('click', () => toggleProfileEditMode(true));
    cancelEditBtn?.addEventListener('click', () => {
        renderSettingsPage(); // Reset form to original data
        toggleProfileEditMode(false);
    });

    settingsAvatarInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                settingsAvatarPreview.src = event.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = saveProfileBtn;
        const buttonText = button.querySelector('.button-text');
        const spinner = button.querySelector('.button-spinner');

        button.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');

        const fullName = settingsFullnameInput.value;
        const avatarFile = settingsAvatarInput.files[0];
        
        try {
            await handleProfileUpdate(fullName, avatarFile);
            toggleProfileEditMode(false);
        } finally {
            button.disabled = false;
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });


    document.getElementById('upgrade-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        appState.isPremium = true;
        updatePremiumUI();
        closeModal('upgradeModal');
    });

    document.getElementById('find-dropoff-btn')?.addEventListener('click', openDropOffModal);
    
    // --- Password Strength & Visibility ---
    const passwordInput = document.getElementById('signup-password');
    const passwordToggle = document.getElementById('toggle-password-visibility');

    passwordInput?.addEventListener('input', (e) => {
        const value = e.target.value;
        const checks = {
            length: value.length >= 8,
            lowercase: /[a-z]/.test(value),
            uppercase: /[A-Z]/.test(value),
            number: /[0-9]/.test(value),
        };
        
        Object.keys(checks).forEach(key => {
            const el = document.getElementById(`strength-${key}`);
            const icon = el.querySelector('.icon-status');
            if (checks[key]) {
                el.classList.add('password-valid');
                el.classList.remove('password-invalid');
                icon.innerHTML = `<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
            } else {
                el.classList.remove('password-valid');
                el.classList.add('password-invalid');
                icon.innerHTML = `<circle cx="12" cy="12" r="10" fill="currentColor"/>`;
            }
        });
    });
    
    passwordToggle?.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        document.getElementById('eye-icon').classList.toggle('hidden', isPassword);
        document.getElementById('eye-off-icon').classList.toggle('hidden', !isPassword);
    });

    
    window.handleLogOut = handleLogOut;
}

function initChart() {
    const ctx = document.getElementById('wasteChart')?.getContext('2d');
    if (!ctx) return;
    wasteChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: appState.wasteData.labels,
            datasets: [{
                label: 'Waste by Category',
                data: appState.wasteData.data,
                backgroundColor: ['#22c55e', '#facc15', '#ef4444', '#f97316', '#64748b'],
                borderColor: '#ffffff',
                borderWidth: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        boxWidth: 12,
                        font: { family: "'Inter', sans-serif" }
                    }
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });
}

function updateApp() {
    renderInventory();
    renderDashboard();
    renderMarketplace();
    renderDonatedItems();
    updateAuthUI();
    updatePremiumUI();
    renderSettingsPage();
}

// Main App Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupResponsiveHandlers();
    setupEventListeners();
    setupTooltipHandlers();
    setupFileUploadHandlers();

    const purchaseDateEl = document.getElementById('purchase-date');
    if(purchaseDateEl) purchaseDateEl.valueAsDate = new Date();
    
    initChart();

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        let userProfile = null;
        if (session) {
             const { data, error } = await supabaseClient
                .from('profiles')
                .select(`*`)
                .eq('id', session.user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') { // 'PGRST116' is 'No rows found'
                console.error("Error fetching profile:", error);
            }
            userProfile = data;
            
            appState.currentUser = { ...session.user, profile: userProfile };
        } else {
            appState.currentUser = null;
        }
        updateApp();
    });
});