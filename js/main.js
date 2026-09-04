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

  const SPEED = 42; // px/秒。映画のエンドロールくらいの速度
  const PAUSE_MS = 3000; // 抜けきってから次が登場するまでの間

  const containerHeight = viewport.clientHeight;
  const contentHeight = content.getBoundingClientRect().height;
  const startY = containerHeight; // 表示エリアの下、完全に見えない位置
  const endY = -contentHeight; // 表示エリアの上、完全に抜けきった位置

  const travelMs = ((startY - endY) / SPEED) * 1000;
  const totalMs = travelMs + PAUSE_MS;
  const travelOffset = travelMs / totalMs;

  if (creditsEl._creditsAnim) {
    creditsEl._creditsAnim.cancel();
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

  // PROFILEのエンドロールは、セクションが画面内に入った瞬間から再生を開始する
  const credits = document.querySelector('.credits');

  if (credits) {
    const anim = initCredits(credits);

    if (anim && 'IntersectionObserver' in window) {
      const creditsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anim.play();
            creditsObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      creditsObserver.observe(credits);
    }

    // 画面サイズが変わったら実測し直す(向き変更・ウィンドウリサイズ対応)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const wasPlaying = credits._creditsAnim && credits._creditsAnim.playState === 'running';
        initCredits(credits, { autoplay: wasPlaying });
      }, 250);
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
