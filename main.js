const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const dbManager = require('./database');

let mainWindow;
let configWindow;
let compareWindow;
let historyWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    mainWindow.loadFile('index.html');

    // Menu principal
    const menu = Menu.buildFromTemplate([
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Configurar Conexões',
                    click: () => openConfigWindow()
                },
                {
                    label: 'Comparar Tabelas',
                    click: () => openCompareWindow(),
                    enabled: false,
                    id: 'compare-menu'
                },
                {
                    label: 'Histórico de Comparações',
                    click: () => openHistoryWindow()
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Sobre Database Sync',
                            message: 'Database Sync v1.0.0',
                            detail: 'Aplicação para sincronização e comparação de bancos de dados MySQL'
                        });
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}

function openConfigWindow() {
    console.log('🚀 Tentando abrir janela de configuração...');

    if (configWindow) {
        console.log('⚡ Janela já existe, dando foco...');
        configWindow.focus();
        return;
    }

    try {
        console.log('📱 Criando nova janela de configuração...');
        configWindow = new BrowserWindow({
            width: 600,
            height: 500,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        console.log('📄 Carregando config.html...');
        configWindow.loadFile('config.html');

        configWindow.on('closed', () => {
            console.log('❌ Janela de configuração fechada');
            configWindow = null;
        });

        configWindow.on('ready-to-show', () => {
            console.log('✅ Janela de configuração pronta e visível');
        });

        console.log('🎉 Janela de configuração criada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao criar janela de configuração:', error);
    }
}

function openCompareWindow() {
    if (compareWindow) {
        compareWindow.focus();
        return;
    }

    compareWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    compareWindow.loadFile('compare.html');

    compareWindow.on('closed', () => {
        compareWindow = null;
    });
}

function openHistoryWindow() {
    if (historyWindow) {
        historyWindow.focus();
        return;
    }

    historyWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    historyWindow.loadFile('history.html');

    historyWindow.on('closed', () => {
        historyWindow = null;
    });
}

// IPC Handlers
ipcMain.handle('test-connection', async (event, config) => {
    try {
        const connection = await mysql.createConnection(config);
        await connection.execute('SELECT 1');
        await connection.end();
        return { success: true, message: 'Conexão realizada com sucesso!' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('save-config', async (event, config1, config2) => {
    try {
        // Salvar configurações no SQLite
        await dbManager.saveDbConfig('database1', config1);
        await dbManager.saveDbConfig('database2', config2);

        // Ativar menu de comparação
        const menu = Menu.getApplicationMenu();
        const compareMenuItem = menu.getMenuItemById('compare-menu');
        if (compareMenuItem) {
            compareMenuItem.enabled = true;
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-config', async () => {
    try {
        const config1 = await dbManager.getDbConfig('database1');
        const config2 = await dbManager.getDbConfig('database2');

        return { config1, config2 };
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        return { config1: null, config2: null };
    }
});

ipcMain.handle('get-tables-comparison', async () => {
    try {
        const dbConfig1 = await dbManager.getDbConfig('database1');
        const dbConfig2 = await dbManager.getDbConfig('database2');

        if (!dbConfig1 || !dbConfig2) {
            return { success: false, message: 'Configurações de banco não encontradas' };
        }

        const conn1 = await mysql.createConnection(dbConfig1);
        const conn2 = await mysql.createConnection(dbConfig2);

        // Obter tabelas do banco 1
        const [tables1] = await conn1.execute('SHOW TABLES');
        const tableNames1 = tables1.map(row => Object.values(row)[0]);

        // Obter tabelas do banco 2
        const [tables2] = await conn2.execute('SHOW TABLES');
        const tableNames2 = tables2.map(row => Object.values(row)[0]);

        // Obter todas as tabelas únicas
        const allTables = [...new Set([...tableNames1, ...tableNames2])];

        const comparison = [];

        for (const tableName of allTables) {
            let count1 = 0;
            let count2 = 0;
            let exists1 = tableNames1.includes(tableName);
            let exists2 = tableNames2.includes(tableName);

            if (exists1) {
                const [result1] = await conn1.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                count1 = result1[0].count;
            }

            if (exists2) {
                const [result2] = await conn2.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                count2 = result2[0].count;
            }

            comparison.push({
                tableName,
                count1,
                count2,
                exists1,
                exists2,
                different: count1 !== count2 || exists1 !== exists2
            });
        }

        await conn1.end();
        await conn2.end();

        // Salvar no histórico
        await dbManager.saveComparisonHistory(
            dbConfig1.database,
            dbConfig2.database,
            comparison,
            dbConfig1.connectionName || dbConfig1.database,
            dbConfig2.connectionName || dbConfig2.database
        );

        return {
            success: true,
            data: comparison,
            db1Name: dbConfig1.database,
            db2Name: dbConfig2.database,
            db1DisplayName: dbConfig1.connectionName || dbConfig1.database,
            db2DisplayName: dbConfig2.connectionName || dbConfig2.database
        };
    } catch (error) {
        console.error('Erro na comparação:', error);
        return { success: false, message: error.message };
    }
});

// Handlers para abrir janelas via IPC
ipcMain.handle('open-config-window', async () => {
    console.log('📱 IPC: Abrindo janela de configuração...');
    openConfigWindow();
    return { success: true };
});

ipcMain.handle('open-compare-window', async () => {
    console.log('📱 IPC: Abrindo janela de comparação...');
    openCompareWindow();
    return { success: true };
});

ipcMain.handle('open-history-window', async () => {
    console.log('📱 IPC: Abrindo janela de histórico...');
    openHistoryWindow();
    return { success: true };
});

// Novos handlers para SQLite
ipcMain.handle('get-comparison-history', async (event, limit = 10) => {
    try {
        const history = await dbManager.getComparisonHistory(limit);
        return { success: true, data: history };
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-all-db-configs', async () => {
    try {
        const configs = await dbManager.getAllDbConfigs();
        return { success: true, data: configs };
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('set-app-setting', async (event, key, value) => {
    try {
        await dbManager.setSetting(key, value);
        return { success: true };
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-app-setting', async (event, key, defaultValue = null) => {
    try {
        const value = await dbManager.getSetting(key, defaultValue);
        return { success: true, value };
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        return { success: false, value: defaultValue };
    }
});

// Inicializar banco de dados e aplicação
app.whenReady().then(async () => {
    try {
        await dbManager.initialize();
        console.log('Database SQLite inicializado com sucesso');
        createMainWindow();
    } catch (error) {
        console.error('Erro ao inicializar database:', error);
        dialog.showErrorBox('Erro', 'Falha ao inicializar banco de dados local');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        dbManager.close();
        app.quit();
    }
});

app.on('before-quit', () => {
    dbManager.close();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
}); 