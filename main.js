const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const dbManager = require('./database');

let mainWindow;
let configWindow;
let compareWindow;
let historyWindow;
let projectsWindow;

// Projeto atual selecionado (inicialmente null - usuário deve selecionar um projeto)
let currentProjectId = null;

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
                    label: 'Gerenciar Projetos',
                    click: () => openProjectsWindow()
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

function openProjectsWindow() {
    if (projectsWindow) {
        projectsWindow.focus();
        return;
    }

    projectsWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    projectsWindow.loadFile('projects.html');

    projectsWindow.on('closed', () => {
        projectsWindow = null;
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
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado. Selecione um projeto antes de configurar as conexões.' };
        }

        // Salvar configurações no SQLite com projeto atual
        await dbManager.saveDbConfig('database1', config1, currentProjectId);
        await dbManager.saveDbConfig('database2', config2, currentProjectId);

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
        if (!currentProjectId) {
            return { config1: null, config2: null };
        }

        const config1 = await dbManager.getDbConfig('database1', currentProjectId);
        const config2 = await dbManager.getDbConfig('database2', currentProjectId);

        return { config1, config2 };
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        return { config1: null, config2: null };
    }
});

ipcMain.handle('get-tables-comparison', async (event, forceRefresh = false) => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado. Selecione um projeto antes de fazer comparações.' };
        }

        const dbConfig1 = await dbManager.getDbConfig('database1', currentProjectId);
        const dbConfig2 = await dbManager.getDbConfig('database2', currentProjectId);

        if (!dbConfig1 || !dbConfig2) {
            return { success: false, message: 'Configurações de banco não encontradas para este projeto' };
        }

        // Verificar cache se não for refresh forçado
        if (!forceRefresh) {
            const cachedResult = await dbManager.getTableComparisonCache(dbConfig1, dbConfig2, currentProjectId);
            if (cachedResult) {
                console.log('📁 Usando dados em cache da comparação de tabelas');
                return {
                    success: true,
                    data: cachedResult.comparisonData,
                    db1Name: dbConfig1.database,
                    db2Name: dbConfig2.database,
                    db1DisplayName: cachedResult.db1DisplayName || dbConfig1.connectionName || dbConfig1.database,
                    db2DisplayName: cachedResult.db2DisplayName || dbConfig2.connectionName || dbConfig2.database,
                    totalTables: cachedResult.totalTables,
                    fromCache: true,
                    cachedAt: cachedResult.createdAt
                };
            }
        }

        console.log('🔄 Executando nova comparação de tabelas...');

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig1 = {
            host: dbConfig1.host,
            port: dbConfig1.port,
            user: dbConfig1.user,
            password: dbConfig1.password,
            database: dbConfig1.database
        };

        const mysqlConfig2 = {
            host: dbConfig2.host,
            port: dbConfig2.port,
            user: dbConfig2.user,
            password: dbConfig2.password,
            database: dbConfig2.database
        };

        const conn1 = await mysql.createConnection(mysqlConfig1);
        const conn2 = await mysql.createConnection(mysqlConfig2);

        // Obter tabelas do banco 1
        const [tables1] = await conn1.execute('SHOW TABLES');
        const tableNames1 = tables1.map(row => Object.values(row)[0]);

        // Obter tabelas do banco 2
        const [tables2] = await conn2.execute('SHOW TABLES');
        const tableNames2 = tables2.map(row => Object.values(row)[0]);

        // Obter todas as tabelas únicas
        const allTables = [...new Set([...tableNames1, ...tableNames2])];
        const totalTables = allTables.length;

        const comparison = [];

        // Enviar progresso inicial
        if (compareWindow && !compareWindow.isDestroyed()) {
            compareWindow.webContents.send('comparison-progress', {
                current: 0,
                total: totalTables,
                currentTable: 'Iniciando análise...',
                stage: 'Preparando comparação'
            });
        }

        for (let i = 0; i < allTables.length; i++) {
            const tableName = allTables[i];
            let count1 = 0;
            let count2 = 0;
            let exists1 = tableNames1.includes(tableName);
            let exists2 = tableNames2.includes(tableName);

            // Enviar progresso atual
            if (compareWindow && !compareWindow.isDestroyed()) {
                compareWindow.webContents.send('comparison-progress', {
                    current: i + 1,
                    total: totalTables,
                    currentTable: tableName,
                    stage: 'Contando registros'
                });
            }

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
                different: count1 !== count2 || exists1 !== exists2,
                difference: Math.abs(count1 - count2)
            });
        }

        // Ordenar por diferenças (maior diferença primeiro)
        comparison.sort((a, b) => {
            // Prioridade 1: Tabelas faltantes primeiro
            if ((!a.exists1 || !a.exists2) && (b.exists1 && b.exists2)) return -1;
            if ((a.exists1 && a.exists2) && (!b.exists1 || !b.exists2)) return 1;

            // Prioridade 2: Tabelas com diferenças
            if (a.different && !b.different) return -1;
            if (!a.different && b.different) return 1;

            // Prioridade 3: Maior diferença numérica primeiro
            if (a.different && b.different) {
                return b.difference - a.difference;
            }

            // Prioridade 4: Ordem alfabética para tabelas iguais
            return a.tableName.localeCompare(b.tableName);
        });

        await conn1.end();
        await conn2.end();

        // Enviar progresso de finalização
        if (compareWindow && !compareWindow.isDestroyed()) {
            compareWindow.webContents.send('comparison-progress', {
                current: totalTables,
                total: totalTables,
                currentTable: 'Concluído!',
                stage: 'Salvando histórico'
            });
        }

        // Salvar no histórico
        await dbManager.saveComparisonHistory(
            dbConfig1.database,
            dbConfig2.database,
            comparison,
            dbConfig1.connectionName || dbConfig1.database,
            dbConfig2.connectionName || dbConfig2.database,
            currentProjectId
        );

        // Salvar no cache
        await dbManager.saveTableComparisonCache(
            dbConfig1,
            dbConfig2,
            comparison,
            dbConfig1.connectionName || dbConfig1.database,
            dbConfig2.connectionName || dbConfig2.database,
            currentProjectId
        );

        // Enviar progresso final
        if (compareWindow && !compareWindow.isDestroyed()) {
            compareWindow.webContents.send('comparison-complete');
        }

        console.log('💾 Comparação salva no cache');

        return {
            success: true,
            data: comparison,
            db1Name: dbConfig1.database,
            db2Name: dbConfig2.database,
            db1DisplayName: dbConfig1.connectionName || dbConfig1.database,
            db2DisplayName: dbConfig2.connectionName || dbConfig2.database,
            totalTables: totalTables,
            fromCache: false
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
        if (!currentProjectId) {
            return { success: true, data: [] };
        }

        const history = await dbManager.getComparisonHistory(currentProjectId, limit);
        return { success: true, data: history };
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('delete-comparison-history', async (event, id) => {
    try {
        const result = await dbManager.deleteComparisonHistory(id);
        console.log(`🗑️ Histórico ${id} excluído: ${result.changes} linha(s) afetada(s)`);
        return { success: true, deletedRows: result.changes };
    } catch (error) {
        console.error('❌ Erro ao excluir histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('clear-all-comparison-history', async () => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado' };
        }

        const result = await dbManager.clearAllComparisonHistory(currentProjectId);
        console.log(`🗑️ Todo o histórico limpo: ${result.changes} linha(s) removida(s)`);
        return { success: true, deletedRows: result.changes };
    } catch (error) {
        console.error('❌ Erro ao limpar histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-all-db-configs', async () => {
    try {
        if (!currentProjectId) {
            return { success: true, data: [] };
        }

        const configs = await dbManager.getAllDbConfigs(currentProjectId);
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

// Novos handlers para comparação de registros
ipcMain.handle('open-records-compare-window', async (event, tableName) => {
    console.log('🔍 IPC: Abrindo janela de comparação de registros...', tableName);
    try {
        const recordsWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        recordsWindow.loadURL(`file://${__dirname}/records-compare.html?table=${encodeURIComponent(tableName)}`);
        recordsWindow.show();

        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao abrir janela de comparação de registros:', error);
        return { success: false, message: error.message };
    }
});

// Obter nomes dos bancos de dados
ipcMain.handle('get-database-names', async () => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado' };
        }

        const config1 = await dbManager.getDbConfig('database1', currentProjectId);
        const config2 = await dbManager.getDbConfig('database2', currentProjectId);

        if (config1 && config2) {
            return {
                success: true,
                db1Name: config1.connectionName || config1.database,
                db2Name: config2.connectionName || config2.database
            };
        }
        return { success: false, message: 'Configurações não encontradas para este projeto' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Obter campos de uma tabela
ipcMain.handle('get-table-fields', async (event, tableName) => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado' };
        }

        const dbConfig1 = await dbManager.getDbConfig('database1', currentProjectId);
        if (!dbConfig1) {
            return { success: false, message: 'Configuração do banco 1 não encontrada para este projeto' };
        }

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig1 = {
            host: dbConfig1.host,
            port: dbConfig1.port,
            user: dbConfig1.user,
            password: dbConfig1.password,
            database: dbConfig1.database
        };

        const conn1 = await mysql.createConnection(mysqlConfig1);

        // Obter estrutura da tabela
        const [fields] = await conn1.execute(`DESCRIBE \`${tableName}\``);

        await conn1.end();

        return {
            success: true,
            fields: fields.map(field => ({
                name: field.Field,
                type: field.Type,
                null: field.Null,
                key: field.Key,
                default: field.Default
            }))
        };
    } catch (error) {
        console.error('❌ Erro ao obter campos da tabela:', error);
        return { success: false, message: error.message };
    }
});

// Buscar registros com filtros múltiplos
ipcMain.handle('search-table-records', async (event, { tableName, database, filters }) => {
    try {
        const dbConfig1 = await dbManager.getDbConfig('database1', currentProjectId);
        const dbConfig2 = await dbManager.getDbConfig('database2', currentProjectId);

        if (!dbConfig1 || !dbConfig2) {
            return { success: false, message: 'Configure as duas conexões de banco de dados' };
        }

        const dbConfig = database === 'db1' ? dbConfig1 : dbConfig2;

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig = {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        };

        const conn = await mysql.createConnection(mysqlConfig);

        // ========= OBTER ESTRUTURA DA TABELA PARA DETECÇÃO DE TIPOS =========
        const [tableStructure] = await conn.execute(`DESCRIBE \`${tableName}\``);
        const bigintColumns = [];

        tableStructure.forEach(col => {
            const columnType = col.Type.toLowerCase();
            if (columnType.includes('bigint')) {
                bigintColumns.push(col.Field);
            }
        });

        if (bigintColumns.length > 0) {
            console.log(`🔢 Colunas BIGINT detectadas para busca em ${tableName}:`, bigintColumns.join(', '));
        }

        let query = `SELECT * FROM \`${tableName}\``;
        let params = [];

        // Construir WHERE clause com múltiplos filtros
        if (filters && filters.length > 0) {
            const whereConditions = [];

            filters.forEach((filter, index) => {
                if (filter.field) {
                    let condition = '';

                    if (['IS NULL', 'IS NOT NULL'].includes(filter.operator)) {
                        condition = `\`${filter.field}\` ${filter.operator}`;
                    } else {
                        condition = `\`${filter.field}\` ${filter.operator} ?`;

                        // ========= TRATAMENTO AUTOMÁTICO DE TIPOS BIGINT =========
                        // Converter campos BIGINT para string para preservar precisão numérica
                        let paramValue = filter.value;
                        if (bigintColumns.includes(filter.field) && typeof paramValue === 'number') {
                            paramValue = paramValue.toString();
                            console.log(`🔢 AUTO-CORREÇÃO BIGINT BUSCA: ${filter.field} ${filter.value} → STRING "${paramValue}"`);
                        }
                        params.push(paramValue);
                    }

                    // Adicionar operador lógico se não for o primeiro filtro
                    if (index > 0 && filters[index - 1].logic) {
                        condition = `${filters[index - 1].logic} ${condition}`;
                    }

                    whereConditions.push(condition);
                }
            });

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' ')}`;
            }
        }

        // Limitar resultados para performance
        query += ' LIMIT 1000';

        console.log(`🔍 Query executada: ${query}`);
        console.log(`📊 Parâmetros: `, params);

        // ========= DEBUG ESPECÍFICO PARA PARÂMETROS =========
        params.forEach((param, index) => {
            if (typeof param === 'string' && param.length > 15) {
                console.log(`🔍 Parâmetro ${index}: "${param}" (STRING de ${param.length} caracteres)`);
            }
        });

        const [records] = await conn.execute(query, params);

        await conn.end();

        return {
            success: true,
            records: records,
            query: query // Para debug
        };
    } catch (error) {
        console.error('❌ Erro ao buscar registros:', error);
        return { success: false, message: error.message };
    }
});

// Comparar registros
ipcMain.handle('compare-records', async (event, { db1Records, db2Records, compareField }) => {
    try {
        console.log(`\n🔄 === INICIANDO COMPARAÇÃO DE REGISTROS ===`);
        console.log(`📊 DB1 Records: ${db1Records.length}`);
        console.log(`📊 DB2 Records: ${db2Records.length}`);
        console.log(`🔍 Campo de comparação: ${compareField}`);

        // Debug dos primeiros registros para ver o bancoDados
        if (db1Records.length > 0) {
            console.log(`🏦 Primeiro registro DB1 - bancoDados: ${db1Records[0].bancoDados} (${typeof db1Records[0].bancoDados})`);
            console.log(`🏦 Primeiro registro DB1 - ${compareField}: ${db1Records[0][compareField]}`);

            // ========= DEBUG ESPECÍFICO PARA PRECISÃO NUMÉRICA =========
            if (typeof db1Records[0].bancoDados === 'number') {
                console.log(`🔬 DB1 bancoDados como STRING: "${db1Records[0].bancoDados.toString()}"`);
            }
        }
        if (db2Records.length > 0) {
            console.log(`🏦 Primeiro registro DB2 - bancoDados: ${db2Records[0].bancoDados} (${typeof db2Records[0].bancoDados})`);
            console.log(`🏦 Primeiro registro DB2 - ${compareField}: ${db2Records[0][compareField]}`);

            // ========= DEBUG ESPECÍFICO PARA PRECISÃO NUMÉRICA =========
            if (typeof db2Records[0].bancoDados === 'number') {
                console.log(`🔬 DB2 bancoDados como STRING: "${db2Records[0].bancoDados.toString()}"`);
            }
        }

        const comparison = [];
        const db1Map = new Map();
        const db2Map = new Map();

        // Indexar registros do banco 1
        db1Records.forEach(record => {
            const key = record[compareField];
            if (key !== null && key !== undefined) {
                db1Map.set(String(key), record);
            }
        });

        // Indexar registros do banco 2
        db2Records.forEach(record => {
            const key = record[compareField];
            if (key !== null && key !== undefined) {
                db2Map.set(String(key), record);
            }
        });

        // Comparar registros
        const allKeys = new Set([...db1Map.keys(), ...db2Map.keys()]);

        allKeys.forEach(key => {
            const record1 = db1Map.get(key);
            const record2 = db2Map.get(key);

            if (record1 && record2) {
                // Verificar se são iguais (comparação simples)
                const isEqual = JSON.stringify(record1) === JSON.stringify(record2);
                comparison.push({
                    compareValue: key,
                    status: isEqual ? 'match' : 'different',
                    db1Record: record1,
                    db2Record: record2
                });
            } else if (record1) {
                comparison.push({
                    compareValue: key,
                    status: 'only-db1',
                    db1Record: record1,
                    db2Record: null
                });
            } else if (record2) {
                comparison.push({
                    compareValue: key,
                    status: 'only-db2',
                    db1Record: null,
                    db2Record: record2
                });
            }
        });

        // Calcular estatísticas
        const stats = {
            totalDb1: db1Records.length,
            totalDb2: db2Records.length,
            totalMatch: comparison.filter(c => c.status === 'match').length,
            totalDiff: comparison.filter(c => c.status === 'different').length +
                comparison.filter(c => c.status === 'only-db1').length +
                comparison.filter(c => c.status === 'only-db2').length
        };

        console.log(`\n📊 === RESULTADO DA COMPARAÇÃO ===`);
        console.log(`Total de comparações: ${comparison.length}`);

        // Debug dos primeiros resultados de comparação para ver bancoDados
        if (comparison.length > 0) {
            const firstResult = comparison[0];
            console.log(`\n🔬 PRIMEIRA COMPARAÇÃO DEBUG:`);
            console.log(`📊 Status: ${firstResult.status}`);
            console.log(`🔍 Compare Value: ${firstResult.compareValue}`);
            if (firstResult.db1Record) {
                console.log(`🏦 DB1 bancoDados: ${firstResult.db1Record.bancoDados} (${typeof firstResult.db1Record.bancoDados})`);
            }
            if (firstResult.db2Record) {
                console.log(`🏦 DB2 bancoDados: ${firstResult.db2Record?.bancoDados || 'NULL'} (${typeof firstResult.db2Record?.bancoDados})`);
            }
        }
        console.log(`===============================\n`);

        return {
            success: true,
            comparison: comparison,
            stats: stats
        };
    } catch (error) {
        console.error('❌ Erro ao comparar registros:', error);
        return { success: false, message: error.message };
    }
});

// Enviar registros para banco de dados
ipcMain.handle('send-records-to-database', async (event, { tableName, targetDatabase, records }) => {
    let conn = null;

    try {
        console.log(`🚀 === INICIANDO ENVIO DE REGISTROS ===`);
        console.log(`📋 Tabela: ${tableName}`);
        console.log(`🎯 Banco destino: ${targetDatabase}`);
        console.log(`📊 Total de registros recebidos: ${records.length}`);

        const dbConfig1 = await dbManager.getDbConfig('database1', currentProjectId);
        const dbConfig2 = await dbManager.getDbConfig('database2', currentProjectId);

        if (!dbConfig1 || !dbConfig2) {
            console.log(`❌ Configurações não encontradas - DB1: ${!!dbConfig1}, DB2: ${!!dbConfig2}`);
            return { success: false, message: 'Configure as duas conexões de banco de dados' };
        }

        const dbConfig = targetDatabase === 'db1' ? dbConfig1 : dbConfig2;
        const targetDbName = dbConfig.connectionName || `${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

        console.log(`🔧 Conectando ao banco destino: ${targetDbName}`);
        console.log(`🔧 Configuração:`, {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            database: dbConfig.database
        });

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig = {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        };

        conn = await mysql.createConnection(mysqlConfig);
        console.log(`✅ Conexão estabelecida com sucesso`);

        // Verificar se a tabela existe e obter estrutura
        console.log(`\n🔍 === VERIFICANDO ESTRUTURA DA TABELA ===`);
        const tableCheckSql = `SHOW TABLES LIKE '${tableName}'`;
        console.log(`📝 SQL: ${tableCheckSql}`);

        const [tableExists] = await conn.execute(tableCheckSql);
        console.log(`📋 Tabela '${tableName}':`, tableExists.length > 0 ? 'EXISTE' : 'NÃO EXISTE');

        if (tableExists.length === 0) {
            await conn.end();
            return { success: false, message: `Tabela '${tableName}' não existe no banco de destino` };
        }

        // Obter informações sobre chaves primárias
        const keyInfoSql = `SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`;
        console.log(`📝 SQL: ${keyInfoSql}`);

        const [primaryKeys] = await conn.execute(keyInfoSql);
        const hasPrimaryKey = primaryKeys.length > 0;
        const primaryKeyColumns = primaryKeys.map(key => key.Column_name);

        console.log(`🔑 Chave primária:`, hasPrimaryKey ? `SIM (${primaryKeyColumns.join(', ')})` : 'NÃO');

        // Obter estrutura completa da tabela
        const tableStructureSql = `DESCRIBE \`${tableName}\``;
        console.log(`📝 SQL: ${tableStructureSql}`);

        const [tableStructure] = await conn.execute(tableStructureSql);
        const tableColumns = tableStructure.map(col => col.Field);
        console.log(`📊 Colunas da tabela (${tableColumns.length}):`, tableColumns.slice(0, 5).join(', ') + (tableColumns.length > 5 ? '...' : ''));

        // ========= IDENTIFICAR TIPOS DE DADOS AUTOMATICAMENTE =========
        const bigintColumns = [];
        const dateTimeColumns = [];

        tableStructure.forEach(col => {
            const columnType = col.Type.toLowerCase();

            // Detectar colunas BIGINT (que podem perder precisão)
            if (columnType.includes('bigint')) {
                bigintColumns.push(col.Field);
            }

            // Detectar colunas de data/hora (que devem manter formato original)
            if (columnType.includes('datetime') || columnType.includes('timestamp') || columnType.includes('date')) {
                dateTimeColumns.push(col.Field);
            }
        });

        console.log(`🔢 Colunas BIGINT detectadas (${bigintColumns.length}):`, bigintColumns.join(', ') || 'nenhuma');
        console.log(`📅 Colunas DATE/DATETIME detectadas (${dateTimeColumns.length}):`, dateTimeColumns.join(', ') || 'nenhuma');

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const processedRecords = [];

        for (let i = 0; i < records.length; i++) {
            const recordData = records[i];
            console.log(`\n📝 === PROCESSANDO REGISTRO ${i + 1}/${records.length} ===`);

            try {
                // Extrair registro baseado no status
                let record = null;
                let recordSource = '';

                if (recordData.sourceRecord) {
                    record = recordData.sourceRecord;
                    recordSource = 'sourceRecord pré-definido';
                    console.log(`📤 Usando ${recordSource}`);

                    // Log específico para campo bancoDados para debug
                    if (record.bancoDados) {
                        console.log(`🔍 Campo bancoDados detectado: ${record.bancoDados} (tipo: ${typeof record.bancoDados})`);
                    }
                } else {
                    console.log(`🔍 Status do registro: ${recordData.status}`);

                    if (recordData.status === 'only-db1') {
                        record = recordData.db1Record;
                        recordSource = 'DB1 (único)';
                    } else if (recordData.status === 'only-db2') {
                        record = recordData.db2Record;
                        recordSource = 'DB2 (único)';
                    } else if (recordData.status === 'different') {
                        record = targetDatabase === 'db1' ? recordData.db2Record : recordData.db1Record;
                        recordSource = `${targetDatabase === 'db1' ? 'DB2' : 'DB1'} (diferente)`;
                    } else {
                        console.log(`⏭️ Pulando registro com status não processável: ${recordData.status}`);
                        skippedCount++;
                        continue;
                    }

                    console.log(`📤 Usando registro do ${recordSource}`);
                }

                // Validar registro
                if (!record || typeof record !== 'object') {
                    console.log(`⚠️ Registro vazio ou inválido - pulando`);
                    skippedCount++;
                    continue;
                }

                const recordKeys = Object.keys(record);
                if (recordKeys.length === 0) {
                    console.log(`⚠️ Registro sem campos - pulando`);
                    skippedCount++;
                    continue;
                }

                console.log(`💾 Preparando para inserir/atualizar ${recordKeys.length} campos`);
                console.log(`📋 Campos:`, recordKeys.slice(0, 3).join(', ') + (recordKeys.length > 3 ? '...' : ''));

                // Filtrar apenas colunas que existem na tabela
                const validColumns = recordKeys.filter(col => tableColumns.includes(col));
                const invalidColumns = recordKeys.filter(col => !tableColumns.includes(col));

                if (invalidColumns.length > 0) {
                    console.log(`⚠️ Colunas ignoradas (não existem na tabela):`, invalidColumns.join(', '));
                }

                if (validColumns.length === 0) {
                    console.log(`❌ Nenhuma coluna válida encontrada - pulando registro`);
                    skippedCount++;
                    continue;
                }

                // Preparar dados para inserção com tratamento automático de tipos
                const values = validColumns.map(col => {
                    let value = record[col];

                    // ========= TRATAMENTO AUTOMÁTICO DE TIPOS BIGINT =========
                    // Converter campos BIGINT para string para preservar precisão numérica
                    if (bigintColumns.includes(col) && typeof value === 'number') {
                        const originalValue = value;
                        value = value.toString();
                        console.log(`🔢 AUTO-CORREÇÃO BIGINT: ${col} ${originalValue} → STRING "${value}"`);
                    }

                    // ========= PRESERVAÇÃO DE FORMATO DE DATAS =========
                    // Para campos DATE/DATETIME, preservar formato original (NÃO converter objetos Date)
                    if (dateTimeColumns.includes(col)) {
                        if (value instanceof Date) {
                            // Se é um objeto Date, converter para formato MySQL sem timezone
                            const year = value.getFullYear();
                            const month = String(value.getMonth() + 1).padStart(2, '0');
                            const day = String(value.getDate()).padStart(2, '0');
                            const hours = String(value.getHours()).padStart(2, '0');
                            const minutes = String(value.getMinutes()).padStart(2, '0');
                            const seconds = String(value.getSeconds()).padStart(2, '0');

                            const originalValue = value;
                            value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                            console.log(`📅 PRESERVANDO DATA: ${col} [${originalValue}] → "${value}"`);
                        } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
                            // Se é string ISO, converter para formato MySQL
                            try {
                                const date = new Date(value);
                                const originalValue = value;
                                value = date.toISOString().slice(0, 19).replace('T', ' ');
                                console.log(`📅 CONVERTENDO ISO: ${col} "${originalValue}" → "${value}"`);
                            } catch (error) {
                                console.log(`⚠️ Erro ao converter data ISO ${col}: ${error.message}`);
                            }
                        } else {
                            // Se já está em formato string adequado, manter como está
                            console.log(`📅 MANTENDO FORMATO: ${col} = "${value}"`);
                        }
                    }

                    return value;
                });
                const placeholders = validColumns.map(() => '?').join(', ');
                const columnNames = validColumns.map(col => `\`${col}\``).join(', ');

                // Log específico para bancoDados antes da inserção
                const bancoDadosIndex = validColumns.indexOf('bancoDados');
                if (bancoDadosIndex !== -1) {
                    console.log(`🎯 VALOR ESPECÍFICO bancoDados a ser inserido: ${values[bancoDadosIndex]} (tipo: ${typeof values[bancoDadosIndex]})`);
                }

                // Log específico para campos de data antes da inserção
                const dateFields = ['dataEmissao', 'dataVencimento', 'dataRecebimento', 'created_at', 'updated_at'];
                dateFields.forEach(field => {
                    const fieldIndex = validColumns.indexOf(field);
                    if (fieldIndex !== -1) {
                        const value = values[fieldIndex];
                        console.log(`📅 Campo ${field} a ser inserido: ${value} (tipo: ${typeof value})`);

                        // Se for string no formato ISO, mostrar aviso
                        if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
                            console.log(`⚠️  ATENÇÃO: Campo ${field} está em formato ISO que pode causar erro no MySQL!`);
                        }
                    }
                });

                // Construir query apropriada
                let insertQuery;
                if (hasPrimaryKey) {
                    // Usar ON DUPLICATE KEY UPDATE se há chave primária
                    const updateClause = validColumns.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ');
                    insertQuery = `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
                } else {
                    // Usar INSERT IGNORE se não há chave primária
                    insertQuery = `INSERT IGNORE INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders})`;
                }

                console.log(`📝 SQL preparado:`, insertQuery.length > 200 ? insertQuery.substring(0, 200) + '...' : insertQuery);
                console.log(`📊 Valores (primeiros 3):`, values.slice(0, 3).map(v => {
                    if (v === null) return 'NULL';
                    if (typeof v === 'string' && v.length > 30) return v.substring(0, 30) + '...';
                    return v;
                }));

                // Executar inserção
                console.log(`⚡ Executando SQL...`);
                const [result] = await conn.execute(insertQuery, values);

                console.log(`📊 Resultado da execução:`, {
                    affectedRows: result.affectedRows,
                    insertId: result.insertId,
                    changedRows: result.changedRows,
                    warningCount: result.warningCount
                });

                // Determinar se foi inserção ou atualização
                let wasInserted = false;
                let wasUpdated = false;

                if (hasPrimaryKey) {
                    if (result.affectedRows === 1) {
                        wasInserted = true;
                        insertedCount++;
                        console.log(`✅ INSERIDO - Novo registro criado`);
                    } else if (result.affectedRows === 2) {
                        wasUpdated = true;
                        updatedCount++;
                        console.log(`✅ ATUALIZADO - Registro existente modificado`);
                    } else {
                        console.log(`⚠️ Resultado inesperado - affectedRows: ${result.affectedRows}`);
                        skippedCount++;
                    }
                } else {
                    if (result.affectedRows > 0) {
                        wasInserted = true;
                        insertedCount++;
                        console.log(`✅ INSERIDO - Novo registro criado (sem chave primária)`);
                    } else {
                        console.log(`⚠️ Registro não inserido (possivelmente duplicado)`);
                        skippedCount++;
                    }
                }

                // Verificar se o registro foi realmente inserido/atualizado
                if (wasInserted || wasUpdated) {
                    let verificationQuery = '';
                    let verificationParams = [];

                    if (hasPrimaryKey && primaryKeyColumns.length > 0) {
                        // Usar chave primária para verificação
                        const pkConditions = primaryKeyColumns.map(col => `\`${col}\` = ?`).join(' AND ');
                        const pkValues = primaryKeyColumns.map(col => record[col]);

                        verificationQuery = `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE ${pkConditions}`;
                        verificationParams = pkValues;
                    } else {
                        // Usar todos os campos para verificação (menos eficiente, mas funciona)
                        const allConditions = validColumns.map(col => {
                            if (record[col] === null) {
                                return `\`${col}\` IS NULL`;
                            } else {
                                return `\`${col}\` = ?`;
                            }
                        }).join(' AND ');

                        verificationQuery = `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE ${allConditions}`;
                        verificationParams = validColumns.filter(col => record[col] !== null).map(col => record[col]);
                    }

                    console.log(`🔍 Verificando inserção...`);
                    console.log(`📝 SQL de verificação:`, verificationQuery.length > 150 ? verificationQuery.substring(0, 150) + '...' : verificationQuery);

                    const [verificationResult] = await conn.execute(verificationQuery, verificationParams);
                    const recordExists = verificationResult[0].count > 0;

                    console.log(`🎯 VERIFICAÇÃO: Registro ${recordExists ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} na tabela de destino`);

                    if (!recordExists) {
                        console.log(`❌ ERRO: Registro deveria existir mas não foi encontrado!`);
                        errorCount++;
                        if (wasInserted) insertedCount--;
                        if (wasUpdated) updatedCount--;
                    } else {
                        console.log(`✅ CONFIRMADO: Registro existe na tabela de destino`);
                    }

                    // ========= VERIFICAÇÃO DETALHADA COMPLETA =========
                    console.log(`\n🔬 === VERIFICAÇÃO DETALHADA DO REGISTRO INSERIDO ===`);

                    // Buscar o registro completo que foi inserido para comparação
                    const detailQuery = `SELECT * FROM \`${tableName}\` WHERE \`id\` = ?`;
                    const [detailResult] = await conn.execute(detailQuery, [record.id]);

                    if (detailResult.length > 0) {
                        const insertedRecord = detailResult[0];
                        console.log(`✅ Registro encontrado na tabela de destino com ID: ${record.id}`);

                        // Comparar campos específicos importantes
                        const importantFields = ['id', 'bancoDados', 'dataEmissao', 'empresa', 'emitente', 'numero', 'serie'];
                        console.log(`\n📊 COMPARAÇÃO CAMPO POR CAMPO:`);

                        importantFields.forEach(field => {
                            if (record[field] !== undefined) {
                                const originalValue = record[field];
                                const insertedValue = insertedRecord[field];
                                const matches = String(originalValue) === String(insertedValue);

                                console.log(`${matches ? '✅' : '❌'} ${field}:`);
                                console.log(`   Original: ${originalValue} (${typeof originalValue})`);
                                console.log(`   Inserido: ${insertedValue} (${typeof insertedValue})`);
                                console.log(`   Match: ${matches}`);
                            }
                        });

                        // Mostrar TODOS os campos para debug completo
                        console.log(`\n📋 REGISTRO COMPLETO INSERIDO:`);
                        Object.keys(insertedRecord).forEach(key => {
                            console.log(`   ${key}: ${insertedRecord[key]} (${typeof insertedRecord[key]})`);
                        });

                    } else {
                        console.log(`❌ FALHA CRÍTICA: Registro com ID ${record.id} NÃO FOI ENCONTRADO após inserção!`);
                    }

                    // ========= VERIFICAÇÃO ESPECÍFICA PARA CAMPOS BIGINT =========
                    // Verificar se algum campo BIGINT foi inserido para debug
                    for (const bigintCol of bigintColumns) {
                        if (record[bigintCol] !== undefined) {
                            const countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE \`${bigintCol}\` = ?`;
                            const valueForQuery = typeof record[bigintCol] === 'number' ? record[bigintCol].toString() : record[bigintCol];
                            const [countResult] = await conn.execute(countQuery, [valueForQuery]);
                            console.log(`🔢 Total de registros com ${bigintCol} '${valueForQuery}': ${countResult[0].total}`);
                        }
                    }

                    // Verificar se existe algum registro com o bancoDados da busca original
                    const originalBancoDados = '533451641457980538'; // Valor usado na busca
                    const [originalCountResult] = await conn.execute(countQuery, [originalBancoDados]);
                    console.log(`📊 Total de registros com bancoDados original '${originalBancoDados}': ${originalCountResult[0].total}`);

                    console.log(`🏁 === FIM VERIFICAÇÃO DETALHADA ===\n`);
                }

                processedRecords.push({
                    index: i + 1,
                    action: wasInserted ? 'INSERTED' : wasUpdated ? 'UPDATED' : 'SKIPPED',
                    source: recordSource,
                    success: wasInserted || wasUpdated
                });

            } catch (recordError) {
                console.error(`❌ ERRO ao processar registro ${i + 1}:`);
                console.error(`📋 Mensagem:`, recordError.message);
                console.error(`📋 Código:`, recordError.code);
                console.error(`📋 SQL State:`, recordError.sqlState);
                console.error(`📋 Errno:`, recordError.errno);

                if (recordError.sql) {
                    console.error(`📋 SQL que causou erro:`, recordError.sql);
                }

                errorCount++;
                processedRecords.push({
                    index: i + 1,
                    action: 'ERROR',
                    error: recordError.message,
                    success: false
                });
            }
        }

        // ========= VERIFICAÇÃO FINAL DO BANCO =========
        console.log(`\n🏆 === VERIFICAÇÃO FINAL DO ESTADO DO BANCO ===`);

        // Buscar TODOS os registros da tabela para mostrar o estado final
        const finalCheckQuery = `SELECT id, bancoDados, empresa, emitente, dataEmissao FROM \`${tableName}\` ORDER BY id DESC LIMIT 10`;
        console.log(`📝 Executando verificação final: ${finalCheckQuery}`);

        const [finalRecords] = await conn.execute(finalCheckQuery);
        console.log(`📊 Total de registros encontrados na verificação: ${finalRecords.length}`);

        if (finalRecords.length > 0) {
            console.log(`📋 ÚLTIMOS 10 REGISTROS NA TABELA:`);
            finalRecords.forEach((record, idx) => {
                console.log(`   ${idx + 1}. ID: ${record.id}, bancoDados: ${record.bancoDados}, empresa: ${record.empresa}`);
            });
        }

        // ========= VERIFICAÇÃO FINAL PARA CAMPOS BIGINT =========
        // Buscar especificamente com os valores BIGINT que foram inseridos
        if (records.length > 0 && records[0].sourceRecord && bigintColumns.length > 0) {
            const firstRecord = records[0].sourceRecord;

            for (const bigintCol of bigintColumns) {
                if (firstRecord[bigintCol] !== undefined) {
                    const insertedQuery = `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE \`${bigintCol}\` = ?`;
                    const valueForFinalQuery = typeof firstRecord[bigintCol] === 'number' ?
                        firstRecord[bigintCol].toString() : firstRecord[bigintCol];
                    const [insertedResult] = await conn.execute(insertedQuery, [valueForFinalQuery]);
                    console.log(`🎯 Registros com ${bigintCol} '${valueForFinalQuery}' (valor inserido): ${insertedResult[0].total}`);
                }
            }
        }

        // Buscar com o bancoDados usado na busca original (533451641457980538)
        const originalBancoDados = '533451641457980538';
        const originalQuery = `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE bancoDados = ?`;
        const [originalResult] = await conn.execute(originalQuery, [originalBancoDados]);
        console.log(`🔍 Registros com bancoDados '${originalBancoDados}' (valor da busca): ${originalResult[0].total}`);

        console.log(`🏁 === FIM VERIFICAÇÃO FINAL ===\n`);

        console.log(`\n🎯 === RESUMO FINAL DO ENVIO ===`);
        console.log(`📊 Total de registros processados: ${records.length}`);
        console.log(`✅ Inseridos: ${insertedCount}`);
        console.log(`🔄 Atualizados: ${updatedCount}`);
        console.log(`⏭️ Pulados: ${skippedCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`📈 Taxa de sucesso: ${((insertedCount + updatedCount) / records.length * 100).toFixed(1)}%`);

        await conn.end();
        console.log(`🔌 Conexão com banco fechada`);

        return {
            success: true,
            insertedCount: insertedCount,
            updatedCount: updatedCount,
            skippedCount: skippedCount,
            errorCount: errorCount,
            processedRecords: processedRecords,
            message: `Processamento concluído: ${insertedCount} inseridos, ${updatedCount} atualizados, ${skippedCount} pulados, ${errorCount} erros`
        };

    } catch (error) {
        console.error('❌ ERRO GERAL ao enviar registros:', error);
        console.error('📋 Stack trace:', error.stack);

        if (conn) {
            try {
                await conn.end();
                console.log(`🔌 Conexão com banco fechada após erro`);
            } catch (closeError) {
                console.error('❌ Erro ao fechar conexão:', closeError);
            }
        }

        return {
            success: false,
            message: `Erro geral: ${error.message}`,
            insertedCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            errorCount: records.length
        };
    }
});

// Limpar cache de comparação de tabelas
ipcMain.handle('clear-table-comparison-cache', async () => {
    try {
        await dbManager.clearAllTableComparisonCache(currentProjectId);
        console.log('🗑️ Cache de comparação de tabelas limpo');
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        return { success: false, message: error.message };
    }
});

// ===== HANDLERS DE PROJETOS =====

// Criar novo projeto
ipcMain.handle('create-project', async (event, { name, description }) => {
    try {
        const result = await dbManager.createProject(name, description);
        console.log(`📁 Projeto criado: ${name} (ID: ${result.id})`);
        return { success: true, projectId: result.id };
    } catch (error) {
        console.error('❌ Erro ao criar projeto:', error);
        return { success: false, message: error.message };
    }
});

// Listar todos os projetos
ipcMain.handle('get-all-projects', async () => {
    try {
        const projects = await dbManager.getAllProjects();
        return { success: true, data: projects };
    } catch (error) {
        console.error('❌ Erro ao buscar projetos:', error);
        return { success: false, message: error.message };
    }
});

// Buscar projeto por ID
ipcMain.handle('get-project', async (event, projectId) => {
    try {
        const project = await dbManager.getProject(projectId);
        if (project) {
            return { success: true, data: project };
        } else {
            return { success: false, message: 'Projeto não encontrado' };
        }
    } catch (error) {
        console.error('❌ Erro ao buscar projeto:', error);
        return { success: false, message: error.message };
    }
});

// Atualizar projeto
ipcMain.handle('update-project', async (event, { id, name, description }) => {
    try {
        await dbManager.updateProject(id, name, description);
        console.log(`✏️ Projeto atualizado: ${name} (ID: ${id})`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao atualizar projeto:', error);
        return { success: false, message: error.message };
    }
});

// Excluir projeto
ipcMain.handle('delete-project', async (event, projectId) => {
    try {
        await dbManager.deleteProject(projectId);
        console.log(`🗑️ Projeto excluído: ID ${projectId}`);

        // Se for o projeto atual, voltar para o projeto padrão
        if (currentProjectId === projectId) {
            currentProjectId = 1;
            console.log('🔄 Voltando para o projeto padrão');
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao excluir projeto:', error);
        return { success: false, message: error.message };
    }
});

// Selecionar projeto atual
ipcMain.handle('select-project', async (event, projectId) => {
    try {
        const project = await dbManager.getProject(projectId);
        if (project) {
            currentProjectId = projectId;
            console.log(`🎯 Projeto selecionado: ${project.name} (ID: ${projectId})`);

            // Atualizar título da janela principal
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setTitle(`Database Sync - ${project.name}`);
                // Recarregar a janela principal para atualizar os dados
                mainWindow.webContents.reload();
            }

            return { success: true, project: project };
        } else {
            return { success: false, message: 'Projeto não encontrado' };
        }
    } catch (error) {
        console.error('❌ Erro ao selecionar projeto:', error);
        return { success: false, message: error.message };
    }
});

// Obter projeto atual
ipcMain.handle('get-current-project', async () => {
    try {
        const project = await dbManager.getProject(currentProjectId);
        return { success: true, project: project };
    } catch (error) {
        console.error('❌ Erro ao obter projeto atual:', error);
        return { success: false, message: error.message };
    }
});

// Abrir janela de projetos
ipcMain.handle('open-projects-window', async () => {
    console.log('📁 IPC: Abrindo janela de projetos...');
    openProjectsWindow();
    return { success: true };
});

// ===== HANDLERS PARA FILTROS DE TABELAS =====

// Salvar filtros de uma tabela
ipcMain.handle('save-table-filters', async (event, { tableName, database, filters }) => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado' };
        }

        await dbManager.saveTableFilters(currentProjectId, tableName, database, filters);
        console.log(`💾 Filtros salvos para ${tableName} (${database}) no projeto ${currentProjectId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao salvar filtros:', error);
        return { success: false, message: error.message };
    }
});

// Buscar filtros salvos de uma tabela
ipcMain.handle('get-table-filters', async (event, { tableName, database }) => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado' };
        }

        const filters = await dbManager.getTableFilters(currentProjectId, tableName, database);
        console.log(`📋 Filtros carregados para ${tableName} (${database}):`, filters.length, 'filtros');
        return { success: true, filters };
    } catch (error) {
        console.error('❌ Erro ao carregar filtros:', error);
        return { success: false, message: error.message, filters: [] };
    }
});

// Limpar filtros de uma tabela
ipcMain.handle('clear-table-filters', async (event, { tableName }) => {
    try {
        if (!currentProjectId) {
            return { success: false, message: 'Nenhum projeto selecionado' };
        }

        await dbManager.clearTableFilters(currentProjectId, tableName);
        console.log(`🗑️ Filtros limpos para ${tableName} no projeto ${currentProjectId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao limpar filtros:', error);
        return { success: false, message: error.message };
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