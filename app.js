document.addEventListener('DOMContentLoaded', () => {
  // ===== 결과 페이지 모드면 렌더만 하고 종료 =====
  const params = new URLSearchParams(location.search);
  const isResult = /result\.html$/i.test(location.pathname)
                  || ['place','mood','flow','extras'].every(k => params.has(k));
  if (isResult) { renderResultFromParams(params); return; }

  /* ===== 헤더 문구 로테이터: 높이 자동 측정 & 고정 ===== */
(function setupHeaderRotator(){
  const header  = document.querySelector('.site-header');
  const brandEl = header?.querySelector('.brand');
  const tagEl   = header?.querySelector('.tagline');
  if (!header || !brandEl || !tagEl) return;
  // 1) 교대될 두 문구
  const MSG1 = '딱딱한 형식을 벗어나, 각자의 상상으로 공연을 엿보는 시간.';
  const MSG2 = [
    '당신의 선택이 모여 하나의 공연이 됩니다. 장소와 무드, 감상 흐름, 공연 뒤의 여운까지 골라 보세요.',
    '결과 페이지에서 선택이 한 장면의 그래픽으로 시각화되고, 아카이브에서 다양한 사람들의 순간과 함께 감상할 수 있어요.'
  ].join('<br>');
  // 2) 현재 상태
  let showLong = false;           // false=문구1(브랜드 보임), true=문구2(브랜드 숨김)
  const PERIOD_MS = 4000;
  // 3) 높이 측정: 두 상태(브랜드ON+MSG1 / 브랜드OFF+MSG2) 중 큰 값을 min-height로
  function measureMaxHeaderHeight(){
    // 헤더의 실제 너비와 유사한 조건에서 오프스크린 측정
    const ghost = header.cloneNode(true);
    ghost.style.position = 'absolute';
    ghost.style.left = '-9999px';
    ghost.style.top = '0';
    ghost.style.visibility = 'hidden';
    ghost.style.minHeight = '0';  // 기존 min-height 영향 제거
    ghost.style.width = header.getBoundingClientRect().width + 'px'; // 같은 레이아웃 폭
    // 브랜드/태그라인 레퍼런스
    const ghostBrand = ghost.querySelector('.brand');
    const ghostTag   = ghost.querySelector('.tagline');
    if (!ghostBrand || !ghostTag) return header.offsetHeight;
    // 상태 A: 문구1, 브랜드 보임
    ghostBrand.classList.remove('is-hidden');
    ghostTag.innerHTML = MSG1;
    document.body.appendChild(ghost);
    const h1 = ghost.offsetHeight;
    // 상태 B: 문구2, 브랜드 숨김
    ghostBrand.classList.add('is-hidden');
    ghostTag.innerHTML = MSG2;
    const h2 = ghost.offsetHeight;
    ghost.remove();
    return Math.max(h1, h2);
  }
  // 4) min-height 적용 (리사이즈/폰트 로딩 시 재계산)
  function applyStableHeight(){
    const h = measureMaxHeaderHeight();
    header.style.minHeight = h + 'px';
  }
  // 5) 실제 렌더링 토글
  function render(){
    if (showLong) {
      brandEl.classList.add('is-hidden');     // 문구2: 브랜드 숨김
      tagEl.innerHTML = MSG2;
    } else {
      brandEl.classList.remove('is-hidden');  // 문구1: 브랜드 노출
      tagEl.innerHTML = MSG1;
    }
    showLong = !showLong;
  }
  // 초기 세팅: 높이를 먼저 고정한 뒤, 문구 렌더 시작
  applyStableHeight();
  render();
  const timer = setInterval(render, PERIOD_MS);
  // 화면/폰트 변화에 대응: min-height 재계산
  const onResize = () => applyStableHeight();
  window.addEventListener('resize', onResize, { passive:true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(applyStableHeight);
  } else {
    // 폰트 API 미지원 브라우저용 안전망
    setTimeout(applyStableHeight, 500);
  }
  // 페이지 이탈 시 타이머 정리
  window.addEventListener('beforeunload', () => clearInterval(timer));
})();

  // ===== 튜닝 포인트 =====
  const HARD_MAX = 640;      // 라디얼 최대 지름
  const HARD_MIN = 220;      // 라디얼 최소 지름
  const MAX_INSTRUMENTS = 3; // 악기 선택 최대 개수

  // 라디얼 뷰포트 비율(라디얼 전용)
  const RADIAL_VW    = 0.70; // 화면 너비의 70%
  const RADIAL_VH    = 0.78; // (안전영역 제외) 세로의 78%
  const RADIAL_SCALE = 0.92; // 최종 보정 비율

  // 악기 그리드 전용 폭(라디얼과 독립)
  const GRID_MIN = 380;
  const GRID_MAX = 620;

  // ===== DOM =====
  const stepDots        = document.getElementById('stepDots');
  const stepTitle       = document.getElementById('stepTitle');
  const stepHint        = document.getElementById('stepHint');
  const radialContainer = document.getElementById('radialContainer');
  const btnPrev         = document.getElementById('btnPrev');
  const navBar          = btnPrev?.closest('.nav');

  // 사이드팁(호버 설명)
  injectSideTipStyles();
  ensureSidePanels();

  // ===== 데이터 =====
const steps = [
  {
    id:"place",
    title:"어디에서 음악을 만나고 싶나요?",
    hint:"당신의 오늘에 맞는 무대를 고르세요.",
    options:[
      {
        value:"field",
        label:"들판에서",
        color:"#CDE2A5",
        desc:"시야가 트인 바람과 잔디 위에서, 소리의 폭이 자유롭게 펼쳐집니다. 포르타토는 이 열린 감각을 공연 곳곳으로 번져가게 합니다."
      },
      {
        value:"forest",
        label:"숲속에서",
        color:"#9CC59A",
        desc:"나뭇결 사이 잔향이 길게 머무는 자리. 작은 앙상블이 숨처럼 섞입니다. 우리는 집중과 여유가 공존하는 호흡을 중시합니다."
      },
      {
        value:"lake",
        label:"계곡에서",
        color:"#A9D4E9",
        desc:"물결과 겹치는 음색이 레이어를 만듭니다. 소리와 공간이 서로를 비춥니다. 포르타토는 장소가 음악을 새로 쓰게 한다고 믿습니다."
      },
      {
        value:"sea",
        label:"바닷가에서",
        color:"#7EC2D9",
        desc:"파도의 주기가 리듬처럼 밀려옵니다. 밝고 시원한 광택이 멀리까지 닿습니다. 우리는 움직이는 자연의 질서를 음악에 초대합니다."
      }
    ]
  },
{
  id:"mood",
  title:"어떤 결의 음악을 기대하나요?",
  hint:"클래식의 흐름 속에서 오늘의 무드를 골라보세요.",
  options:[
    {
      value:"classical",
      label:"우아하고 정제된 선율",
      color:"#EAE7E0",
      desc:"바로크·고전주의의 균형과 명료함이 선율을 또렷하게 만듭니다. 포르타토는 그 단단한 질서 위에 여유를 더해, 누구나 편안히 다가가도록 엽니다."
    },
    {
      value:"romantic",
      label:"드라마틱한 감정",
      color:"#E6C5CF",
      desc:"낭만주의의 넓은 다이내믹과 격정이 감정선을 크게 흔듭니다. 포르타토는 이 진폭을 함께 나누며, 연주자와 관객의 경계를 자연스럽게 낮춥니다."
    },
    {
      value:"impressionist",
      label:"몽환적 음색",
      color:"#CFE0F2",
      desc:"인상주의·초기 모더니즘의 색채와 울림이 흐림의 미학을 빚어냅니다. 포르타토는 이 여백을 살려, 각자가 자기만의 장면을 상상하도록 이끕니다."
    },
    {
      value:"neoclassical",
      label:"자유로운 형식",
      color:"#D9D9D9",
      desc:"후기 모더니즘과 포스트모던의 유연한 구조가 규칙을 가볍게 변주합니다. 포르타토는 이 실험을 일상 언어로 번역해, 함께 창조하는 즐거움을 엽니다."
    }
  ]
},
  {
    id:"flow",
    title:"몸과 시선은 어떻게 흐르면 좋을까요?",
    hint:"관람의 리듬을 정하면 공연이 더 가까워집니다.",
    options:[
      {
        value:"lie",
        label:"편안히 누워",
        color:"#F6EBD9",
        desc:"하늘과 수관을 보며 몸을 놓고 듣는 완만한 몰입. 포르타토의 무대는 관객의 자세를 우아하게 허용합니다."
      },
      {
        value:"sit",
        label:"자유롭게 앉아",
        color:"#E8E3FF",
        desc:"편안한 거리에서 선율에 집중하는 안정된 감상. 우리는 정돈됨 속의 자유를 제공합니다."
      },
      {
        value:"walk",
        label:"좌석에서 몰입",
        color:"#E0F7F1",
        desc:"정면 무대에 시선을 모아 서사를 따라갑니다. 집중의 힘은 여전히 유효하며, 포르타토는 그 몰입을 존중합니다."
      },
      {
        value:"scatter",
        label:"가볍게 돌아다니며",
        color:"#FFEAD6",
        desc:"지점을 옮기며 서로 다른 청감을 발견합니다. 느슨한 이동이 새로운 관계를 만듭니다."
      }
    ]
  },
  {
    id:"extras",
    title:"공연의 여운은 어떻게 이어질까요?",
    hint:"연주자와의 교류 혹은 페스티벌적 즐거움을 고르세요.",
    options:[
      {
        value:"talk",
        label:"연주자와 대화",
        color:"#FDE3B5",
        desc:"연주자와 관객이 같은 높이에서 마주앉습니다. 해석은 일방이 아니라 서로에게서 태어납니다."
      },
      {
        value:"tea",
        label:"다과 시간",
        color:"#E6F4D9",
        desc:"다과와 담소로 여운이 천천히 이어집니다. 사소한 대화가 공연의 일부가 됩니다."
      },
      {
        value:"instrument",
        label:"체험 부스",
        color:"#DDEBFF",
        desc:"직접 소리를 내보며 음악과 거리를 좁힙니다. 포르타토는 감상과 체험의 경계를 가볍게 넘습니다."
      },
      {
        value:"campfire",
        label:"캠프파이어",
        color:"#FFE1D6",
        desc:"불빛을 둘러앉아 관계가 자연스레 이어집니다. 공동의 마무리가 각자의 기억을 단단하게 합니다."
      }
    ]
  },
  // 다중선택(그리드)
  {
    id:"instruments",
    title:"어떤 악기를 특히 좋아하나요?",
    hint:"",
    multiselect:true,
    choices:["바이올린","비올라","첼로","콘트라베이스","클라리넷","플룻","트럼펫","트럼본","호른"]
  }
];

  const INSTRUMENT_ACCENTS = {
    바이올린:'#F8D7DA', 비올라:'#FDE3B5', 첼로:'#E6F4D9', 콘트라베이스:'#DDEBFF',
    클라리넷:'#CFE0F2', 플룻:'#E8E3FF', 트럼펫:'#FFEAD6', 트럼본:'#F6EBD9', 호른:'#E0F7F1'
  };

  let stepIndex = 0;
  const selections = {};   // place, mood, flow, extras, instruments[]

  // 점 초기화
  if (stepDots) {
    stepDots.innerHTML = '';
    steps.forEach((_, i) => {
      const li = document.createElement('li');
      if (i === 0) li.classList.add('is-active');
      stepDots.appendChild(li);
    });
  }

  // 리사이즈 시 라디얼만 재배치(그리드는 폭만 재적용)
  window.addEventListener('resize', () => {
    rebuildCurrent();
  }, { passive: true });

  // 이전 버튼
  btnPrev?.addEventListener('click', () => {
    if (stepIndex === 0) return;
    stepIndex--;
    renderStep();
  });

  // 최초 렌더
  renderStep();

  function renderStep() {
    const step = steps[stepIndex];
    stepTitle && (stepTitle.textContent = step.title);
    stepHint  && (stepHint.textContent  = step.hint || '');
    btnPrev   && (btnPrev.disabled = (stepIndex === 0));

    // 진행점
    if (stepDots) {
      [...stepDots.children].forEach((li, i) => {
        li.classList.toggle('is-active', i === stepIndex);
        li.classList.toggle('is-done',   i <  stepIndex);
      });
    }

    // 컨테이너 리셋
    radialContainer.removeAttribute('style');
    radialContainer.innerHTML = '';

    if (step.id === 'instruments' && step.multiselect) {
      renderInstrumentGridStep(step);
    } else {
      renderRadialStep(step);
    }
    hideSideTips();
  }

  function rebuildCurrent(){
    const step = steps[stepIndex];
    if (step.id === 'instruments' && step.multiselect) {
      // 폭만 다시 적용
      applyGridBox();
    } else {
      // 라디얼 사이즈만 다시
      const size = computeRadialSize();
      applyRadialBox(size);
    }
  }

  /* ========== 라디얼 스텝 ========== */
  function renderRadialStep(step){
    const size = computeRadialSize();
    applyRadialBox(size);

    const radial = buildRadial(size, step.options || [], selections[step.id] || null, (val)=>{
      selections[step.id] = val;
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        renderStep();
      } else {
        goToResult(selections);
      }
    });
    radialContainer.appendChild(radial);
  }

  function computeRadialSize(){
    // 뷰포트 가드 (0/NaN 방지)
    const vw = Math.max(320, window.innerWidth  || 0);
    const vh = Math.max(480, window.innerHeight || 0);

    // CSS :root의 --safe-top(140px) / 푸터 높이(64px)와 일치시키기
    const SAFE_TOP  = 140;
    const FOOTER_H  = 64;

    // 세로 가용 높이
    const availH = Math.max(0, vh - SAFE_TOP - FOOTER_H);

    // 비율 적용
    const byW = Math.floor(vw * RADIAL_VW);
    const byH = Math.floor(availH * RADIAL_VH);

    // 상/하한 + 최종 스케일
    const raw   = Math.min(HARD_MAX, byW, byH);
    const sized = Math.max(HARD_MIN, Math.floor(raw * RADIAL_SCALE));

    return sized;
  }

  function applyRadialBox(size){
    radialContainer.style.width          = `${size}px`;
    radialContainer.style.height         = `${size}px`;
    radialContainer.style.display        = 'flex';
    radialContainer.style.justifyContent = 'center';
    radialContainer.style.alignItems     = 'center';
    radialContainer.style.marginLeft     = 'auto';
    radialContainer.style.marginRight    = 'auto';
  }

  function buildRadial(size, options, selectedValue, onSelect){
    const r = size / 2;
    const cx = r, cy = r;
    const n = options.length;
    const tau = Math.PI * 2;

    const wrap = document.createElement('div');
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.position = 'relative';

    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.style.width = '100%';
    svg.style.height = '100%';
    wrap.appendChild(svg);

    // 분할선
    const gSep = document.createElementNS('http://www.w3.org/2000/svg','g');
    for (let i=0;i<n;i++){
      const a = (i/n)*tau;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', x);  line.setAttribute('y2', y);
      line.setAttribute('class','sep-line');
      gSep.appendChild(line);
    }
    svg.appendChild(gSep);

    // 슬라이스
    options.forEach((opt,i)=>{
      const a0 = (i/n)*tau;
      const a1 = ((i+1)/n)*tau;

      const d = wedgePath(cx,cy,r,a0,a1);

      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('class','slice-group');
      if (opt.value === selectedValue) g.classList.add('is-selected');

      const fillPath   = document.createElementNS('http://www.w3.org/2000/svg','path');
      fillPath.setAttribute('d', d);
      fillPath.setAttribute('class','slice-fill');

      const strokePath = document.createElementNS('http://www.w3.org/2000/svg','path');
      strokePath.setAttribute('d', d);
      strokePath.setAttribute('class','slice-stroke');

      // 라벨
      const mid = (a0 + a1) / 2;
      const lr  = r * 0.6;
      const lx  = cx + Math.cos(mid) * lr;
      const ly  = cy + Math.sin(mid) * lr;

      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.setAttribute('x', lx);
      label.setAttribute('y', ly);
      label.setAttribute('fill', '#fff');
      label.setAttribute('font-size', Math.max(12, r * 0.065));
      label.setAttribute('text-anchor','middle');
      label.setAttribute('dominant-baseline','middle');
      label.style.pointerEvents = 'none';
      label.textContent = opt.label;

      // 사이드 팁
      g.addEventListener('mouseenter', ()=>{
        const side = Math.cos(mid) < 0 ? 'left' : 'right';
        showSideTip(side, opt.label, opt.desc, opt.color);
      });
      g.addEventListener('mouseleave', hideSideTips);

      // 클릭
      g.addEventListener('click', ()=>{
        svg.querySelectorAll('.slice-group').forEach(s => s.classList.remove('is-selected'));
        g.classList.add('is-selected');
        onSelect(opt.value);
      }, { passive:true });

      g.appendChild(fillPath);
      g.appendChild(strokePath);
      g.appendChild(label);
      svg.appendChild(g);
    });

    return wrap;
  }

  function wedgePath(cx,cy,r,a0,a1){
    const sx = cx + r * Math.cos(a0);
    const sy = cy + r * Math.sin(a0);
    const ex = cx + r * Math.cos(a1);
    const ey = cy + r * Math.sin(a1);
    const large = ((a1 - a0) % (Math.PI*2)) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
  }

  /* ========== 악기 그리드 스텝 ========== */
function renderInstrumentGridStep(step){
  applyGridBox();

  const grid = document.createElement('div');
  grid.className = 'instrument-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = window.innerWidth <= 640 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';
  grid.style.gap = '0';
  grid.style.margin = '0';
  grid.style.padding = '0';

  const chosen = new Set(selections.instruments || []);
  step.choices.forEach(name=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.textContent = name;

    // 각 버튼의 포인트 색만 변수로 전달 (CSS가 이걸 사용)
    btn.style.setProperty('--accent', INSTRUMENT_ACCENTS[name] || 'rgba(255,255,255,.22)');

    // 초기 선택 반영
    if (chosen.has(name)) btn.classList.add('is-selected');

    // 호버(구형 브라우저 대응용): CSS :hover와 동일한 스타일 클래스
    btn.addEventListener('mouseenter', ()=> btn.classList.add('is-hover'));
    btn.addEventListener('mouseleave', ()=> btn.classList.remove('is-hover'));

    // 토글(최대 3개)
    btn.addEventListener('click', ()=>{
      if (chosen.has(name)) {
        chosen.delete(name);
        btn.classList.remove('is-selected');
      } else {
        if (chosen.size >= MAX_INSTRUMENTS) {
          btn.animate([{transform:'scale(1)'},{transform:'scale(.97)'},{transform:'scale(1)'}], {duration:120});
          return;
        }
        chosen.add(name);
        btn.classList.add('is-selected');
      }
    });

    grid.appendChild(btn);
  });

  radialContainer.appendChild(grid);

  // 완료 버튼(‘이전’ 오른쪽, 중앙정렬 유지)
  attachDoneButton(()=>{
    selections.instruments = Array.from(chosen);
    goToResult(selections);
  });
}

  function applyGridBox(){
    const vw = Math.max(320, window.innerWidth || 0);
    const width = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.floor(vw * 0.9)));
    radialContainer.style.width       = `${width}px`;
    radialContainer.style.height      = 'auto';
    radialContainer.style.display     = 'block';
    radialContainer.style.marginLeft  = 'auto';
    radialContainer.style.marginRight = 'auto';
  }

  // 완료 버튼 관리
  let btnDone = null;
  function attachDoneButton(onClick){
    if (!navBar) return;
    detachDoneButton();
    btnDone = document.createElement('button');
    btnDone.type = 'button';
    btnDone.className = 'btn btn-primary';
    btnDone.textContent = '완료';
    btnDone.addEventListener('click', onClick);
    navBar.appendChild(btnDone); // 이전 버튼 오른쪽에 붙음(중앙 정렬 유지)
  }
  function detachDoneButton(){
    if (btnDone && btnDone.parentNode) btnDone.parentNode.removeChild(btnDone);
    btnDone = null;
  }

  // 결과 이동
  function goToResult(sel){
    const payload = { ...sel };
    if (Array.isArray(payload.instruments)) payload.instruments = payload.instruments.join(',');
    const qs = new URLSearchParams(payload).toString();
    const toResult = location.pathname.replace(/[^/]+$/, 'result.html');
    location.href = `${toResult}?${qs}`;
  }

  /* ===== 사이드 팁 ===== */
  function ensureSidePanels() {
    if (!document.getElementById('sideTipLeft')) {
      const left = document.createElement('aside');
      left.id = 'sideTipLeft';
      left.className = 'side-tip';
      document.body.appendChild(left);
    }
    if (!document.getElementById('sideTipRight')) {
      const right = document.createElement('aside');
      right.id = 'sideTipRight';
      right.className = 'side-tip';
      document.body.appendChild(right);
    }
  }
  function showSideTip(side, title, desc, swatch){
    const left  = document.getElementById('sideTipLeft');
    const right = document.getElementById('sideTipRight');
    if (!left || !right) return;

    left.classList.remove('is-show');
    right.classList.remove('is-show');

    const target = side === 'left' ? left : right;
    target.innerHTML = `
      <h4 class="side-tip__title">${title || ''}</h4>
      ${swatch ? `<div class="side-tip__swatch" style="width:100%;height:6px;border-radius:4px;margin:8px 0 10px;background:${swatch};"></div>` : ''}
      <p class="side-tip__desc">${desc || ''}</p>
    `;

    const rect = radialContainer.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    positionSideTipForSide(side, rect.width, centerY);
  }
  function hideSideTips(){
    document.getElementById('sideTipLeft')?.classList.remove('is-show');
    document.getElementById('sideTipRight')?.classList.remove('is-show');
  }
  function positionSideTipForSide(side, size, centerY) {
    const left  = document.getElementById('sideTipLeft');
    const right = document.getElementById('sideTipRight');
    if (!left || !right) return;

    const target = side === 'left' ? left : right;
    const other  = side === 'left' ? right : left;

    const gap = 24;
    const cx = window.innerWidth / 2;

    const tw = target.getBoundingClientRect().width || 260;
    const th = target.getBoundingClientRect().height || 120;
    const topTarget = Math.max(16, centerY - th/2);

    if (window.innerWidth > 880) {
      target.style.position = 'fixed';
      target.style.top  = `${topTarget}px`;
      target.style.left = side === 'left'
        ? `${cx - (size/2) - gap - tw}px`
        : `${cx + (size/2) + gap}px`;
      target.style.transform = 'none';
      target.style.width = '';
      target.classList.add('is-show');
      other.classList.remove('is-show');
    } else {
      const belowTop = centerY + (size/2) + 16;
      target.style.position = 'fixed';
      target.style.left = '50%';
      target.style.top = `${belowTop}px`;
target.style.transform = 'translateX(-50%)';
      target.style.width = `${Math.min(560, window.innerWidth - 32)}px`;
      target.classList.add('is-show');
      other.classList.remove('is-show');
    }
  }

  function injectSideTipStyles(){
    if (document.getElementById('sideTipStyles')) return;
    const st = document.createElement('style');
    st.id = 'sideTipStyles';
    st.textContent = `
      .side-tip{min-width:260px;max-width:320px;min-height:120px;border:1px solid #eee;border-radius:10px;background:#fff;
        padding:16px;box-shadow:0 6px 20px rgba(0,0,0,.06);opacity:0;transform:translateY(6px);
        transition:opacity .18s ease,transform .18s ease;pointer-events:none;display:none;}
      .side-tip.is-show{display:block;opacity:1;transform:translateY(0);}
      .side-tip__title{margin:0 0 6px;font-size:14px;font-weight:700;color:#111;}
      .side-tip__desc{margin:0;font-size:13px;line-height:1.5;color:#333;}
      .side-tip__swatch{width:100%;height:6px;border-radius:4px;margin:8px 0 10px;}
    `;
    document.head.appendChild(st);
  }
});

