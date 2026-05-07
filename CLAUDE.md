# 인테리어 자재 지도 — CLAUDE.md

## 프로젝트 개요

인테리어 업계 종사자를 위한 자재 업체 지도 + 업무 도구 모음 웹앱.  
순수 HTML/CSS/JS 정적 사이트. 프레임워크·빌드 도구 없음.

**GitHub:** https://github.com/welovehyeok33-boop/interior-map  
**로컬 개발 서버:** `npx serve -p 3000` (프로젝트 폴더에서 실행)

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프론트엔드 | 순수 HTML5 / CSS3 / Vanilla JS (ES6+) |
| 지도 | Naver Maps API (`ncpKeyId: zcmxqf4ztx`) |
| 백엔드/DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (이메일+비밀번호) |
| 배포 | 미정 (GitHub Pages 가능) |

---

## 핵심 설정값

```js
// auth.js, admin.html 에 정의
SUPABASE_URL = 'https://ppbbmwacrcerclbkxgsl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // anon public key
ADMIN_EMAILS = ['welovehyeok33@gmail.com']                 // 관리자 이메일 화이트리스트
```

> ⚠️ anon key는 public용이므로 노출 자체는 괜찮으나, Supabase RLS 정책 설정 필수.

---

## 파일 구조

```
인테리어 자재 지도/
├── index.html          # 자재 지도 메인 (Naver Maps + 업체 목록 사이드바)
├── app.js              # index.html 전용 JS (지도 초기화, 마커, 업체 목록 렌더)
├── style.css           # index.html 전용 CSS (사이드바, 상세패널, 마커 등)
├── calculator.html     # 자재 계산기 (면적 기반 자재량 자동 계산)
├── schedule.html       # 공정표(간트차트) + 일정표(월간/주간 달력)
├── prices.html         # 자재 단가표 (Supabase 동적 로딩, 비회원 잠금)
├── board.html          # 소통 게시판 (게시글 + 댓글)
├── admin.html          # 관리자 전용 (업체 등록, 단가 관리)
├── auth.js             # 공통 Supabase 초기화 + 인증 모달 (모든 페이지 공유)
├── shared.css          # 공통 CSS (헤더, nav, auth 모달, reset)
├── stores.js           # ⚠️ 미사용 파일 (삭제 예정)
└── prices_setup.sql    # prices 테이블 초기 생성 + 데이터 삽입 SQL
```

---

## Supabase 테이블 구조

### `stores` — 업체 정보
```sql
id          bigint PK
name        text          -- 업체명
category    text          -- 철물건재 | 인테리어철물 | 목자재 | 타일자재 | 전기조명
address     text
phone       text
hours       text          -- 영업시간
lat         float8        -- 위도
lng         float8        -- 경도
```

### `posts` — 게시판 글
```sql
id          bigint PK
category    text          -- 자재 정보 | 업체 추천 | 시공 후기 | 질문/답변 | 공지
author      text
title       text
content     text
created_at  timestamptz
```

### `comments` — 댓글
```sql
id          bigint PK
post_id     bigint FK → posts.id
author      text
content     text
created_at  timestamptz
```

### `user_sites` — 공정표 클라우드 저장
```sql
user_id     uuid PK (FK → auth.users)
data        jsonb         -- 현장 배열 전체를 JSON으로 저장
updated_at  timestamptz
```

### `user_cal_notes` — 달력 메모 클라우드 저장
```sql
user_id     uuid PK (FK → auth.users)
data        jsonb         -- { "2025-05-07": { html: "..." }, ... }
updated_at  timestamptz
```

### `prices` — 자재 단가표 (prices_setup.sql로 초기화)
```sql
id          bigint PK
tab_index   int           -- 0:목자재 1:석고보드 2:타일 3:철물 4:도장 5:전기 6:시공비
name        text
spec        text          -- 규격 (tab_index=6 시공비는 비워둠)
unit        text
price_range text          -- "18,000 ~ 25,000"
note        text
is_locked   boolean       -- true면 비로그인 시 블러 처리
sort_order  int
```

---

## 공통 아키텍처 패턴

### auth.js — 공유 인증 모듈

모든 페이지(admin.html 제외)가 `auth.js`를 로드함.

```html
<script src="https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="auth.js"></script>
```

`auth.js`가 제공하는 전역:
- `db` — `supabase.createClient(URL, KEY)`
- `openModal()` / `closeModal()` — 인증 모달 열기/닫기
- `doLogin()` / `doSignup()` / `doLogout()`
- `window.onAuthChange(user)` — 각 페이지가 이 콜백을 정의해 인증 상태 구독

### 페이지별 onAuthChange 패턴

```js
// 각 페이지에서 auth.js 로드 후 아래처럼 정의
window.onAuthChange = function(user) {
    // 로그인 상태 변화에 반응하는 페이지별 로직
};
```

| 페이지 | onAuthChange 동작 |
|--------|-----------------|
| prices.html | 단가표 잠금 행 blur 토글 |
| schedule.html | 클라우드에서 공정표/달력 데이터 로드 |
| board.html | 작성자 필드 자동 채우기 + readonly |

