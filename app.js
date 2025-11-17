// app.js — controle de volume global, persistência e utilidades de audio
(function(){
  const STORAGE_KEY = 'liad_sonoplastia_settings_v1';
  let settings = { volume: 0.9, muted: false };

  try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) settings = Object.assign(settings, JSON.parse(raw)); }catch(e){/* ignore */}

  // expose helpers no escopo global para uso pelos HTMLs das páginas
  window.LIAD = {
    settings,
    save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); },

    applyVolumeToAudioElement(audioEl){
      if(!audioEl) return;
      audioEl.volume = settings.muted ? 0 : settings.volume;
    }
  };
  // UI helpers: update mute button and body class across pages
  window.LIAD.updateMuteUI = function() {
    try {
      const isMuted = window.LIAD.settings.muted;
      // toggle body class
      if(isMuted) document.body.classList.add('muted'); else document.body.classList.remove('muted');
      // update any mute buttons on the page
      const mbtn = document.getElementById('muteBtn');
      if(mbtn){
        mbtn.setAttribute('aria-pressed', !!isMuted);
        mbtn.classList.toggle('muted', !!isMuted);
        mbtn.textContent = isMuted ? '🔇' : '🔊';
      }
      // update stopAll appearance maybe (no change now)
    } catch(e) { /* ignore in pages that don't have DOM ready */ }
  };

  // helper to clear playing classes (used by Stop All or other actions)
  window.LIAD.clearAllPlayingVisuals = function() {
    document.querySelectorAll('.sound-btn.playing').forEach(b=>b.classList.remove('playing'));
  };

  // preenche rodapé com ano
  document.addEventListener('DOMContentLoaded', ()=>{
    const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
    // Ensure UI is synced at DOM ready
    if(window.LIAD && window.LIAD.updateMuteUI) window.LIAD.updateMuteUI();
  });
})();

// Audio Engine (módulo utilitário que será importado pelas páginas)
(function(global){
  // detect WebAudio
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const hasWebAudio = !!AudioCtx;

  function createEngine(){
    if(hasWebAudio){
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = (global.LIAD && !global.LIAD.settings.muted) ? global.LIAD.settings.volume : 0;
      masterGain.connect(ctx.destination);

      return {
        type:'webaudio',
        ctx,
        masterGain,
        setVolume(v){ masterGain.gain.value = v; },
        setMuted(m){ masterGain.gain.value = m ? 0 : (global.LIAD ? global.LIAD.settings.volume : 1); },
        async loadBuffer(url){
          const res = await fetch(url);
          const arr = await res.arrayBuffer();
          return ctx.decodeAudioData(arr);
        },
        playBuffer(buffer){
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(masterGain);
          src.start(0);
          return src;
        }
      };
    }else{
      return {
        type:'htmlaudio',
        setVolume(v){},
        setMuted(m){},
        async loadAudio(url){
          const a = new Audio(url);
          a.preload = 'auto';
          a.volume = (global.LIAD && !global.LIAD.settings.muted) ? global.LIAD.settings.volume : 0;
          return a;
        },
        playAudioElement(audioEl){
          const clone = audioEl.cloneNode(true);
          clone.volume = (global.LIAD && !global.LIAD.settings.muted) ? global.LIAD.settings.volume : 0;
          clone.play();
          return clone;
        }
      };
    }
  }

  global.AudioEngineFactory = { createEngine };
})(window);
