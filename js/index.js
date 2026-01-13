/**
 * index.js - FlowBoard 核心邏輯
 * 包含：身分驗證、自動路由、貼文渲染、全域搜尋、圖片壓縮
 */

// --- 1. 初始化 Supabase ---
const SB_URL = 'https://gwggzmjpigixnjxgfsgd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z2d6bWpwaWdpeG5qeGdmc2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDkyNjAsImV4cCI6MjA4MzYyNTI2MH0.anBepq09VaL2aeGBfhx5vl2JAs3AzcqLdOscTncKTTE';
const _sb = supabase.createClient(SB_URL, SB_KEY);

// --- 2. 全域跳轉與工具函數 ---
// --- 修正後的跳轉邏輯：點擊相同用戶時網址加 ' 並返回首頁 ---
window.goToMyProfile = function(username) {
    const targetId = username || window.myUsername;
    if (!targetId) return;

    // 取得當前網址路徑
    const currentPath = window.location.pathname;
    // 取得目前正在看的用戶 (從 /profile/@username 中提取)
    const currentProfileUser = currentPath.includes('@') ? currentPath.split('@')[1] : null;

    if (currentProfileUser === targetId) {
        // 如果點擊的是同一個人：網址加單引號，然後回首頁
        const cancelUrl = window.location.href + "'";
        window.history.replaceState(null, null, cancelUrl);
        
        // 停頓一下讓使用者看到網址變化，隨即跳回首頁
        setTimeout(() => {
            window.location.href = '/home';
        }, 200);
    } else {
        // 如果是不同人，則正常跳轉到新路由
        window.location.href = `/profile?username=${targetId}`;
    }
};

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return '現在';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h`;
    return `${Math.floor(seconds/86400)}d`;
}

// 圖片壓縮輔助 (保留以供發文或其他功能使用)
async function compressImage(base64Str, maxWidth = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

async function checkSession() {
    const loader = document.getElementById('initial-loader');
    const body = document.body;
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const queryUser = urlParams.get('username'); 

    try {
        const { data: { session } } = await _sb.auth.getSession();

        if (session) {
            const userId = session.user.id;
            
            // 【關鍵修正】不只用 metadata，直接從 profiles 抓取最新設定 (頭像、橫幅、暱稱)
            const { data: myProfile } = await _sb.from('profiles').select('*').eq('id', userId).single();
            
            if (myProfile) {
                window.myUsername = myProfile.username;
                
                // 1. 更新導覽列/側邊欄的暱稱
                const userDisplay = document.getElementById('user-display');
                if (userDisplay) userDisplay.innerText = myProfile.nickname || myProfile.username;

                // 2. 更新全域導覽列的頭像 (如果有該元素)
                const navAvatar = document.getElementById('nav-user-avatar');
                if (navAvatar) {
                    navAvatar.src = myProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myProfile.username}`;
                }

                // 3. 更新發文框旁邊的小頭像 (如果有該元素)
                const postAvatar = document.getElementById('post-area-avatar');
                if (postAvatar) {
                    postAvatar.src = myProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myProfile.username}`;
                }
            }

            // --- 在 checkSession 函數內的路由解析區塊 ---

// 1. 取得當前路徑
const currentPath = window.location.pathname;

// 2. 判斷是否在 profile 相關頁面
const isAtProfile = currentPath.startsWith('/profile');

if (isAtProfile) {
    let targetUsername = "";

    // 嘗試從路徑解析 @ 之後的內容 (例如: /profile/@FayWooooo)
    if (currentPath.includes('@')) {
        targetUsername = currentPath.split('@')[1].split('/')[0];
    } 
    // 如果路徑沒有 @，但 URL 參數有 username (舊版相容)
    else if (urlParams.get('username')) {
        targetUsername = urlParams.get('username').replace('@', '');
    }
    // 如果都沒有，預設看自己的 profile
    else {
        targetUsername = window.myUsername;
    }

    if (targetUsername) {
        console.log("正在加載目標用戶:", targetUsername);
        // 執行你原本寫好的加載函數
        await Promise.all([
            loadUserProfile(targetUsername),
            loadUserPosts(targetUsername)
        ]);
    }
} else if (currentPath === '/' || currentPath === '/home' || currentPath === '/index.html') {
    // 回到首頁加載所有貼文
    await loadPosts();
}
            
            body.classList.add('auth-ready');
            body.classList.remove('guest-ready');
        } else {
            // 未登入處理... (保持原樣)
            const isAtHomeSeries = (currentPath === '/' || currentPath === '/index.html' || currentPath === '/home');
            if (!isAtHomeSeries) {
                window.location.href = '/index.html';
                return;
            }
            body.classList.add('guest-ready');
            body.classList.remove('auth-ready');
        }
    } catch (err) {
        console.error("初始化失敗:", err);
    } finally {
        if (loader) {
            loader.classList.add('loader-hidden');
            setTimeout(() => { loader.style.display = 'none'; }, 300); 
        }
        bindEvents();
    }
}

// --- 4. 資料載入功能 (確保載入 Profile 頁面時橫幅與頭像正確) ---
async function loadUserProfile(targetUsername) {
    const { data, error } = await _sb.from('profiles').select('*').ilike('username', targetUsername).single();
    if (error || !data) return;

    // 1. 設定基礎 UI 文字
    const setUI = (id, text) => { if (document.getElementById(id)) document.getElementById(id).innerText = text || ''; };
    setUI('profile-name', data.nickname || data.username);
    setUI('profile-handle', `@${data.username}`);
    setUI('profile-bio', data.bio || "暫無簡介");
    
    // 2. 設定頭像與橫幅
    if (document.getElementById('profile-avatar')) {
        document.getElementById('profile-avatar').src = data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;
    }
    if (document.getElementById('profile-banner')) {
        document.getElementById('profile-banner').src = data.banner_url || 'https://images.unsplash.com/photo-1557683316-973673baf926';
    }

    // 3. 【關鍵：判斷是否為本人】
    // 比對正在查看的 username 是否等於目前登入的 myUsername
    const isMe = (data.username === window.myUsername);
    
    // 控制「帳號設定」按鈕的顯示 (包含你原本的兩個按鈕)
    const editBtn = document.getElementById('edit-profile-btn');
    const personalSettingsBtn = document.getElementById('personal-settings-btn');

    if (isMe) {
        if (editBtn) editBtn.style.display = 'flex';
        if (personalSettingsBtn) personalSettingsBtn.style.display = 'flex';
    } else {
        if (editBtn) editBtn.style.display = 'none';
        if (personalSettingsBtn) personalSettingsBtn.style.display = 'none';
    }

    // 4. 勳章處理邏輯 (保持不變)
    const badgeContainer = document.getElementById('profile-avatar-container');
    if (badgeContainer) {
        const oldBadge = badgeContainer.querySelector('.profile-badge');
        if (oldBadge) oldBadge.remove();
        let badgeHtml = '';
        if (data.is_official) {
            badgeHtml = `<div class="profile-badge absolute bottom-1 right-1 w-7 h-7 bg-black rounded-full flex items-center justify-center border-2 border-black"><i class="fa-solid fa-shield-halved text-sm text-yellow-500"></i></div>`;
        } else if (data.is_verified) {
            badgeHtml = `<div class="profile-badge absolute bottom-1 right-1 w-7 h-7 bg-black rounded-full flex items-center justify-center border-2 border-black"><i class="fa-solid fa-circle-check text-base text-blue-400"></i></div>`;
        }
        badgeContainer.insertAdjacentHTML('beforeend', badgeHtml);
    }
}

async function loadPosts() {
    if (!document.getElementById('feed')) return;
    const { data, error } = await _sb.from('post_with_profile').select('*').order('created_at', { ascending: false });
    if (!error) renderFeed(data, 'feed');
}

async function loadUserPosts(targetUsername) {
    const container = document.getElementById('user-posts');
    if (!container) return;
    const { data, error } = await _sb.from('post_with_profile').select('*').ilike('username', targetUsername).order('created_at', { ascending: false });
    if (!error) renderFeed(data, 'user-posts');
}

// --- 5. 渲染引擎 ---
// --- 5. 渲染引擎 (優化勳章疊加) ---
async function renderFeed(posts, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;
    if (!posts || posts.length === 0) {
        container.innerHTML = `<div class="p-20 text-center text-zinc-600"><p>尚未有內容</p></div>`;
        return;
    }

    container.innerHTML = posts.map(post => {
        const userProfileLink = `/profile?username=${post.username}`;
        const postDetailLink = `/post/${post.post_id || post.id}`; 
        
        // 勳章 HTML：使用 absolute 定位至右下角
        let badgeHtml = '';
        if (post.is_official) {
            badgeHtml = `<div class="absolute bottom-0 right-0 w-4 h-4 bg-black rounded-full flex items-center justify-center border border-black shadow-sm">
                            <i class="fa-solid fa-shield-halved text-[9px] text-yellow-500"></i>
                         </div>`;
        } else if (post.is_verified) {
            badgeHtml = `<div class="absolute bottom-0 right-0 w-4 h-4 bg-black rounded-full flex items-center justify-center border border-black shadow-sm">
                            <i class="fa-solid fa-circle-check text-[10px] text-blue-400"></i>
                         </div>`;
        }

        return `
        <div class="p-6 border-b border-zinc-800 hover:bg-white/[0.01] transition-all group cursor-pointer" onclick="if(!['SPAN', 'A', 'I'].includes(event.target.tagName) && !event.target.closest('.avatar-container')) location.href='${postDetailLink}'">
            <div class="flex gap-4">
                <div class="avatar-container w-12 h-12 cursor-pointer relative" onclick="event.stopPropagation(); location.href='${userProfileLink}'">
                    <div class="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-lg">
                        <img src="${post.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+post.username}" class="w-full h-full object-cover">
                    </div>
                    ${badgeHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center min-w-0">
                            <span class="font-bold text-zinc-200 truncate hover:underline cursor-pointer" onclick="event.stopPropagation(); location.href='${userProfileLink}'">${post.nickname || post.username}</span>
                            <span class="text-zinc-600 text-sm ml-2 truncate">@${post.username} · ${timeAgo(post.created_at)}</span>
                        </div>
                    </div>
                    <p class="text-zinc-300 mt-2 leading-relaxed break-words">${post.content}</p>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- 6. 功能：搜尋、發文、登入/登出 ---
async function handleGlobalSearch() {
    const query = document.getElementById('search-input')?.value.trim();
    if (!query) { loadPosts(); return; }
    try {
        const response = await fetch(`${SB_URL}/functions/v1/setting`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
            body: JSON.stringify({ action: 'search', query: query })
        });
        const { results } = await response.json();
        const container = document.getElementById('feed');
        if (!container) return;
        container.innerHTML = `<div class="p-4 border-b border-zinc-800"><h2 class="text-zinc-400 font-bold">搜尋結果: "${query}"</h2></div>`;
        if (results.users?.length > 0) {
            const userListHtml = results.users.map(u => `
                <div class="flex flex-col items-center p-4 min-w-[100px] hover:bg-white/5 rounded-xl cursor-pointer transition" onclick="goToMyProfile('${u.username}')">
                    <img src="${u.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+u.username}" class="w-12 h-12 rounded-full border border-zinc-700 mb-2 object-cover">
                    <span class="text-xs font-bold text-zinc-200 truncate w-20 text-center">${u.nickname || u.username}</span>
                    <span class="text-[10px] text-zinc-500">@${u.username}</span>
                </div>`).join('');
            container.innerHTML += `<div class="flex overflow-x-auto gap-2 p-2 border-b border-zinc-800 no-scrollbar">${userListHtml}</div>`;
        }
        const postResultDiv = document.createElement('div');
        postResultDiv.id = 'search-post-results';
        container.appendChild(postResultDiv);
        renderFeed(results.posts, 'search-post-results');
    } catch (err) { console.error("搜尋失敗:", err); }
}

