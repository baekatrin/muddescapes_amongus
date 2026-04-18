// Signal Monitor MQTT Connection and Bar Rendering
(function () {

  const CONFIG = {
    broker:        'wss://broker.hivemq.com:8884/mqtt',
    clientId:      'signal-monitor-' + Math.random().toString(16).slice(2, 8),
    topicBar1:     'victor/bar1',
    topicBar2:     'victor/bar2',
    topicSolved:   'victor/solved',
    segments:      10,
    bar1LitColor:  '#185fa5',   // coherence lit segment
    bar1DimColor:  '#0d1e33',   // coherence unlit segment
    bar2LitColor:  '#993556',   // censorship lit segment
    bar2DimColor:  '#1a0d14',   // censorship unlit segment
    solvedBar1Min: 95,          // bar1 % threshold to count as solved
    solvedBar2Max: 5,           // bar2 % threshold to count as solved
  };

  // Build star field
  const starContainer = document.getElementById('sm-stars');
  if (starContainer) {
    for (let i = 0; i < 55; i++) {
      const s = document.createElement('div');
      s.className = 'sm-star';
      const sz = Math.random() < 0.15 ? 2 : 1;
      s.style.cssText = [
        'width:'   + sz + 'px',
        'height:'  + sz + 'px',
        'top:'     + (Math.random() * 100).toFixed(1) + '%',
        'left:'    + (Math.random() * 100).toFixed(1) + '%',
        'opacity:' + (0.1 + Math.random() * 0.4).toFixed(2),
      ].join(';');
      starContainer.appendChild(s);
    }
  }

  // Build bar segments
  function buildBar(trackId) {
    const track = document.getElementById(trackId);
    if (!track) return;
    track.innerHTML = '';
    for (let i = 0; i < CONFIG.segments; i++) {
      const seg = document.createElement('div');
      seg.className = 'sm-seg';
      seg.id = trackId + '-s' + i;
      track.appendChild(seg);
    }
  }

  buildBar('sm-bar1-track');
  buildBar('sm-bar2-track');

  // Render bar based on percentage
  function renderBar(trackId, pct, litColor, dimColor) {
    const lit = Math.round((Math.min(100, Math.max(0, pct)) / 100) * CONFIG.segments);
    for (let i = 0; i < CONFIG.segments; i++) {
      const el = document.getElementById(trackId + '-s' + i);
      if (el) el.style.background = i < lit ? litColor : dimColor;
    }
  }

  let bar1Val = 0;
  let bar2Val = 0;

  function render(b1, b2) {
    bar1Val = Math.round(b1);
    bar2Val = Math.round(b2);
    document.getElementById('sm-bar1-pct').textContent = bar1Val;
    document.getElementById('sm-bar2-pct').textContent = bar2Val;
    renderBar('sm-bar1-track', bar1Val, CONFIG.bar1LitColor, CONFIG.bar1DimColor);
    renderBar('sm-bar2-track', bar2Val, CONFIG.bar2LitColor, CONFIG.bar2DimColor);
  }

  function setSolved(solved) {
    const el = document.getElementById('sm-solved');
    if (el) {
      el.className = 'sm-solved' + (solved ? ' show' : '');
    }
  }

  function setStatus(state) {
    const dot   = document.getElementById('sm-dot');
    const label = document.getElementById('sm-conn-label');
    if (!dot || !label) return;
    
    if (state === 'connecting') {
      dot.className = 'sm-dot connecting';
      label.style.color = '#ba7517';
      label.textContent = 'connecting to uplink...';
    } else if (state === 'live') {
      dot.className = 'sm-dot live';
      label.style.color = '#1d9e75';
      label.textContent = 'uplink established';
    } else {
      dot.className = 'sm-dot error';
      label.style.color = '#a32d2d';
      label.textContent = 'uplink lost — retrying';
    }
  }

  // MQTT Connection
  const client = mqtt.connect(CONFIG.broker, {
    clientId:       CONFIG.clientId,
    clean:          true,
    reconnectPeriod: 3000,
  });

  client.on('connect', () => {
    console.log('MQTT Connected');
    setStatus('live');
    client.subscribe([CONFIG.topicBar1, CONFIG.topicBar2, CONFIG.topicSolved], {
      onSuccess: () => {
        console.log('Subscribed to signal topics');
      }
    });
  });

  client.on('message', (topic, payload) => {
    const val = payload.toString().trim();
    console.log(`MQTT: ${topic} = ${val}`);
    
    if (topic === CONFIG.topicBar1) {
      render(parseInt(val, 10), bar2Val);
    } else if (topic === CONFIG.topicBar2) {
      render(bar1Val, parseInt(val, 10));
    } else if (topic === CONFIG.topicSolved) {
      const isSolved = val === 'true';
      setSolved(isSolved);
      window.MQTT_SOLVED = isSolved; // Expose to puzzle progression system
    }
  });

  client.on('reconnect', () => {
    console.log('MQTT Reconnecting...');
    setStatus('error');
  });
  
  client.on('offline',   () => {
    console.log('MQTT Offline');
    setStatus('error');
  });
  
  client.on('error', (error) => {
    console.error('MQTT Error:', error);
    setStatus('error');
  });

  // Initial state
  render(0, 0);
  setStatus('connecting');

})();

