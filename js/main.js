/*
  PROFILEのエンドロール制御。
  「下から登場 → 上へ完全に抜ける → 数秒の間 → 再登場」を実際の
  高さから計算する必要があるため、CSSの%だけでは組めず
  Web Animations API で直接 transform を組み立てている。
  オープニング演出とは完全に独立して動作する。
*/
function initCredits(creditsEl, options) {
  options = options || {};

  const viewport = creditsEl.querySelector('.credits__viewport');
  const track = creditsEl.querySelector('.credits__track');
  const content = creditsEl.querySelector('.credits__content');
  if (!viewport || !track || !content) return null;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return null;

  const SPEED = 34; // px/秒。映画のエンドロールを少し読みやすくした程度の速度
  const PAUSE_MS = 1000; // 完全に消えてから次が始まるまでの間(約1秒)
  const PEEK_PX = 46; // 開始時点で最初の一文の冒頭が少し見えている量

  const containerHeight = viewport.clientHeight;
  const contentHeight = content.getBoundingClientRect().height;
  const startY = Math.max(containerHeight - PEEK_PX, 0); // 冒頭が少し見えた状態から開始
  const endY = -contentHeight; // 表示エリアの上、完全に抜けきった位置

  const travelMs = ((startY - endY) / SPEED) * 1000;
  const totalMs = travelMs + PAUSE_MS;
  const travelOffset = travelMs / totalMs;

  // リサイズやフォント読み込み完了時の再計算で再生位置が飛ばないよう、
  // 可能なら直前の再生位置(currentTime)を引き継ぐ。
  const prevAnim = creditsEl._creditsAnim;
  let preserveTime = null;
  if (options.preserveTime && prevAnim) {
    preserveTime = prevAnim.currentTime;
  }
  if (prevAnim) {
    prevAnim.cancel();
  }

  const anim = track.animate(
    [
      { transform: `translateY(${startY}px)`, offset: 0 },
      { transform: `translateY(${endY}px)`, offset: travelOffset },
      { transform: `translateY(${endY}px)`, offset: 1 },
    ],
    {
      duration: totalMs,
      iterations: Infinity,
      easing: 'linear',
    }
  );

  creditsEl._creditsAnim = anim;

  if (preserveTime != null) {
    anim.currentTime = preserveTime;
  }

  if (options.autoplay) {
    anim.play();
  } else {
    anim.pause();
  }

  return anim;
}

// オープニング演出(訪問・リロードのたびに毎回再生する)
document.addEventListener('DOMContentLoaded', () => {
  const intro = document.getElementById('intro');
  if (!intro) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    intro.hidden = true;
    return;
  }

  document.body.classList.add('intro-active');
  intro.addEventListener('animationend', (event) => {
    if (event.target !== intro) return;
    intro.hidden = true;
    document.body.classList.remove('intro-active');
  });
});

// 右からスライドインするページパネル
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('sidePanel');
  const backdrop = document.getElementById('sidePanelBackdrop');
  const body = document.getElementById('sidePanelBody');
  const closeBtn = document.getElementById('sidePanelClose');

  if (!panel || !backdrop || !body || !closeBtn) return;

  const openPanel = (sectionId) => {
    const source = document.getElementById(sectionId);
    if (!source) return;

    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    // パネル内では常に表示済み状態にする(スクロール連動のフェードイン対象外のため)
    clone.classList.add('is-visible');
    clone.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));

    body.innerHTML = '';
    body.appendChild(clone);

    // パネルで直接Profileを開いた場合、本編を未スクロールでもエンドロールを再生させる
    clone.querySelectorAll('.credits').forEach((el) => initCredits(el, { autoplay: true }));

    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');
    body.scrollTop = 0;
  };

  const closePanel = () => {
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('panel-open');
  };

  document.querySelectorAll('a[data-panel]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = (link.getAttribute('href') || '').replace('#', '');
      if (!targetId) return;
      event.preventDefault();
      openPanel(targetId);
      history.replaceState(null, '', '#' + targetId);
    });
  });

  const homeLink = document.getElementById('navHome');
  if (homeLink) {
    homeLink.addEventListener('click', (event) => {
      event.preventDefault();
      closePanel();
      const top = document.getElementById('top');
      if (top) top.scrollIntoView({ behavior: 'smooth' });
    });
  }

  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });
});

// モバイルナビゲーションの開閉
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // メニュー内のリンクをクリックしたら閉じる
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // PROFILEのエンドロールは、セクションが画面内に入った瞬間に一度だけ再生を開始する。
  // 制御は常に credits._creditsAnim(その時点の最新のアニメーション)を参照して行い、
  // 古い参照を掴んだままにしないことで「再計算のたびに勝手に再スタートする」事故を防ぐ。
  const credits = document.querySelector('.credits');

  if (credits) {
    initCredits(credits);

    const playCredits = () => {
      if (credits._creditsAnim) credits._creditsAnim.play();
    };

    if ('IntersectionObserver' in window) {
      let hasStarted = false;
      const creditsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            hasStarted = true;
            playCredits();
            creditsObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      creditsObserver.observe(credits);
    } else {
      playCredits();
    }

    // Webフォント読み込み完了後に実際の高さで再計測する
    // (フォールバック書体で測った高さのまま動かすと、後から文字サイズが変わって
    //  終了位置がずれ、途中で止まって見える原因になるため)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        const wasPlaying = credits._creditsAnim && credits._creditsAnim.playState === 'running';
        initCredits(credits, { autoplay: wasPlaying, preserveTime: true });
      });
    }

    // 画面の「横幅」が変わった時だけ再計測する。
    // スマホはスクロール中のアドレスバー開閉で高さだけ変化した resize が
    // 頻繁に発生し、それをそのまま拾うと再生位置が毎回リセットされてしまうため。
    let lastWidth = window.innerWidth;
    let resizeTimer;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const wasPlaying = credits._creditsAnim && credits._creditsAnim.playState === 'running';
        initCredits(credits, { autoplay: wasPlaying, preserveTime: true });
      }, 400);
    });
  }

  // スクロールで要素をフェードインさせる
  const revealTargets = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }
});
