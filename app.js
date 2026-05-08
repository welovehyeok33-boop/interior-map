// ── 카테고리 설정 ─────────────────────────────────────────────
const CAT_COLOR = {
  "철물건재":     "#708090",
  "인테리어철물": "#2E8B57",
  "목자재":       "#8B4513",
  "전기조명":     "#DAA520",
};

const CAT_SHORT = {
  "철물건재":     "철",
  "인테리어철물": "인",
  "목자재":       "목",
  "전기조명":     "전",
};

// ── 상태 ──────────────────────────────────────────────────────
let map;
let markerList = [];
let allStores = [];
let currentCategory = "all";
let currentSearch = "";

// ── 지도 초기화 ───────────────────────────────────────────────
window.onload = async function () {
  map = new naver.maps.Map("map", {
    center: new naver.maps.LatLng(37.5665, 126.9940),
    zoom: 13,
    mapTypeId: naver.maps.MapTypeId.NORMAL,
  });

  await loadStores();
};

// ── Supabase에서 업체 불러오기 ────────────────────────────────
async function loadStores() {
  var list = document.getElementById("storeList");
  list.innerHTML = '<p class="empty-msg">불러오는 중...</p>';

  if (typeof supabase === "undefined") {
    list.innerHTML = '<p style="color:red;font-size:14px;padding:10px;font-weight:bold;">❌ Supabase 로드 실패</p>';
    return;
  }

  var result = await db.from("stores").select("*").order("id");

  if (result.error) {
    list.innerHTML = '<p class="empty-msg" style="color:red">오류: ' + result.error.message + '</p>';
    return;
  }

  if (!result.data || result.data.length === 0) {
    list.innerHTML = '<p class="empty-msg" style="color:orange">DB에 데이터가 없습니다.</p>';
    return;
  }

  allStores = result.data;
  createMarkers();
  renderStoreList();
  updateCounts();
}

// ── 마커 생성 ─────────────────────────────────────────────────
function createMarkers() {
  markerList.forEach(function (item) { item.marker.setMap(null); });
  markerList = [];

  allStores.forEach(function (store) {
    if (!store.lat || !store.lng) return;

    var color = CAT_COLOR[store.category] || "#888";
    var short = CAT_SHORT[store.category] || "?";

    var content = [
      '<div style="',
        'width:32px;height:32px;',
        'background:', color, ';',
        'border-radius:50% 50% 50% 0;',
        'transform:rotate(-45deg);',
        'border:2px solid white;',
        'box-shadow:0 2px 6px rgba(0,0,0,0.3);',
        'cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
      '">',
        '<span style="',
          'transform:rotate(45deg);',
          'color:white;font-size:11px;font-weight:700;',
          'font-family:Apple SD Gothic Neo,sans-serif;',
        '">', short, '</span>',
      '</div>',
    ].join('');

    var marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(store.lat, store.lng),
      map: map,
      icon: { content: content, anchor: new naver.maps.Point(16, 32) },
      title: store.name,
    });

    naver.maps.Event.addListener(marker, "click", function () {
      showDetail(store);
      map.panTo(new naver.maps.LatLng(store.lat, store.lng));
    });

    markerList.push({ marker: marker, store: store });
  });
}

// ── 마커 필터링 ───────────────────────────────────────────────
function filterMarkers() {
  markerList.forEach(function (item) {
    var catMatch    = currentCategory === "all" || item.store.category === currentCategory;
    var searchMatch = currentSearch === "" ||
                      item.store.name.indexOf(currentSearch) !== -1 ||
                      item.store.address.indexOf(currentSearch) !== -1;
    item.marker.setVisible(catMatch && searchMatch);
  });
  renderStoreList();
}

// ── 사이드바 업체 목록 렌더 ───────────────────────────────────
function renderStoreList() {
  var list = document.getElementById("storeList");
  var filtered = allStores.filter(function (s) {
    var catMatch    = currentCategory === "all" || s.category === currentCategory;
    var searchMatch = currentSearch === "" ||
                      s.name.indexOf(currentSearch) !== -1 ||
                      s.address.indexOf(currentSearch) !== -1;
    return catMatch && searchMatch;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">검색 결과가 없습니다.</p>';
    return;
  }

  list.innerHTML = filtered.map(function (s) {
    return [
      '<div class="store-item" onclick="focusStore(', s.id, ')"',
        ' style="border-left-color:', CAT_COLOR[s.category] || "#888", '">',
        '<div class="store-item-name">', s.name, '</div>',
        '<div class="store-item-addr">', s.address, '</div>',
        '<span class="store-item-cat" style="background:', CAT_COLOR[s.category] || "#888", '">',
          s.category,
        '</span>',
      '</div>',
    ].join('');
  }).join('');
}

// ── 카테고리 카운트 표시 ──────────────────────────────────────
function updateCounts() {
  document.getElementById("count-all").textContent = allStores.length;
  ["철물건재", "인테리어철물", "목자재", "전기조명"].forEach(function (cat) {
    var el = document.getElementById("count-" + cat);
    if (el) el.textContent = allStores.filter(function (s) { return s.category === cat; }).length;
  });
}

// ── 상세 패널 표시 ────────────────────────────────────────────
function showDetail(store) {
  var color = CAT_COLOR[store.category] || "#888";

  document.getElementById("detailCategory").textContent      = store.category;
  document.getElementById("detailCategory").style.background = color;
  document.getElementById("detailName").textContent          = store.name;

  document.getElementById("detailBody").innerHTML = [
    '<div class="detail-info">',
      '<div class="detail-row">',
        '<span class="detail-row-label">주소</span>',
        '<span class="detail-row-value">', store.address, '</span>',
      '</div>',
      store.phone ? [
        '<div class="detail-row">',
          '<span class="detail-row-label">전화</span>',
          '<span class="detail-row-value">',
            '<a href="tel:', store.phone, '">', store.phone, '</a>',
          '</span>',
        '</div>',
      ].join('') : '',
      store.hours ? [
        '<div class="detail-row">',
          '<span class="detail-row-label">영업시간</span>',
          '<span class="detail-row-value">', store.hours, '</span>',
        '</div>',
      ].join('') : '',
    '</div>',
  ].join('');

  document.getElementById("detailPanel").classList.add("open");
}

// ── 사이드바 클릭 → 지도 이동 ────────────────────────────────
function focusStore(id) {
  var store = null;
  for (var i = 0; i < allStores.length; i++) {
    if (allStores[i].id === id) { store = allStores[i]; break; }
  }
  if (!store) return;

  map.panTo(new naver.maps.LatLng(store.lat, store.lng));
  map.setZoom(16);
  showDetail(store);
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────
document.querySelectorAll(".cat-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".cat-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    filterMarkers();
  });
});

document.getElementById("searchInput").addEventListener("input", function (e) {
  currentSearch = e.target.value.trim();
  filterMarkers();
});

document.getElementById("detailClose").addEventListener("click", function () {
  document.getElementById("detailPanel").classList.remove("open");
});
