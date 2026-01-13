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
async function loadUserProfileForEdit(targetUsername) {
    if (!targetUsername) return;

    const { data, error } = await _sb.from('profiles')
        .select('*')
        .ilike('username', targetUsername) 
        .single();

    if (error || !data) {
        console.error("載入失敗:", error);
        return;
    }

    // 填入 UI 顯示
    if (document.getElementById('user-display')) {
        document.getElementById('user-display').innerText = data.nickname || data.username;
    }

    // 填入 Input 表單
    const fields = {
        'edit-nickname': data.nickname,
        'edit-bio': data.bio,
        'edit-avatar-url': data.avatar_url,
        'edit-banner-url': data.banner_url
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    // 更新預覽圖片
    if (data.avatar_url) document.getElementById('profile-avatar').src = data.avatar_url;
    if (data.banner_url) document.getElementById('profile-banner').src = data.banner_url;
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