// --- 1. 初始化 Supabase ---
const SB_URL = 'https://gwggzmjpigixnjxgfsgd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z2d6bWpwaWdpeG5qeGdmc2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDkyNjAsImV4cCI6MjA4MzYyNTI2MH0.anBepq09VaL2aeGBfhx5vl2JAs3AzcqLdOscTncKTTE';
const _sb = supabase.createClient(SB_URL, SB_KEY);
// --- 全域跳轉函數：確保 HTML onclick 抓得到 ---
window.goToMyProfile = function(username) {
    // 優先順序：傳入的參數 > 全域變數 window.myUsername
    const targetId = username || window.myUsername;
    
    if (!targetId) {
        console.warn("尚未取得用戶名稱，無法跳轉");
        return;
    }
    
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    
    // 根據環境決定跳轉網址：
    // 本地端：為了避免 404，指向 profile.html 並帶參數
    // 線上端：配合 Vercel Rewrite，使用漂亮的 /profile/@id
    const url = `/profile.html?username=@${targetId}` ;
    
    window.location.href = url;
};
// --- 2. 本地開發路由相容處理 (立即執行函數) ---
(function() {
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const path = window.location.pathname;

    if (isLocal && path !== '/' && !path.includes('.')) {
        if (path === '/home') {
            window.history.replaceState(null, '', '/index.html');
        } 
        else if (path === '/profile' || path.startsWith('/@')) {
            window.history.replaceState(null, '', '/profile.html');
        }
        else if (path.startsWith('/post/')) {
            window.history.replaceState(null, '', '/post-detail.html');
        }
    }
})();

// 修正：偵測路徑並移除結尾斜線
let PATH = window.location.pathname;
if (PATH.length > 1 && PATH.endsWith('/')) PATH = PATH.slice(0, -1);

let isSignUpMode = false;

// --- 3. 介面控制 ---
function openAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden'); 
}

function closeAuthModal() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden'); 
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const fields = document.getElementById('signup-fields');
    const confirm = document.getElementById('confirm-password-group');
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn-submit');
    const switchBtn = document.getElementById('auth-switch-btn');
    const switchText = document.getElementById('auth-switch-text');

    if (isSignUpMode) {
        if(fields) fields.classList.remove('hidden');
        if(confirm) confirm.classList.remove('hidden');
        if(title) title.innerText = '建立新帳號';
        if(btn) btn.innerText = '立即註冊';
        if(switchText) switchText.innerText = '已經有帳號？';
        if(switchBtn) switchBtn.innerText = '立即登入';
    } else {
        if(fields) fields.classList.add('hidden');
        if(confirm) confirm.classList.add('hidden');
        if(title) title.innerText = '登入 FlowBoard';
        if(btn) btn.innerText = '登入';
        if(switchText) switchText.innerText = '還沒有帳號？';
        if(switchBtn) switchBtn.innerText = '立即註冊';
    }
}

// --- 4. 核心：Session 檢查與自動化路由 ---
async function checkSession() {
    const loader = document.getElementById('initial-loader');
    const body = document.body;
    
    // 取得當前網址資訊
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const queryUser = urlParams.get('username'); // 抓取 ?username=@...

    try {
        const { data: { session } } = await _sb.auth.getSession();

        if (session) {
            // --- 狀態：已登入 ---
            const meta = session.user.user_metadata;
            
            // 重要：定義全域變數，供 HTML 的 onclick="location.href='/profile/@' + myUsername" 使用
            window.myUsername = meta.username;

            // 更新導航欄顯示
            const setUI = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.innerText = text;
            };
            setUI('user-display', meta.nickname || meta.username);

            // --- 路由邏輯：支援多種路徑格式 ---
            const isAtProfile = currentPath.includes('profile');
            const isAtPost = currentPath.startsWith('/post/');

            if (isAtProfile) {
                // 優先序：URL參數 (?username=@1) > 路徑 (/profile/@1) > 自己
                let targetUsername = null;
                
                if (queryUser && queryUser.startsWith('@')) {
                    targetUsername = queryUser.replace('@', '');
                } else if (currentPath.includes('@')) {
                    targetUsername = currentPath.split('@')[1];
                } else {
                    targetUsername = window.myUsername;
                }

                // --- 效能優化：並行加載 (Parallel Load) ---
                // 使用 ilike 確保不分大小寫
                if (targetUsername) {
                    await Promise.all([
                        loadUserProfile(targetUsername),
                        loadUserPosts(targetUsername)
                    ]);
                }
            } 
            else if (isAtPost) {
                const postId = currentPath.split('/post/')[1];
                console.log("查看貼文詳情:", postId);
            }
            else {
                // 首頁加載
                await loadPosts();
            }
            
            body.classList.add('auth-ready');
            body.classList.remove('guest-ready');
        } else {
            // --- 狀態：未登入 ---
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
    }
}

