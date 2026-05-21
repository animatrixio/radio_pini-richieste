const APP_URL = "https://script.google.com/macros/s/AKfycbwUbowN3xqZC9k2RFNiVLqQghpDjEwDykjzts2KRgpdNZ-JqmnErjfig3shU3NbMIHx/exec";

let richiesteAttive = [];
let richiesteArchiviate = [];
let tipoOrdinamento = 'asc'; 
let loopSincronizzazione = null;


const stiliPlayer = document.createElement('style');
stiliPlayer.innerHTML = `
    .player-avanzato { background: rgba(31, 41, 55, 0.7); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-top: 10px; display: flex; flex-direction: column; gap: 12px; max-width: 360px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); backdrop-filter: blur(5px); }
    body[data-theme="light"] .player-avanzato { background: rgba(0, 0, 0, 0.05); }
    .play-btn-custom { background: var(--primary-color); color: #000; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: transform 0.1s; flex-shrink: 0; }
    .play-btn-custom:hover:not(:disabled) { transform: scale(1.1); }
    .play-btn-custom:active:not(:disabled) { transform: scale(0.95); }
    .play-btn-custom:disabled { opacity: 0.6; cursor: wait; }
    .progress-container-custom { flex-grow: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; cursor: pointer; overflow: hidden; position: relative; }
    body[data-theme="light"] .progress-container-custom { background: rgba(0,0,0,0.1); }
    .progress-bar-custom { width: 0%; height: 100%; background: var(--primary-color); border-radius: 4px; transition: width 0.1s linear; pointer-events: none; }
    .time-display-custom { font-family: monospace; font-size: 0.8rem; color: var(--sub-text); min-width: 85px; text-align: right; }
    .dl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; background-color: #22d3ee; color: #000000; border: none; font-family: inherit; cursor: pointer; font-size: 0.75rem; font-weight: bold; padding: 6px 12px; border-radius: 6px; text-transform: uppercase; transition: all 0.2s; margin-left: auto; box-shadow: 0 2px 6px rgba(34, 211, 238, 0.2); }
    .dl-btn:hover:not(:disabled) { background-color: #06b6d4; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(34, 211, 238, 0.4); }
    .dl-btn:disabled { opacity: 0.7; cursor: wait; }
`;
document.head.appendChild(stiliPlayer);


function toggleMenu() { document.getElementById("myDropdown").classList.toggle("show"); }
window.onclick = function(event) { if (!event.target.matches('.hamburger-btn')) { var dropdowns = document.getElementsByClassName("dropdown-content"); for (var i = 0; i < dropdowns.length; i++) { var openDropdown = dropdowns[i]; if (openDropdown.classList.contains('show')) { openDropdown.classList.remove('show'); } } } }

window.onload = function() {
    if (localStorage.getItem("radioPini_session") === "active") { sbloccaPannello(); } 
    else {
        const savedUser = localStorage.getItem("radioPini_savedUser");
        if (savedUser) { document.getElementById("userInput").value = savedUser; document.getElementById("rememberCheck").checked = true; }
    }
};

function togglePassword() {
    const pwdInput = document.getElementById("passInput"); const eyeBtn = document.querySelector(".btn-eye");
    if (pwdInput.type === "password") { pwdInput.type = "text"; eyeBtn.innerText = "NASCONDI"; } 
    else { pwdInput.type = "password"; eyeBtn.innerText = "MOSTRA"; }
}

async function eseguiLogin(e) {
    e.preventDefault();
    const errBox = document.getElementById("errorBox"); errBox.style.display = "none";
    const user = document.getElementById("userInput").value; const pass = document.getElementById("passInput").value;
    const remember = document.getElementById("rememberCheck").checked;
    const loginBtn = document.querySelector(".btn-login");
    loginBtn.innerText = "ACCESSO IN CORSO..."; loginBtn.disabled = true;

    try {
        const r = await fetch(APP_URL, { method: 'POST', body: JSON.stringify({ action: "login", username: user, password: pass }) });
        const res = await r.json();
        if (res.success) {
            localStorage.setItem("radioPini_session", "active");
            if (remember) { localStorage.setItem("radioPini_savedUser", user); } else { localStorage.removeItem("radioPini_savedUser"); }
            document.getElementById("passInput").value = ""; sbloccaPannello();
        } else { errBox.style.display = "block"; }
    } catch(err) { errBox.innerText = "Errore di connessione."; errBox.style.display = "block"; }
    loginBtn.innerText = "ACCEDI AL PANNELLO"; loginBtn.disabled = false;
}

