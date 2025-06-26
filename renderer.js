const { ipcRenderer } = require('electron');

// Carregar status das configurações quando a página é carregada
window.addEventListener('DOMContentLoaded', async () => {
    await updateConnectionStatus();
});

// Função para abrir janela de configuração
async function openConfig() {
    console.log('🔧 Solicitando abertura da janela de configuração...');
    try {
        await ipcRenderer.invoke('open-config-window');
        console.log('✅ Janela de configuração solicitada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao abrir janela de configuração:', error);
    }
}

// Função para abrir janela de comparação
async function openCompare() {
    console.log('📊 Solicitando abertura da janela de comparação...');
    try {
        await ipcRenderer.invoke('open-compare-window');
        console.log('✅ Janela de comparação solicitada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao abrir janela de comparação:', error);
    }
}

// Função para abrir janela de histórico
async function openHistory() {
    console.log('📈 Solicitando abertura da janela de histórico...');
    try {
        await ipcRenderer.invoke('open-history-window');
        console.log('✅ Janela de histórico solicitada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao abrir janela de histórico:', error);
    }
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
            db1Info.textContent = `${config1.connectionName || 'Banco 1'}: ${config1.user}@${config1.host}:${config1.port}/${config1.database}`;
        } else {
            status1.textContent = '❌';
            db1Info.textContent = 'Não configurado';
        }

        // Atualizar status do banco 2
        if (config2) {
            status2.textContent = '✅';
            db2Info.textContent = `${config2.connectionName || 'Banco 2'}: ${config2.user}@${config2.host}:${config2.port}/${config2.database}`;
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