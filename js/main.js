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
