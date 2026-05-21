const APP_URL = "https://script.google.com/macros/s/AKfycbwUbowN3xqZC9k2RFNiVLqQghpDjEwDykjzts2KRgpdNZ-JqmnErjfig3shU3NbMIHx/exec";
               
let trackSelezionata = null;

let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let audioBase64 = null;
let recordTimer;
let secondsRecorded = 0;
const MAX_SECONDS = 40;

function autoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function toggleTheme() {
    const b = document.body; const btn = document.getElementById('themeBtn');
    if (b.getAttribute('data-theme') === 'light') { b.removeAttribute('data-theme'); btn.innerText = '🌙'; }
    else { b.setAttribute('data-theme', 'light'); btn.innerText = '☀️'; }
}
function showModal(t) { document.getElementById('modalText').innerText = t; document.getElementById('modal').style.display = 'flex'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }

let timer;
function handleSearch(el) {
    clearTimeout(timer); const q = el.value.trim(); const resDiv = document.getElementById('results');
    if (q.length < 3) { resDiv.innerHTML = ""; resDiv.style.display = "none"; return; }
    timer = setTimeout(async () => {
        try {
            const [resIT, resUS] = await Promise.all([
                fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10&country=IT`),
                fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10&country=US`)
            ]);
            const dIT = await resIT.json(); const dUS = await resUS.json();
            const combined = [...dIT.results, ...dUS.results];
            const filtered = []; const seen = {};
            combined.forEach(s => {
                const key = (s.trackName + s.artistName).toLowerCase().replace(/\s/g,'');
                if(!seen[key]) { seen[key]=true; filtered.push({n: s.trackName, a: s.artistName}); }
            });
            render(filtered);
        } catch(e) {}
    }, 300);
}

function render(items) {
    const div = document.getElementById('results');
    div.innerHTML = items.slice(0,8).map(i => {
        const safeN = i.n.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeA = i.a.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<div class="result-item" onclick="select('${safeN}', '${safeA}')"><strong>${i.n}</strong> - ${i.a}</div>`;
    }).join('');
    div.style.display = "block";
}

function select(n, a) {
    const temp = document.createElement('div');
    temp.innerHTML = `${n} - ${a}`;
    trackSelezionata = temp.innerText;
    
    document.getElementById('searchSong').style.display = "none";
    document.getElementById('results').style.display = "none";
    document.getElementById('trackName').innerText = trackSelezionata;
    document.getElementById('selectedTrack').style.display = "flex";
}

function clearSong() { 
    trackSelezionata = null; 
    document.getElementById('searchSong').value = "";
    document.getElementById('searchSong').style.display = "block"; 
    document.getElementById('selectedTrack').style.display = "none"; 
    document.getElementById('searchSong').focus(); 
}

document.addEventListener('click', e => { if (e.target !== document.getElementById('searchSong')) document.getElementById('results').style.display = 'none'; });
function mostraRisultati() { if (document.getElementById('results').innerHTML !== "") document.getElementById('results').style.display = 'block'; }

function toggleAudioSection() {
    const w = document.getElementById('audioWrapper');
    w.style.display = w.style.display === 'flex' ? 'none' : 'flex';
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            document.getElementById('audioPlayback').src = audioUrl;
            document.getElementById('audioPlayback').style.display = 'block';
            document.getElementById('deleteAudioBtn').style.display = 'inline-block';
            document.getElementById('recordBtn').style.display = 'none';
            document.getElementById('stopBtn').style.display = 'none';
            document.getElementById('audioTimer').style.color = 'var(--text-color)';
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => { audioBase64 = reader.result; };
            
            stream.getTracks().forEach(track => track.stop());
            document.getElementById('recordBtn').classList.remove('recording');
        };

        mediaRecorder.start();
        secondsRecorded = 0;
        document.getElementById('audioTimer').style.color = '#ef4444';
        document.getElementById('audioTimer').innerText = `00:00 / 00:${MAX_SECONDS}`;
        document.getElementById('recordBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'inline-flex';
        
        recordTimer = setInterval(() => {
            secondsRecorded++;
            let secStr = secondsRecorded < 10 ? "0" + secondsRecorded : secondsRecorded;
            document.getElementById('audioTimer').innerText = `00:${secStr} / 00:${MAX_SECONDS}`;
            if(secondsRecorded >= MAX_SECONDS) stopRecording();
        }, 1000);

    } catch (err) { showModal("Devi consentire l'uso del microfono dal browser per registrare la dedica!"); }
}

function stopRecording() {
    if(mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        clearInterval(recordTimer);
    }
}

function deleteAudio() {
    audioBlob = null; audioBase64 = null;
    document.getElementById('audioPlayback').style.display = 'none';
    document.getElementById('deleteAudioBtn').style.display = 'none';
    document.getElementById('recordBtn').style.display = 'inline-flex';
    document.getElementById('audioTimer').innerText = `00:00 / 00:${MAX_SECONDS}`;
    document.getElementById('audioTimer').style.color = 'var(--text-color)';
}

document.getElementById('requestForm').onsubmit = async (e) => {
    e.preventDefault();
    
    if (!trackSelezionata) { showModal("Per favore, cerca e seleziona una canzone dalla lista suggerita!"); return; }
    if (mediaRecorder && mediaRecorder.state === "recording") { showModal("Ferma prima la registrazione vocale!"); return; }
    
    const btn = document.getElementById('submitBtn'); btn.disabled = true; btn.innerText = "INVIO IN CORSO...";
    
    const payload = { 
        nome: document.getElementById('nome').value, 
        canzone: trackSelezionata, 
        dedica: document.getElementById('dedica').value,
        audio: audioBase64
    };

    try {
        const r = await fetch(APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await r.json();
        showModal(res.message || "Richiesta inviata!");
        document.getElementById('requestForm').reset(); clearSong(); deleteAudio();
        document.getElementById('dedica').style.height = 'auto';
        document.getElementById('audioWrapper').style.display = 'none';
    } catch(e) { showModal("Errore di invio. Riprova."); }
    btn.disabled = false; btn.innerText = "INVIA";
};
