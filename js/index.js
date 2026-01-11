// --- 初始化 Supabase ---
const SB_URL = 'https://gwggzmjpigixnjxgfsgd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z2d6bWpwaWdpeG5qeGdmc2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDkyNjAsImV4cCI6MjA4MzYyNTI2MH0.anBepq09VaL2aeGBfhx5vl2JAs3AzcqLdOscTncKTTE';
const _sb = supabase.createClient(SB_URL, SB_KEY);

// 關鍵：偵測目前在哪一頁
const CURRENT_PAGE = window.location.pathname.split("/").pop() || 'index.html';

let isSignUpMode = false;

// --- 介面控制 ---
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

// --- 核心：多頁面自動化 Session 檢查 ---
async function checkSession() {
    const loader = document.getElementById('initial-loader');
    const body = document.body;

    try {
        const { data: { session } } = await _sb.auth.getSession();

        if (session) {
            // --- 狀態：已登入 ---
            const meta = session.user.user_metadata;
            
            // 安全填充數據 (加上 ?. 防止該頁面沒有對應 ID 導致報錯)
            if(document.getElementById('user-display')) 
                document.getElementById('user-display').innerText = meta.nickname || meta.username;
            if(document.getElementById('profile-name')) 
                document.getElementById('profile-name').innerText = meta.nickname || meta.username;
            if(document.getElementById('profile-handle')) 
                document.getElementById('profile-handle').innerText = `@${meta.username}`;
            
            // 根據頁面載入特定資料
            if (CURRENT_PAGE === 'profile.html') {
                await loadUserPosts(); 
            } else if (CURRENT_PAGE === 'index.html') {
                await loadPosts();
            }
            
            body.classList.add('auth-ready');
            body.classList.remove('guest-ready');
        } else {
            // --- 狀態：未登入 ---
            
            // 權限守衛：如果使用者想直接闖入 profile.html 卻沒登入，踢回首頁
            if (CURRENT_PAGE !== 'index.html') {
                window.location.href = 'index.html';
                return;
            }

            body.classList.add('guest-ready');
            body.classList.remove('auth-ready');
        }
    } catch (err) {
        console.error("初始化失敗:", err);
        if (CURRENT_PAGE !== 'index.html') window.location.href = 'index.html';
    } finally {
        if (loader) {
            loader.classList.add('loader-hidden');
            setTimeout(() => { loader.style.display = 'none'; }, 400); 
        }
    }
}

// --- 身份驗證提交 ---
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
    // 登出後統一回到首頁
    window.location.href = 'index.html'; 
}

// --- 貼文與渲染功能 ---
async function createPost() {
    const postInput = document.getElementById('post-content');
    const content = postInput?.value;
    if (!content || !content.trim()) return;
    
    const { data: { user } } = await _sb.auth.getUser();
    const { error } = await _sb.from('posts').insert([{ user_id: user.id, content }]);
    
    if (error) alert('發布失敗');
    else {
        postInput.value = '';
        // 重新整理目前頁面的資料
        CURRENT_PAGE === 'profile.html' ? loadUserPosts() : loadPosts();
    }
}

async function loadPosts() {
    if (!document.getElementById('feed')) return;
    const { data, error } = await _sb.from('post_with_profile').select('*').order('created_at', { ascending: false });
    if (!error) renderFeed(data, 'feed');
}

async function loadUserPosts() {
    if (!document.getElementById('user-posts')) return;
    const { data: { user } } = await _sb.auth.getUser();
    const { data, error } = await _sb.from('post_with_profile')
        .select('*')
        .eq('username', user.user_metadata.username)
        .order('created_at', { ascending: false });
    if (!error) renderFeed(data, 'user-posts');
}

function renderFeed(posts, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = `<div class="p-20 text-center text-zinc-600"><p>尚未有內容</p></div>`;
        return;
    }

    container.innerHTML = posts.map(post => {
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
        <div class="p-6 border-b border-zinc-800 hover:bg-white/[0.01] transition-all group">
            <div class="flex gap-4">
                <div class="avatar-container w-12 h-12">
                    <div class="avatar-circle">${avatarInner}</div>
                    ${badgeHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center min-w-0">
                            <span class="font-bold text-zinc-200 truncate">${post.nickname}</span>
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

// 初始化
window.addEventListener('DOMContentLoaded', checkSession);