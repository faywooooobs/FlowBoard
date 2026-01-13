/**
 * settings.js - 專門處理設定頁面與個人資料編輯
 */

// --- 1. 初始化 Supabase (備份過來) ---
const SB_URL = 'https://gwggzmjpigixnjxgfsgd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z2d6bWpwaWdpeG5qeGdmc2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDkyNjAsImV4cCI6MjA4MzYyNTI2MH0.anBepq09VaL2aeGBfhx5vl2JAs3AzcqLdOscTncKTTE';
const _sb = supabase.createClient(SB_URL, SB_KEY);

// --- 2. 核心：Session 檢查 ---
async function initSettingsPage() {
    const { data: { session } } = await _sb.auth.getSession();
    
    if (!session) {
        alert("請先登入");
        window.location.href = '/index.html';
        return;
    }

    const username = session.user.user_metadata.username;
    await loadUserProfileForEdit(username);
    bindSettingsEvents();
}

// --- 3. 載入資料並同步至表單 ---
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
// --- 4. 圖片壓縮輔助 ---
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

// --- 5. 儲存設定 (對接 Edge Function) ---
async function saveProfileSettings() {
    console.log("🛠️ 開始執行儲存...");
    const btn = document.getElementById('save-settings-btn');
    if (btn) { 
        btn.disabled = true; 
        btn.innerText = '處理中...'; 
    }

    try {
        // 重要：重新取得一次 Session，確保 Token 是最新的
        const { data: { session }, error: sessionError } = await _sb.auth.getSession();
        
        if (sessionError || !session) {
            throw new Error("登入狀態已失效，請重新登入");
        }

        const token = session.access_token;
        console.log("✅ 取得 Token:", token.substring(0, 15) + "...");

        let avatarData = document.getElementById('profile-avatar')?.src;
        let bannerData = document.getElementById('profile-banner')?.src;

        // 僅壓縮新上傳的 Base64 圖片
        if (avatarData?.startsWith('data:image')) {
            console.log("📸 壓縮頭像中...");
            avatarData = await compressImage(avatarData, 400);
        }
        if (bannerData?.startsWith('data:image')) {
            console.log("🖼️ 壓縮橫幅中...");
            bannerData = await compressImage(bannerData, 1200);
        }

        const updates = {
            nickname: document.getElementById('edit-nickname')?.value.trim(),
            bio: document.getElementById('edit-bio')?.value.trim(),
            avatar_url: avatarData,
            banner_url: bannerData
        };

        // 發送請求
        // 請將 saveProfileSettings 內的 fetch 部分替換為此段
        const response = await fetch(`${SB_URL}/functions/v1/setting`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'apikey': SB_KEY, // 必須帶上，否則閘道器會報錯
                'Authorization': `Bearer ${session.access_token}` // 確保這行沒有拼錯
            },
            body: JSON.stringify({ action: 'update_settings', updates })
        });

        const result = await response.json();

        // 處理 HTTP 錯誤
        if (!response.ok) {
            console.error("❌ 伺服器回傳錯誤:", result);
            throw new Error(result.error || result.message || `HTTP 錯誤 ${response.status}`);
        }

        console.log("✅ 儲存成功:", result);
        alert("儲存成功！");
        window.location.reload();

    } catch (err) {
        console.error("💥 執行失敗:", err);
        alert("錯誤: " + err.message);
    } finally {
        if (btn) { 
            btn.disabled = false; 
            btn.innerText = '儲存設定'; 
        }
    }
}

// --- 6. 事件綁定 ---
function bindSettingsEvents() {
    // 儲存按鈕
    document.getElementById('save-settings-btn')?.addEventListener('click', saveProfileSettings);

    // 頭像上傳預覽
    document.getElementById('file-avatar')?.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            const base64 = await toBase64(this.files[0]);
            document.getElementById('profile-avatar').src = base64;
        }
    });

    // 橫幅上傳預覽
    document.getElementById('file-banner')?.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            const base64 = await toBase64(this.files[0]);
            document.getElementById('profile-banner').src = base64;
        }
    });
}

// 啟動
document.addEventListener('DOMContentLoaded', initSettingsPage);