let fotosMemoria = [];

// --- GPS COMPLETO ---
async function pegarGPS() {
    const campo = document.getElementById('local');
    campo.value = "📍 Localizando...";
    navigator.geolocation.getCurrentPosition(async (p) => {
        const { latitude: lat, longitude: lon } = p.coords;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            campo.value = data.display_name;
        } catch { campo.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`; }
    }, () => alert("Ative o GPS"), { enableHighAccuracy: true });
}

// --- DITADO ---
const Recon = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recon) {
    const rec = new Recon(); rec.lang = 'pt-BR'; rec.continuous = true;
    const btn = document.getElementById('btn-voz');
    btn.onclick = () => btn.classList.contains('recording') ? rec.stop() : rec.start();
    rec.onstart = () => { btn.classList.add('recording'); btn.style.background = "#22c55e"; };
    rec.onend = () => { btn.classList.remove('recording'); btn.style.background = "#ef4444"; };
    rec.onresult = (e) => { document.getElementById('relato').value += ' ' + e.results[e.results.length - 1][0].transcript; };
}

// --- FOTOS ---
async function processarFotos(e) {
    const grid = document.getElementById('p-grid');
    for (let file of e.target.files) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 800; canvas.height = (img.height * 800) / img.width;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const b64 = canvas.toDataURL('image/jpeg', 0.7);
                fotosMemoria.push(b64);
                grid.innerHTML += `<img src="${b64}" style="width:40px;height:40px;object-fit:cover;border-radius:5px">`;
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// --- SALVAR / EDITAR ---
function salvar() {
    const t = document.getElementById('titulo').value;
    const r = document.getElementById('relato').value;
    const l = document.getElementById('local').value;
    const editId = document.getElementById('edit-id').value;
    if(!t || !r) return alert("Preencha os campos!");
    let b = JSON.parse(localStorage.getItem('paulo_db_vF')) || [];
    if(editId) {
        const i = b.findIndex(x => x.id == editId);
        b[i] = { ...b[i], t, r, l, f: [...fotosMemoria] };
    } else {
        b.unshift({ id: Date.now(), t, r, l, f: [...fotosMemoria], dt: new Date().toLocaleDateString('pt-BR'), hr: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) });
    }
    localStorage.setItem('paulo_db_vF', JSON.stringify(b));
    cancelarEdicao(); render();
    mudarAba('lista', document.querySelectorAll('.nav-item')[1]);
}

// --- COMPARTILHAR WHATSAPP ---
function compartilharWhats(id) {
    const e = JSON.parse(localStorage.getItem('paulo_db_vF')).find(x => x.id === id);
    const txt = `*RELATÓRIO TÉCNICO*%0A*Assunto:* ${e.t}%0A*Data:* ${e.dt}%0A*Local:* ${e.l}%0A%0A*Relato:*%0A${e.r}`;
    window.open(`https://api.whatsapp.com/send?text=${txt}`, '_blank');
}

function render() {
    const d = JSON.parse(localStorage.getItem('paulo_db_vF')) || [];
    document.getElementById('lista').innerHTML = d.map(e => `
        <div class="entry-card">
            <h3>${e.t}</h3>
            <p style="font-size:0.7rem; color:var(--accent)">📍 ${e.l}</p>
            <p style="white-space:pre-wrap; font-size:0.85rem;">${e.r}</p>
            <div class="galeria-app">${e.f.map(img => `<img src="${img}">`).join('')}</div>
            <div class="actions">
                <button class="btn-act" style="background:#25d366" onclick="compartilharWhats(${e.id})">WHATSAPP</button>
                <button class="btn-act" style="background:#2b579a" onclick="baixarWord(${e.id})">WORD</button>
                <button class="btn-act" style="background:#f59e0b" onclick="prepararEdicao(${e.id})">EDITAR</button>
                <button class="btn-act" style="background:#64748b" onclick="excluir(${e.id})">APAGAR</button>
            </div>
        </div>
    `).join('');
}

function prepararEdicao(id) {
    const e = JSON.parse(localStorage.getItem('paulo_db_vF')).find(x => x.id === id);
    document.getElementById('edit-id').value = e.id;
    document.getElementById('titulo').value = e.t;
    document.getElementById('local').value = e.l;
    document.getElementById('relato').value = e.r;
    fotosMemoria = [...e.f];
    document.getElementById('p-grid').innerHTML = fotosMemoria.map(img => `<img src="${img}" style="width:40px;height:40px;object-fit:cover;border-radius:5px">`).join('');
    document.getElementById('btn-save').innerText = "ATUALIZAR RELATÓRIO";
    mudarAba('novo', document.querySelectorAll('.nav-item')[0]);
}

function baixarWord(id) {
    const e = JSON.parse(localStorage.getItem('paulo_db_vF')).find(x => x.id === id);
    const blob = new Blob(['\ufeff' + `RELATÓRIO TÉCNICO\n\nASSUNTO: ${e.t}\nDATA: ${e.dt}\nLOCAL: ${e.l}\n\nRELATO:\n${e.r}`], { type: 'application/msword' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Relatorio_${e.id}.doc`; link.click();
}

function cancelarEdicao() {
    document.getElementById('edit-id').value = ""; document.getElementById('titulo').value = "";
    document.getElementById('local').value = ""; document.getElementById('relato').value = "";
    document.getElementById('p-grid').innerHTML = ""; fotosMemoria = [];
    document.getElementById('btn-save').innerText = "GRAVAR NO SISTEMA";
}

function excluir(id) { if(confirm("Apagar permanentemente?")) { let b = JSON.parse(localStorage.getItem('paulo_db_vF')).filter(x => x.id != id); localStorage.setItem('paulo_db_vF', JSON.stringify(b)); render(); } }
document.addEventListener('DOMContentLoaded', render);