/* ============ 결과 페이지 공통 ============ */
const moodPalettes = {
  classical:['#FBFBFB','#DADADA','#8F8F8F','#1E1E1E'],
  romantic:['#2B1D2A','#6E2F4F','#C14972','#F2C6C2'],
  impressionist:['#E4F1F9','#B7D3E9','#8BBAD8','#4A6FA5'],
  neoclassical:['#FFFFFF','#D9D9D9','#9E9E9E','#222222'],
  avantgarde:['#0D0D0D','#FFFFFF','#FF4D4D','#1AE5BE'],
  minimal:['#FFFFFF','#EFEFEF','#D9D9D9','#111111']
};

function renderResultFromParams(params) {
  let mount = document.getElementById('resultMount');
  if (!mount) {
    mount = document.createElement('main');
    mount.id = 'resultMount';
    mount.className = 'app';
    mount.style.maxWidth = '960px';
    mount.style.margin = '0 auto';
    mount.style.padding = '16px';
    document.body.appendChild(mount);
  }

  const sel = {
    place: params.get('place') || '',
    mood: params.get('mood') || 'classical',
    flow: params.get('flow') || '',
    extras: params.get('extras') || '',
    instruments: params.get('instruments') || '' // "a,b,c"
  };

  mount.innerHTML = `
    <header class="site-header">
      <h1 class="brand">PORTATO — 추천 결과</h1>
      <p class="tagline">선택으로 완성하는 나만의 공연</p>
    </header>

    <section class="result">
      <h2 class="step__title">당신에게 어울리는 포르타토의 순간</h2>
      <p class="step__hint">방금 선택한 요소로 공연의 결을 시각화했습니다.</p>
      <div id="posterWrap" style="border:1px solid #eee;background:#fff;border-radius:8px;overflow:hidden;margin:12px 0;">
        <div id="poster" style="width:100%;height:480px;"></div>
      </div>
      <ul id="resultSummary" class="summary__list" style="max-width:520px;margin:0 auto 12px;"></ul>
      <div class="nav" style="display:flex;justify-content:center;gap:.5rem;">
        <a href="index.html" class="btn">처음부터</a>
        <button id="btnDownload" class="btn btn-primary" type="button">이미지 저장</button>
      </div>
    </section>

    <footer class="site-footer"><small>© 2025 PORTATO</small></footer>
  `;

  const table = {
    place:"어디에서 음악을 만나고 싶나요?",
    mood:"어떤 결의 음악을 기대하나요?",
    flow:"몸과 시선은 어떻게 흐르면 좋을까요?",
    extras:"공연의 여운은 어떻게 이어질까요?",
    instruments:"특히 좋아하는 악기"
  };
  const labelsMap = {
    place:{ field:"들판에서", forest:"숲속에서", lake:"계곡에서", sea:"바닷가에서" },
    mood:{ classical:"우아하고 정제된 선율", romantic:"드라마틱한 감정", impressionist:"몽환적 음색", neoclassical:"자유로운 형식" },
    flow:{ lie:"편안히 누워", sit:"자유롭게 앉아", walk:"좌석에서 몰입", scatter:"가볍게 돌아다니며" },
    extras:{ talk:"연주자와 대화", tea:"다과 시간", instrument:"체험 부스", campfire:"캠프파이어" }
  };

  const resultSummary = document.getElementById('resultSummary');
  resultSummary.innerHTML = '';
  ['place','mood','flow','extras','instruments'].forEach(k=>{
    const valueText = (k === 'instruments')
      ? (sel.instruments ? sel.instruments.split(',').slice(0,3).join(' · ') : '—')
      : (labelsMap[k]?.[sel[k]] || '—');

    const li  = document.createElement('li');
    const name= document.createElement('span');
    const val = document.createElement('strong');
    name.textContent = table[k];
    val.textContent  = valueText;

    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.padding = '.6rem .8rem';
    li.style.background = '#fff';
    li.style.border = '1px solid #eee';
    li.style.borderRadius = '6px';
    li.style.margin = '.4rem 0';

    li.appendChild(name); li.appendChild(val);
    resultSummary.appendChild(li);
  });

  const poster = document.getElementById('poster');
  poster.innerHTML = buildSimplePosterSVG(sel);

  document.getElementById('btnDownload').onclick = () => downloadPosterSVG();
}