// 補丁：確保 loadUserProfile 使用 .ilike
async function loadUserProfile(username) {
    if (!username) return;
    const { data, error } = await _sb.from('profiles')
        .select('*')
        .ilike('username', username) // 不分大小寫查詢
        .single();

    if (error) {
        console.error("找不到該用戶");
        return;
    }

    // 更新個人資料 UI
    const nameEl = document.getElementById('profile-name');
    const handleEl = document.getElementById('profile-handle');
    const bioEl = document.getElementById('profile-bio');
    const avatarEl = document.getElementById('profile-avatar');

    if (nameEl) nameEl.innerText = data.nickname || data.username;
    if (handleEl) handleEl.innerText = `@${data.username}`;
    if (bioEl) bioEl.innerText = data.bio || "這傢伙很懶...";
    if (avatarEl) avatarEl.src = data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;
}

// 解析功能：從路徑中提取 username
function getUsernameFromPath() {
    const segments = window.location.pathname.split('/'); 
    const profileSegment = segments.find(s => s.startsWith('@'));
    return profileSegment ? profileSegment.replace('@', '') : null;
}

// --- 5. 身份驗證提交 ---
const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('auth-btn-submit');
        btn.disabled = true;
        btn.innerText = '處理中...';
        
        const username = document.getElementById('username').value.trim();
        const nickname = document.getElementById('nickname').value.trim() || username;
        const password = document.getElementById('password').value;
        const confirmPw = document.getElementById('confirm-password')?.value;
        const virtualEmail = `${username.toLowerCase()}@flowboard.local`;

        if (isSignUpMode && password !== confirmPw) {
            alert('密碼不一致');
            btn.disabled = false;
            btn.innerText = '立即註冊';
            return;
        }

        try {
            const response = await fetch(`${SB_URL}/functions/v1/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SB_KEY}`
                },
                body: JSON.stringify({
                    action: isSignUpMode ? 'signup' : 'login',
                    email: virtualEmail,
                    password: password,
                    username: username,
                    nickname: nickname
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '請求失敗');

            const { error: loginError } = await _sb.auth.signInWithPassword({ 
                email: virtualEmail, 
                password: password 
            });
            
            if (loginError) throw loginError;
            
            closeAuthModal();
            await checkSession();
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = isSignUpMode ? '立即註冊' : '登入';
        }
    };
}

async function handleLogout() {
    await _sb.auth.signOut();
    window.location.href = '/index.html'; 
}

// --- 6. 貼文與渲染功能 ---
async function createPost() {
    const postInput = document.getElementById('post-content');
    const content = postInput?.value;
    if (!content || !content.trim()) return;
    
    const { data: { user } } = await _sb.auth.getUser();
    const { error } = await _sb.from('posts').insert([{ user_id: user.id, content }]);
    
    if (error) alert('發布失敗');
    else {
        postInput.value = '';
        const currentPath = window.location.pathname;
        const isAtProfile = (currentPath.includes('/profile') || currentPath.startsWith('/@'));
        if (isAtProfile) {
            const targetUsername = currentPath.includes('@') ? currentPath.split('@')[1] : null;
            loadUserPosts(targetUsername);
        } else {
            loadPosts();
        }
    }
}

