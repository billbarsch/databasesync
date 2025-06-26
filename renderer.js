const { ipcRenderer } = require('electron');

// Carregar status das configurações quando a página é carregada
window.addEventListener('DOMContentLoaded', async () => {
    await loadProjectsList();
    await updateConnectionStatus();

    // Configurar event listeners
    setupProjectEventListeners();
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

// Função para abrir janela de projetos
async function openProjects() {
    console.log('📁 Solicitando abertura da janela de projetos...');
    try {
        await ipcRenderer.invoke('open-projects-window');
        console.log('✅ Janela de projetos solicitada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao abrir janela de projetos:', error);
    }
}

// Configurar event listeners dos projetos
function setupProjectEventListeners() {
    // Seleção de projeto
    document.getElementById('projectSelect').addEventListener('change', handleProjectSelection);

    // Botão gerenciar projetos
    document.getElementById('manageProjectsBtn').addEventListener('click', openProjects);
}

// Carregar lista de projetos
async function loadProjectsList() {
    try {
        const [projectsResponse, currentProjectResponse] = await Promise.all([
            ipcRenderer.invoke('get-all-projects'),
            ipcRenderer.invoke('get-current-project')
        ]);

        const projectSelect = document.getElementById('projectSelect');
        projectSelect.innerHTML = '<option value="">Selecione um projeto...</option>';

        if (projectsResponse.success && projectsResponse.data.length > 0) {
            projectsResponse.data.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });

            // Selecionar projeto atual
            if (currentProjectResponse.success && currentProjectResponse.project) {
                projectSelect.value = currentProjectResponse.project.id;
                updateCurrentProjectInfo(currentProjectResponse.project);
            }
        } else {
            projectSelect.innerHTML = '<option value="">Nenhum projeto encontrado</option>';
            updateCurrentProjectInfo(null);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar lista de projetos:', error);
        const projectSelect = document.getElementById('projectSelect');
        projectSelect.innerHTML = '<option value="">Erro ao carregar projetos</option>';
        updateCurrentProjectInfo(null);
    }
}

// Atualizar informações do projeto atual
function updateCurrentProjectInfo(project) {
    const projectNameEl = document.querySelector('.project-name');
    const projectDescEl = document.querySelector('.project-description');

    if (project) {
        projectNameEl.textContent = `📁 ${project.name}`;
        projectDescEl.textContent = project.description || 'Sem descrição';
    } else {
        projectNameEl.textContent = '📁 Nenhum projeto selecionado';
        projectDescEl.textContent = 'Selecione um projeto para começar';
    }
}

// Manipular seleção de projeto
async function handleProjectSelection(event) {
    const projectId = parseInt(event.target.value);

    if (!projectId) {
        updateCurrentProjectInfo(null);
        return;
    }

    try {
        const response = await ipcRenderer.invoke('select-project', projectId);
        if (response.success) {
            updateCurrentProjectInfo(response.project);

            // Recarregar status das conexões para o novo projeto
            await updateConnectionStatus();

            showMessage(`Projeto "${response.project.name}" selecionado!`, 'success');
        } else {
            showMessage('Erro ao selecionar projeto: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao selecionar projeto:', error);
        showMessage('Erro ao selecionar projeto', 'error');
    }
}

// Função removida - funcionalidade movida para tela de gerenciamento

// Mostrar mensagem
function showMessage(message, type = 'info') {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;

    // Inserir no topo da página
    document.querySelector('.container').insertBefore(messageDiv, document.querySelector('header').nextSibling);

    // Remover após 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
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