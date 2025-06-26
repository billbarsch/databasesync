const { ipcRenderer } = require('electron');

// Carregar status das configurações quando a página é carregada
window.addEventListener('DOMContentLoaded', async () => {
    await updateConnectionStatus();
});

// Função para abrir janela de configuração
function openConfig() {
    // Esta função será chamada pelo menu principal
    console.log('Abrindo configurações...');
}

// Função para abrir janela de comparação
function openCompare() {
    // Esta função será chamada pelo menu principal
    console.log('Abrindo comparação...');
}

// Função para abrir janela de histórico
function openHistory() {
    // Esta função será chamada pelo menu principal
    console.log('Abrindo histórico...');
}

// Atualizar status das conexões
async function updateConnectionStatus() {
    try {
        const { config1, config2 } = await ipcRenderer.invoke('get-config');

        const status1 = document.getElementById('status1');
        const status2 = document.getElementById('status2');
        const db1Info = document.getElementById('db1-info');
        const db2Info = document.getElementById('db2-info');
        const compareBtn = document.getElementById('compare-btn');

        // Atualizar status do banco 1
        if (config1) {
            status1.textContent = '✅';
            db1Info.textContent = `${config1.user}@${config1.host}:${config1.port}/${config1.database}`;
        } else {
            status1.textContent = '❌';
            db1Info.textContent = 'Não configurado';
        }

        // Atualizar status do banco 2
        if (config2) {
            status2.textContent = '✅';
            db2Info.textContent = `${config2.user}@${config2.host}:${config2.port}/${config2.database}`;
        } else {
            status2.textContent = '❌';
            db2Info.textContent = 'Não configurado';
        }

        // Habilitar/desabilitar botão de comparação
        if (config1 && config2) {
            compareBtn.disabled = false;
            compareBtn.classList.remove('btn-secondary');
            compareBtn.classList.add('btn-primary');
        } else {
            compareBtn.disabled = true;
            compareBtn.classList.remove('btn-primary');
            compareBtn.classList.add('btn-secondary');
        }

    } catch (error) {
        console.error('Erro ao carregar status das configurações:', error);
    }
}

// Escutar eventos de atualização de configuração
ipcRenderer.on('config-updated', () => {
    updateConnectionStatus();
});

// Atualizar status a cada 5 segundos
setInterval(updateConnectionStatus, 5000); 