async function loadPosts() {
    if (!document.getElementById('feed')) return;
    const { data, error } = await _sb.from('post_with_profile').select('*').order('created_at', { ascending: false });
    if (!error) renderFeed(data, 'feed');
}

async function loadUserProfile(targetUsername) {
    if (!targetUsername) return;

    // 使用 .ilike 進行不分大小寫的比對
    const { data, error } = await _sb.from('profiles')
        .select('*')
        .ilike('username', targetUsername) 
        .single();

    if (error || !data) {
        console.error("找不到該用戶:", targetUsername);
        // 可以導向 404 頁面或顯示用戶不存在
        return;
    }

    // 更新 UI
    const setUI = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text || '';
    };

    setUI('profile-name', data.nickname || data.username);
    setUI('profile-handle', `@${data.username}`);
    setUI('profile-bio', data.bio || "這傢伙很懶，什麼都沒留下。");
    
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
        avatarEl.src = data.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + data.username;
    }
}

async function loadUserPosts(targetUsername) {
    const container = document.getElementById('user-posts');
    if (!container || !targetUsername) return;

    // 使用 .ilike 確保輸入大寫或小寫 ID 都能抓到貼文
    const { data, error } = await _sb.from('post_with_profile')
        .select('*')
        .ilike('username', targetUsername)
        .order('created_at', { ascending: false });

    if (!error) {
        renderFeed(data, 'user-posts');
    }
}

async function renderFeed(posts, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    const { data: { session } } = await _sb.auth.getSession();
    const myUsername = session?.user?.user_metadata?.username;

    if (!posts || posts.length === 0) {
        container.innerHTML = `<div class="p-20 text-center text-zinc-600"><p>尚未有內容</p></div>`;
        return;
    }

    container.innerHTML = posts.map(post => {
        const userProfileLink = `/profile?username@${post.username}`;
        const postDetailLink = `/post/${post.post_id || post.id}`; 

        let badgeHtml = '';
        const isOfficial = post.is_official === true || post.is_official === 'true';
        const isVerified = post.is_verified === true || post.is_verified === 'true';

        if (isOfficial) {
            badgeHtml = `<div class="badge-icon"><i class="fa-solid fa-shield-halved text-[10px] text-yellow-500"></i></div>`;
        } else if (isVerified) {
            badgeHtml = `<div class="badge-icon"><i class="fa-solid fa-circle-check text-[11px] text-blue-400"></i></div>`;
        }

        const avatarInner = post.avatar_url 
            ? `<img src="${post.avatar_url}" class="w-full h-full object-cover rounded-full">`
            : `<i class="fa-solid fa-user-astronaut text-xl text-zinc-600"></i>`;

        return `
        <div class="p-6 border-b border-zinc-800 hover:bg-white/[0.01] transition-all group cursor-pointer" 
             onclick="if(!['SPAN', 'A', 'I'].includes(event.target.tagName) && !event.target.closest('.avatar-container')) location.href='${postDetailLink}'">
            <div class="flex gap-4">
                <div class="avatar-container w-12 h-12 cursor-pointer relative" 
                     onclick="event.stopPropagation(); location.href='${userProfileLink}'">
                    <div class="avatar-circle w-full h-full rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">${avatarInner}</div>
                    ${badgeHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center min-w-0">
                            <span class="font-bold text-zinc-200 truncate hover:underline cursor-pointer" 
                                  onclick="event.stopPropagation(); location.href='${userProfileLink}'">
                                ${post.nickname}
                            </span>
                            <span class="text-zinc-600 text-sm ml-2 truncate">@${post.username} · ${timeAgo(post.created_at)}</span>
                        </div>
                    </div>
                    <p class="text-zinc-300 mt-2 leading-relaxed break-words">${post.content}</p>
                </div>
            </div>
        </div>`;
    }).join('');
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return '現在';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h`;
    return `${Math.floor(seconds/86400)}d`;
}

// --- 7. 初始化啟動 ---
window.addEventListener('DOMContentLoaded', checkSession);
