:root {
    --primary: #ffffff;
    --bg: #000000;
    --card-bg: #121212;
    --border: #27272a;
    --accent: #3b82f6;
    --text-mute: #71717a;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background-color: var(--bg);
    color: #fafafa;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5;
}

/* 讓 Landing Page 內容完美垂直水平置中 */
#landing-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
}

/* 按鈕：增加懸停縮放效果 */
.btn-main {
    background-color: var(--primary);
    color: black;
    font-weight: 800;
    padding: 12px 28px;
    border-radius: 99px;
    border: none;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
    width: 100%; /* 在導覽頁通常寬度一致較美觀 */
}

.btn-main:hover {
    opacity: 0.9;
    transform: translateY(-2px);
}

.btn-main:active { 
    transform: scale(0.95); 
}

/* 登入註冊容器：讓它看起來更有層次 */
.auth-container {
    background: var(--card-bg);
    padding: 2.5rem;
    border-radius: 2rem;
    border: 1px solid var(--border);
    width: 100%;
    max-width: 400px;
    margin-top: 2rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* 輸入框優化 */
.input-dark {
    background: #18181b;
    border: 1px solid var(--border);
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    margin-bottom: 1rem;
    color: white;
    font-size: 16px; /* 防止 iOS 自動放大 */
    transition: border-color 0.2s;
}

.input-dark:focus {
    outline: none;
    border-color: #52525b;
    background: #242427;
}

/* 看板切換 Tab */
.tab { 
    color: var(--text-mute); 
    font-weight: 700; 
    font-size: 15px; 
    cursor: pointer; 
    white-space: nowrap; 
    padding: 8px 16px;
    transition: color 0.2s;
}

.tab:hover { color: #d4d4d8; }

.tab.active { 
    color: white; 
    border-bottom: 2.5px solid white; 
}

/* 貼文卡片設計 */
.post-card {
    padding: 1.25rem;
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;
}

.post-card:hover {
    background-color: #050505;
}

/* 輔助類 */
.hidden { display: none !important; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
/* 彈窗背景遮罩 */
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7); /* 半透明黑 */
    backdrop-filter: blur(8px);    /* 霧面效果 */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

/* 彈窗內容盒 */
.modal-content {
    background: #121212;
    padding: 2.5rem;
    border-radius: 2rem;
    border: 1px solid #27272a;
    width: 90%;
    max-width: 420px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}
/* 藍勾勾動畫：讓它出現時有一點點縮放感，更有質感 */
.fa-circle-check {
    font-size: 0.9em;
    vertical-align: middle;
}

/* 官方標籤樣式 */
.badge-official {
    display: inline-flex;
    align-items: center;
    background-color: #1a1a1a; /* 深灰背景 */
    color: #a1a1aa; /* 淺灰文字 */
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #27272a;
    margin-left: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* 讓名字區塊在折行時依然對齊 */
.user-info-cluster {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
}
/* 導覽列容器格線 */
.nav-container {
    display: flex;
    flex-direction: column;
    gap: 12px; /* 稍微增加間距，格狀感更強 */
}

/* 每一格導覽項：預設狀態 (白字透明底) */
.nav-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 14px 20px;
    border-radius: 16px;
    border: 1px solid transparent;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.03); /* 極淡的底色增加層次感 */
    
    /* 預設文字顏色：白色 */
    color: #ffffff; 
}

/* 預設狀態下的圖標與文字 */
.nav-item i {
    width: 24px;
    text-align: center;
    font-size: 1.25rem;
    color: #ffffff; /* 確保圖標也是白色 */
    transition: color 0.2s;
}

.nav-item span {
    font-weight: 700;
    letter-spacing: 0.02em;
    transition: color 0.2s;
}

/* --- 重點：Hover 與 Active 狀態 (翻轉為黑字白底) --- */

/* 合併 Hover 與 Active 的表現 */
.nav-item:hover, 
.nav-item.active {
    background-color: #ffffff; /* 背景變純白 */
    color: #000000 !important;   /* 文字變純黑 */
    transform: translateX(6px); /* 輕微右移增加動態感 */
    box-shadow: 0 10px 15px -3px rgba(255, 255, 255, 0.1);
}

/* 確保 Hover/Active 時內部的圖標也變黑 */
.nav-item:hover i, 
.nav-item.active i,
.nav-item:hover span,
.nav-item.active span {
    color: #000000 !important;
}

/* 針對 Active 狀態的額外微調 (例如增加陰影) */
.nav-item.active {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
}
/* --- 響應式佈局優化 --- */

/* 1. 平板與手機 (螢幕寬度小於 1024px) */
@media (max-width: 1024px) {
    /* 側邊導覽列縮減為只有圖標，隱藏文字 */
    .nav-item span {
        display: none;
    }
    
    .nav-item {
        justify-content: center;
        padding: 14px;
        width: 56px;
        height: 56px;
        margin: 0 auto;
    }

    /* 調整主容器寬度 */
    .max-w-7xl {
        flex-direction: row;
    }
}

/* 2. 純手機版 (螢幕寬度小於 768px) */
@media (max-width: 768px) {
    /* 隱藏右側欄 */
    aside.hidden.lg\:block {
        display: none !important;
    }

    /* 彈窗寬度調整，填滿一點 */
    .modal-content {
        width: 95%;
        padding: 1.5rem;
    }

    /* 登陸頁文字縮小以免折行太醜 */
    #landing-page h1 {
        font-size: 3.5rem !important;
    }

    /* 貼文卡片間距微調 */
    .post-card {
        padding: 1rem;
    }

    /* 如果你打算做底部導覽列 (Mobile Bottom Nav) */
    /* 這部分是選用的，若想把側邊欄移到下方可開啟以下邏輯 */
    /*
    aside {
        position: fixed;
        bottom: 0;
        width: 100% !important;
        height: 60px !important;
        flex-direction: row !important;
        border-top: 1px solid var(--border);
        border-right: none !important;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(10px);
        z-index: 50;
    }
    .nav-container { flex-direction: row !important; justify-content: space-around; width: 100%; }
    .nav-item { background: transparent; border: none; transform: none !important; }
    */
}

/* 3. 小手機 (螢幕寬度小於 480px) */
@media (max-width: 480px) {
    .btn-main {
        padding: 10px 20px;
        font-size: 14px;
    }

    .input-dark {
        font-size: 14px;
        padding: 12px;
    }

    #landing-page .text-xl {
        font-size: 1rem;
    }
}

/* --- 額外修正：確保圖片與影片不超出容器 --- */
img, video {
    max-width: 100%;
    height: auto;
}

/* 確保發文框在手機上不會被擋住 */
#post-content {
    font-size: 16px; /* 再次確保 iOS 不會因字體小於 16px 而自動放大畫面的 bug */
}
#feed, #user-posts{
    background-color: #181818;
}
