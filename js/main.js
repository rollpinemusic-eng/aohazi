// オープニング演出(初回訪問時のみ再生し、以降はスキップする)
document.addEventListener('DOMContentLoaded', () => {
  const intro = document.getElementById('intro');
  const alreadySkipped = document.documentElement.classList.contains('intro-skip');
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (intro) {
    if (alreadySkipped || reducedMotion) {
      intro.hidden = true;
      try {
        localStorage.setItem('aohaziIntroSeen', '1');
      } catch (e) {}
    } else {
      document.body.classList.add('intro-active');
      intro.addEventListener('animationend', (event) => {
        if (event.target !== intro) return;
        intro.hidden = true;
        document.body.classList.remove('intro-active');
        try {
          localStorage.setItem('aohaziIntroSeen', '1');
        } catch (e) {}
      });
    }
  }
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