function sbloccaPannello() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainContainer").style.display = "block";
    document.getElementById("systemMenu").style.display = "block"; 
    avviaOrologio(); caricaRichieste(); loopSincronizzazione = setInterval(caricaRichieste, 5000);
}

function eseguiLogout() { localStorage.removeItem("radioPini_session"); clearInterval(loopSincronizzazione); location.reload(); }

function avviaOrologio() { setInterval(() => { const oraCorrente = new Date(); const ore = String(oraCorrente.getHours()).padStart(2, '0'); const minuti = String(oraCorrente.getMinutes()).padStart(2, '0'); const secondi = String(oraCorrente.getSeconds()).padStart(2, '0'); document.getElementById('liveClock').innerText = `${ore}:${minuti}:${secondi}`; }, 1000); }

function toggleTheme() {
    const b = document.body; const btn = document.querySelector('#myDropdown button');
    if (b.getAttribute('data-theme') === 'light') { b.removeAttribute('data-theme'); btn.innerText = 'Tema 🌙'; }
    else { b.setAttribute('data-theme', 'light'); btn.innerText = 'Tema ☀️'; }
}

async function caricaRichieste() {
    try {
        const r = await fetch(APP_URL); const d = await r.json();
        if(d.success || d.attive) { 
            richiesteAttive = d.data ? d.data.filter(i => i.stato !== "archiviata") : (d.attive || []);
            richiesteArchiviate = d.data ? d.data.filter(i => i.stato === "archiviata") : (d.archiviate || []);
            renderizzaTabella();
            renderizzaTabellaStorico();
        }
    } catch(e) { console.error("Errore sincro:", e); }
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// === DOWNLOAD FORZATO PER EVITARE OCTET-STREAM ===
async function scaricaAudioForzato(btn, audioId, nomeOspite) {
    btn.disabled = true;
    const testoOriginale = btn.innerText;
    btn.innerText = "⏳ Preparazione...";

    try {
        const res = await fetch(APP_URL + "?action=download_mp3&id=" + audioId);
        const textData = await res.text();
        
        if (textData && textData.includes("|") && !textData.includes("Errore")) {
            const parts = textData.split("|");
            const mimeType = parts[0]; 
            const base64String = parts[1];
            
            // Decodifica l'array di byte
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: mimeType});
            const blobUrl = URL.createObjectURL(blob);
            
            // Trova l'estensione corretta
            let estensione = "webm";
            if (mimeType.includes("mp4")) estensione = "mp4";
            else if (mimeType.includes("mp3")) estensione = "mp3";
            else if (mimeType.includes("ogg")) estensione = "ogg";

            const nomeFileCriptato = nomeOspite ? nomeOspite.replace(/[^a-zA-Z0-9]/g, '_') : 'Sconosciuto';
            
            // Crea un link invisibile e forza il download pulito
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Dedica_RadioPini_${nomeFileCriptato}.${estensione}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Pulizia memoria
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        } else {
            alert("File non trovato o corrotto.");
        }
    } catch (e) {
        console.error("Errore download:", e);
        alert("Errore di rete durante il download.");
    }

    btn.innerText = testoOriginale;
    btn.disabled = false;
}

// MOTORE AUDIO 
async function playAudio(rigaId, audioId) {
    const audio = document.getElementById('audio_' + rigaId);
    const playBtn = document.getElementById('btn_play_' + rigaId);
    if (!audio) return;

    // Ferma tutti gli altri
    document.querySelectorAll('audio').forEach(a => { 
        if(a.id !== 'audio_' + rigaId) { 
            a.pause(); 
            a.currentTime = 0; 
            const otherBtn = document.getElementById('btn_play_' + a.id.replace('audio_', ''));
            if (otherBtn) otherBtn.innerText = "▶";
        } 
    });

    // Toggle Play/Pausa se già caricato
    if (audio.dataset.loaded === "true") {
        if (audio.paused) {
            audio.play();
            playBtn.innerText = "⏸";
        } else {
            audio.pause();
            playBtn.innerText = "▶";
        }
        return;
    }

    // Caricamento tramite file virtuale
    playBtn.innerText = "⏳";
    playBtn.disabled = true;

    try {
        const res = await fetch(APP_URL + "?action=download_mp3&id=" + audioId);
        const textData = await res.text();
        
        if (textData && textData.includes("|") && !textData.includes("Errore")) {
            const parts = textData.split("|");
            const mimeType = parts[0]; 
            const base64String = parts[1];
            
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            
            const blob = new Blob([byteArray], {type: mimeType});
            const blobUrl = URL.createObjectURL(blob);
            
            audio.src = blobUrl;
            audio.dataset.loaded = "true";
            
            audio.play();
            playBtn.innerText = "⏸";
        } else {
            alert("L'audio non è disponibile.");
            playBtn.innerText = "▶";
        }
    } catch(e) {
        console.error("Errore audio:", e);
        alert("Errore di rete.");
        playBtn.innerText = "▶";
    }
    playBtn.disabled = false;
}

