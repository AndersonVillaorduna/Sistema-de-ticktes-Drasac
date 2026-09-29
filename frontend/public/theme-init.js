try {
        var t = localStorage.getItem('drasac_theme_last') || localStorage.getItem('drasac_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
      } catch {}