function buildSimplePosterSVG(sel) {
  const w = 1000, h = 600;
  const palette = moodPalettes[sel.mood] || moodPalettes.classical;
  const [bg, mid, acc, ink] = palette;

  return `
<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="추천 공연 무드 프리뷰" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${mid}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${[230,200,170,140,110].map(r=>`<circle cx="${w/2}" cy="${h/2}" r="${r}" fill="none" stroke="${acc}" stroke-width="1" opacity="0.4"/>`).join('')}
  <g fill="${ink}">
    <text x="${w/2}" y="${h/2 - 10}" text-anchor="middle" font-size="36" font-weight="700">PORTATO 추천 무드</text>
    <text x="${w/2}" y="${h/2 + 28}" text-anchor="middle" font-size="18" opacity="0.8">
      ${sel.place || '—'} · ${sel.mood || '—'} · ${sel.flow || '—'} · ${sel.extras || '—'}
      ${sel.instruments ? `· ${sel.instruments.split(',').slice(0,3).join(' · ')}` : ''}
    </text>
  </g>
</svg>`;
}

function downloadPosterSVG() {
  const poster = document.getElementById('poster');
  const svg = poster?.innerHTML?.trim();
  if (!svg) return;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'portato_recommendation.svg';
  a.click(); URL.revokeObjectURL(url);
}