function updateProgress(audio, index) {
    const progress = document.getElementById(`progress_${index}`);
    const timeDisplay = document.getElementById(`time_${index}`);
    if(audio && audio.duration && isFinite(audio.duration)) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        if(progress) progress.style.width = `${percentage}%`;
        if(timeDisplay) timeDisplay.innerText = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
}

function resetAudioUi(index) {
    const playBtn = document.getElementById(`btn_play_${index}`);
    const progress = document.getElementById(`progress_${index}`);
    const timeDisplay = document.getElementById(`time_${index}`);
    if(playBtn) playBtn.innerText = "▶";
    if(progress) progress.style.width = "0%";
    const audio = document.getElementById(`audio_${index}`);
    if (audio && timeDisplay && audio.duration && isFinite(audio.duration)) { 
        timeDisplay.innerText = `00:00 / ${formatTime(audio.duration)}`; 
    }
}

function seekAudio(e, container) {
    const audioId = container.getAttribute('data-audio-id');
    const audio = document.getElementById(audioId);
    if(!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = percent * audio.duration;
}

// === RENDERING TABELLA ===
function renderizzaTabella() {
    const tbody = document.getElementById('tableBody');
    const counter = document.getElementById('queueCounter');
    
    if (richiesteAttive.length > 0) {
        counter.innerText = richiesteAttive.length;
        counter.style.display = 'inline-block';
    } else {
        counter.style.display = 'none';
    }

    if(richiesteAttive.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Nessuna nuova richiesta in coda.</td></tr>`; 
        return; 
    }
    
    let datiOrdinati = [...richiesteAttive];
    const getRowKey = (i) => i.rowNum || i.riga;
    
    if (tipoOrdinamento === 'asc') datiOrdinati.sort((a, b) => new Date(a.dataOra) - new Date(b.dataOra) || getRowKey(a) - getRowKey(b));
    else datiOrdinati.sort((a, b) => new Date(b.dataOra) - new Date(a.dataOra) || getRowKey(b) - getRowKey(a));

    tbody.innerHTML = datiOrdinati.map(i => {
        const rigaId = getRowKey(i);
        const audioId = (i.audio_id && String(i.audio_id).trim() !== "" && !String(i.audio_id).includes("Errore")) ? String(i.audio_id).trim() : null;
        const testoDedica = (i.dedica && String(i.dedica).trim() !== "") ? String(i.dedica).trim() : null;
        
        // Protezione nome per evitare apici che rompono il JS
        const nomeSicuro = i.nome ? i.nome.replace(/'/g, "\\'") : 'Sconosciuto';

        let audioHtml = '';
        if (audioId) {
            audioHtml = `
                <div class="player-avanzato">
                    <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                        <button type="button" id="btn_play_${rigaId}" onclick="playAudio('${rigaId}', '${audioId}')" class="play-btn-custom" title="Play / Pausa">▶</button>
                        
                        <div class="progress-container-custom" data-audio-id="audio_${rigaId}" onclick="seekAudio(event, this)">
                            <div id="progress_${rigaId}" class="progress-bar-custom"></div>
                        </div>
                        
                        <span id="time_${rigaId}" class="time-display-custom">00:00 / 00:00</span>
                    </div>
                    
                    <div style="display: flex; margin-top: 4px;">
                        <button type="button" onclick="scaricaAudioForzato(this, '${audioId}', '${nomeSicuro}')" class="dl-btn" title="Scarica il file originale">
                            📥 Download
                        </button>
                    </div>
                    
                    <audio id="audio_${rigaId}" style="display: none;" ontimeupdate="updateProgress(this, '${rigaId}')" onended="resetAudioUi('${rigaId}')"></audio>
                </div>
            `;
        }

        let dedicaHtml = '';
        if (testoDedica && audioHtml) { dedicaHtml = `<div style="font-style: italic; font-size: 0.95rem; line-height: 1.4; color: var(--text-color);">"${testoDedica}"</div>${audioHtml}`; } 
        else if (testoDedica) { dedicaHtml = `<div style="font-style: italic; font-size: 0.95rem; line-height: 1.4; color: var(--text-color);">"${testoDedica}"</div>`; } 
        else if (audioHtml) { dedicaHtml = audioHtml; } 
        else { dedicaHtml = `<span style="opacity: 0.4; font-style: italic;">- nessuna dedica -</span>`; }

        return `
            <tr>
                <td><strong>${i.nome || 'Sconosciuto'}</strong></td>
                <td>${i.canzone || 'N/D'}</td>
                <td class="msg-cell">${dedicaHtml}</td>
                <td>${i.dataOra || ''}</td>
                <td style="text-align: center;">
                    <button class="btn-inonda" onclick="mandaInOnda(${rigaId})">IN ONDA</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderizzaTabellaStorico() {
    const tbody = document.getElementById('storicoBody');
    if(richiesteArchiviate.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Nessun brano archiviato.</td></tr>`; return; }
    
    const getRowKey = (i) => i.rowNum || i.riga;
    let datiOrdinati = [...richiesteArchiviate].sort((a, b) => new Date(b.dataOra) - new Date(a.dataOra) || getRowKey(b) - getRowKey(a));

    tbody.innerHTML = datiOrdinati.map(i => `
        <tr>
            <td><strong>${i.nome}</strong></td>
            <td>${i.canzone}</td>
            <td class="msg-cell">${i.dedica ? `"${i.dedica}"` : ''}</td>
            <td>${i.dataOra}</td>
        </tr>
    `).join('');
}

function mandaInOnda(numeroRiga) {
    if(event && event.target) { event.target.disabled = true; event.target.innerText = "..."; }
    fetch(APP_URL, { method: 'POST', body: JSON.stringify({ action: "archive", row: numeroRiga }) })
    .then(() => caricaRichieste())
    .catch(() => alert("Errore di connessione."));
}

function apriStorico() { document.getElementById('modalStorico').style.display = 'flex'; }
function chiudiStorico() { document.getElementById('modalStorico').style.display = 'none'; }

function apriModal(testo, tipo, callbackConferma) {
    document.getElementById('modalText').innerText = testo; const wrapper = document.getElementById('modalButtons'); wrapper.innerHTML = ''; 
    if (tipo === 'confirm') {
        const btnAnnulla = document.createElement('button'); btnAnnulla.className = 'modal-btn btn-secondary'; btnAnnulla.innerText = 'ANNULLA'; btnAnnulla.onclick = chiudiModal;
        const btnConferma = document.createElement('button'); btnConferma.className = 'modal-btn btn-primary'; btnConferma.innerText = 'CONFERMA'; btnConferma.onclick = function() { chiudiModal(); if(callbackConferma) callbackConferma(); };
        wrapper.appendChild(btnAnnulla); wrapper.appendChild(btnConferma);
    } else {
        const btnOk = document.createElement('button'); btnOk.className = 'modal-btn btn-primary'; btnOk.innerText = 'OK'; btnOk.onclick = chiudiModal; wrapper.appendChild(btnOk);
    }
    document.getElementById('customModal').style.display = 'flex';
}
function chiudiModal() { document.getElementById('customModal').style.display = 'none'; }
function toggleOrdinamento() { tipoOrdinamento = (tipoOrdinamento === 'asc') ? 'desc' : 'asc'; document.getElementById('sortIcon').innerText = (tipoOrdinamento === 'asc') ? '🔼' : '🔽'; renderizzaTabella(); }

function confermaCancellaTutto() {
    apriModal("ATTENZIONE:\nSei sicuro di voler svuotare TUTTO? Cancellerai le richieste attive e l'intero storico.", "confirm", async function() {
        try {
            await fetch(APP_URL, { method: 'POST', body: JSON.stringify({ action: "clear_all" }) });
            caricaRichieste();
        } catch(e) { apriModal("Errore di connessione.", "alert"); }
    });
}