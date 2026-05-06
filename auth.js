// ── Supabase ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://ppbbmwacrcerclbkxgsl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYmJtd2FjcmNlcmNsYmt4Z3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjk3MTksImV4cCI6MjA5MjYwNTcxOX0.nCQhjtr4FwItRtIEu5jpkpPKmI3tzi7v87HAtzz0hpA';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 페이지별 인증 콜백 ────────────────────────────────────────
// 각 페이지에서 window.onAuthChange = function(user) { ... } 로 설정
function applyAuth(user) {
    var btn = document.getElementById('authBtn');
    var emailEl = document.getElementById('userEmail');
    if (btn) {
        if (user) {
            if (emailEl) { emailEl.textContent = user.email; emailEl.style.display = 'inline'; }
            btn.textContent = '로그아웃';
            btn.onclick = doLogout;
            btn.classList.add('logout');
        } else {
            if (emailEl) emailEl.style.display = 'none';
            btn.textContent = '로그인';
            btn.onclick = openModal;
            btn.classList.remove('logout');
        }
    }
    if (typeof window.onAuthChange === 'function') window.onAuthChange(user);
}

// ── 모달 함수 ─────────────────────────────────────────────────
function openModal()  { document.getElementById('authModalBg').classList.add('show'); }
function closeModal() { document.getElementById('authModalBg').classList.remove('show'); }

function switchAuthTab(tab) {
    document.querySelectorAll('#authModalBg .modal-tab').forEach(function(t, i) {
        t.classList.toggle('active', (i === 0) === (tab === 'login'));
    });
    document.getElementById('auth-form-login').style.display  = tab === 'login'  ? '' : 'none';
    document.getElementById('auth-form-signup').style.display = tab === 'signup' ? '' : 'none';
}

async function doLogin() {
    var email = document.getElementById('auth-login-email').value.trim();
    var pw    = document.getElementById('auth-login-pw').value;
    var msg   = document.getElementById('auth-login-msg');
    msg.textContent = ''; msg.className = 'modal-msg';
    if (!email || !pw) { msg.textContent = '이메일과 비밀번호를 입력해주세요.'; msg.classList.add('error'); return; }
    var res = await db.auth.signInWithPassword({ email: email, password: pw });
    if (res.error) { msg.textContent = '로그인 실패: ' + res.error.message; msg.classList.add('error'); return; }
    closeModal();
}

async function doSignup() {
    var email = document.getElementById('auth-signup-email').value.trim();
    var pw    = document.getElementById('auth-signup-pw').value;
    var phone = document.getElementById('auth-signup-phone').value.trim();
    var msg   = document.getElementById('auth-signup-msg');
    msg.textContent = ''; msg.className = 'modal-msg';
    if (!email || !pw) { msg.textContent = '이메일과 비밀번호를 입력해주세요.'; msg.classList.add('error'); return; }
    if (pw.length < 6) { msg.textContent = '비밀번호는 6자 이상이어야 합니다.'; msg.classList.add('error'); return; }
    var res = await db.auth.signUp({ email: email, password: pw, options: { data: { phone: phone || null } } });
    if (res.error) { msg.textContent = '가입 실패: ' + res.error.message; msg.classList.add('error'); return; }
    msg.textContent = '가입 완료! 이메일 인증 후 로그인해주세요.'; msg.classList.add('success');
}

async function doLogout() { await db.auth.signOut(); }

// ── 모달 HTML 주입 ────────────────────────────────────────────
function _injectAuthModal() {
    if (!document.getElementById('authBtn')) return;

    var titleEl = document.querySelector('meta[name="auth-title"]');
    var descEl  = document.querySelector('meta[name="auth-desc"]');
    var title = titleEl ? titleEl.getAttribute('content') : '로그인 / 회원가입';
    var desc  = descEl  ? descEl.getAttribute('content')  : '계정으로 로그인하거나 새로 가입하세요.';

    var html =
        '<div id="authModalBg">' +
            '<div class="modal">' +
                '<button class="modal-close" onclick="closeModal()">✕</button>' +
                '<h2>' + title + '</h2>' +
                '<p class="modal-desc">' + desc + '</p>' +
                '<div class="modal-tabs">' +
                    '<button class="modal-tab active" onclick="switchAuthTab(\'login\')">로그인</button>' +
                    '<button class="modal-tab" onclick="switchAuthTab(\'signup\')">회원가입</button>' +
                '</div>' +
                '<div id="auth-form-login">' +
                    '<div class="modal-group"><label>이메일</label><input type="email" id="auth-login-email" placeholder="example@email.com"></div>' +
                    '<div class="modal-group"><label>비밀번호</label><input type="password" id="auth-login-pw" placeholder="비밀번호" onkeydown="if(event.key===\'Enter\') doLogin()"></div>' +
                    '<button class="modal-submit" onclick="doLogin()">로그인</button>' +
                    '<div class="modal-msg" id="auth-login-msg"></div>' +
                '</div>' +
                '<div id="auth-form-signup" style="display:none">' +
                    '<div class="modal-group"><label>이메일</label><input type="email" id="auth-signup-email" placeholder="example@email.com"></div>' +
                    '<div class="modal-group"><label>비밀번호 (6자 이상)</label><input type="password" id="auth-signup-pw" placeholder="비밀번호"></div>' +
                    '<div class="modal-group"><label>전화번호 <span style="font-size:11px;color:#aaa;font-weight:400;">(선택)</span></label><input type="tel" id="auth-signup-phone" placeholder="010-0000-0000" onkeydown="if(event.key===\'Enter\') doSignup()"></div>' +
                    '<button class="modal-submit" onclick="doSignup()">회원가입</button>' +
                    '<div class="modal-msg" id="auth-signup-msg"></div>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('authModalBg').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}

// ── 초기화 ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    _injectAuthModal();
    db.auth.onAuthStateChange(function(e, s) { applyAuth(s ? s.user : null); });
    db.auth.getSession().then(function(r) { applyAuth(r.data.session ? r.data.session.user : null); });
});