async function createPost() {
    const postInput = document.getElementById('post-content');
    const content = postInput?.value.trim();
    if (!content) return;
    const { data: { user } } = await _sb.auth.getUser();
    const { error } = await _sb.from('posts').insert([{ user_id: user.id, content }]);
    if (error) alert('發布失敗');
    else {
        postInput.value = '';
        window.location.pathname.includes('profile') ? loadUserPosts(window.myUsername) : loadPosts();
    }
}

async function handleLogout() {
    await _sb.auth.signOut();
    window.location.href = '/index.html'; 
}

// --- 7. 介面控制 ---
let isSignUpMode = false;
window.openAuthModal = () => document.getElementById('auth-modal')?.classList.remove('hidden');
window.closeAuthModal = () => document.getElementById('auth-modal')?.classList.add('hidden');
window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('signup-fields')?.classList.toggle('hidden', !isSignUpMode);
    document.getElementById('confirm-password-group')?.classList.toggle('hidden', !isSignUpMode);
    document.getElementById('auth-title').innerText = isSignUpMode ? '建立新帳號' : '登入 FlowBoard';
    document.getElementById('auth-btn-submit').innerText = isSignUpMode ? '立即註冊' : '登入';
};

// --- 8. 事件綁定 ---
function bindEvents() {
    document.getElementById('search-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGlobalSearch(); });
    
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('auth-btn-submit');
            btn.disabled = true;
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const virtualEmail = `${username.toLowerCase()}@flowboard.local`;
            try {
                const response = await fetch(`${SB_URL}/functions/v1/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_KEY}` },
                    body: JSON.stringify({ action: isSignUpMode ? 'signup' : 'login', email: virtualEmail, password, username, nickname: username })
                });
                if (!response.ok) throw new Error((await response.json()).error);
                await _sb.auth.signInWithPassword({ email: virtualEmail, password });
                closeAuthModal();
                await checkSession();
            } catch (err) { alert(err.message); } finally { btn.disabled = false; }
        };
    }
}

// 初始化
window.addEventListener('DOMContentLoaded', checkSession);