### 인증 모달 커스텀 타이틀

```html
<meta name="auth-title" content="단가표 전체 보기">
<meta name="auth-desc" content="회원가입 또는 로그인 후 전체 단가를 확인하세요.">
```

### CSS 충돌 방지

`shared.css`의 인증 모달 스타일은 모두 `#authModalBg` ID로 스코핑.  
→ `schedule.html`의 페이지 전용 `.modal` (460px)과 충돌 없음.

---

## 각 페이지 상세

### index.html + app.js — 자재 지도

- Naver Maps로 업체 마커 표시
- 좌측 사이드바: 카테고리 필터 + 검색 + 업체 목록
- 마커 클릭 → 우측 상세 패널 슬라이드
- `db.from('stores').select('*')` 로 전체 업체 로드

### calculator.html — 자재 계산기

- 공간 면적(㎡) 입력 → 자재별 필요량 자동 계산
- 바닥재, 타일, 페인트, 벽지 등 항목별 계산식 내장
- 로그인 불필요

### schedule.html — 공정표 / 일정표

- **공정표 탭**: 간트차트 (현장별, 날짜 범위 최대 180일)
  - 셀 드래그로 공정 기간 칠하기/지우기
  - 색상 팔레트 선택
  - localStorage 저장 → 로그인 시 Supabase `user_sites`에 클라우드 동기화
- **일정표 탭**: 월간/주간 달력
  - 날짜 클릭 → 메모 모달 (리치 텍스트, 색상 선택)
  - localStorage 저장 → 로그인 시 Supabase `user_cal_notes`에 동기화
- `switchTab()` — 공정표/일정표 전환 (auth.js의 `switchAuthTab()`과 이름 충돌 주의)

### prices.html — 자재 단가표

- 7개 탭: 목자재 / 석고보드·단열재 / 타일 / 철물·건재 / 도장·도배 / 전기·조명 / 시공비
- Supabase `prices` 테이블에서 동적 로딩 (`prices_setup.sql` 먼저 실행 필요)
- 비로그인: 각 탭 하단 행들 blur + 잠금 오버레이
- 로그인: 전체 공개

**prices 테이블 초기화:**
```
Supabase Dashboard → SQL Editor → prices_setup.sql 내용 붙여넣고 실행
```

### board.html — 소통 게시판

- 카테고리: 자재 정보 / 업체 추천 / 시공 후기 / 질문·답변 / 공지
- 로그인 시: 작성자 = 이메일 앞부분 자동 입력 + readonly (스푸핑 방지)
- 비로그인: 글쓰기 버튼 클릭 시 로그인 모달 오픈
- 댓글도 동일하게 작성자 처리

### admin.html — 관리자

- **별도 인증**: Supabase Auth 로그인 + `ADMIN_EMAILS` 화이트리스트 검증
- `auth.js` 미사용 (자체 `db` 정의)
- **업체 등록 탭**: 주소 → 좌표 변환(Naver Geocoder) + 지도 클릭으로 좌표 설정
- **단가 관리 탭**: prices 테이블 CRUD (추가/삭제/목록 조회)

---

## 개발 서버 실행

```bash
cd "인테리어 자재 지도"
npx serve -p 3000
# → http://localhost:3000
```

---

## 알려진 이슈 / TODO

### 즉시 처리 필요
- [ ] `prices_setup.sql` Supabase에서 실행 (단가표 활성화)
- [ ] Supabase 자동정지 방지: UptimeRobot으로 5일마다 핑
  - URL: `https://ppbbmwacrcerclbkxgsl.supabase.co/rest/v1/stores?select=id&limit=1`

### 보안
- [ ] Supabase RLS 정책 설정 (`stores`, `posts`, `comments` 테이블)
  - 현재: anon 키로 누구나 insert/delete 가능
  - 목표: select는 공개, insert는 인증 유저만, delete는 본인 것만

### 기능
- [ ] 게시글 수정/삭제 (본인 글만)
- [ ] 가게 제보 기능 (유저 신청 → 관리자 승인)
- [ ] 게시판 페이지네이션
- [ ] 샘플 데이터 충분히 입력

### UX/배포
- [ ] 모바일 헤더 nav 겹침 개선
- [ ] OG 메타태그 추가 (카카오톡 공유 미리보기)
- [ ] `stores.js` 미사용 파일 삭제
- [ ] GitHub Pages 배포

---

## 카테고리 색상 코드

```js
const CAT_COLOR = {
    "철물건재":     "#708090",
    "인테리어철물": "#2E8B57",
    "목자재":       "#8B4513",
    "타일자재":     "#4682B4",
    "전기조명":     "#DAA520",
};
```

---

## 브랜드 컬러

```css
--primary:   #1a1a2e;   /* 헤더, 버튼 메인 */
--primary-h: #2d2d4e;   /* hover */
--danger:    #DC143C;
--success:   #2E8B57;
--info:      #4682B4;
```
