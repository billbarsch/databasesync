# 📁 Documentação dos Arquivos do Projeto Database Sync

## 🎯 Estrutura do Projeto

Baseado no arquivo `tree-output.json`, o projeto Database Sync possui a seguinte estrutura:

---

## 🏠 **ARQUIVOS PRINCIPAIS**

### **`main.js`** - Processo Principal Electron
- **Função**: Controla toda a aplicação Electron
- **Responsabilidades**:
  - Gerenciamento de janelas (main, config, compare, history, projects)
  - Menu nativo da aplicação
  - Handlers IPC para comunicação entre processos
  - Controle do projeto atual (`currentProjectId`)

**Principais Funções**:
- `createMainWindow()` - Cria janela principal
- `openConfigWindow()` - Abre configuração de conexões
- `openCompareWindow()` - Abre comparação de tabelas
- `openHistoryWindow()` - Abre histórico
- `openProjectsWindow()` - Abre gerenciamento de projetos

**Handlers IPC**:
- Projetos: `create-project`, `get-all-projects`, `update-project`, `delete-project`
- Configurações: `save-config`, `get-config`, `test-connection`
- Comparações: `get-tables-comparison`, `get-comparison-history`
- Registros: `search-table-records`, `compare-records`, `send-records-to-database`
- Filtros: `save-table-filters`, `get-table-filters`, `clear-table-filters`

### **`database.js`** - Gerenciador SQLite
- **Função**: Interface única para todas operações SQLite
- **Padrão**: Singleton para garantir única conexão
- **Responsabilidades**:
  - Criação e migração automática de tabelas
  - CRUD completo de projetos
  - Configurações de banco por projeto
  - Histórico de comparações
  - Sistema de cache

**Principais Métodos**:
- `initialize()` - Conecta e cria estrutura
- `createProject()`, `getAllProjects()`, `deleteProject()` - Gestão de projetos
- `saveDbConfig()`, `getDbConfig()` - Configurações de conexão
- `saveComparisonHistory()`, `getComparisonHistory()` - Histórico
- `saveTableComparisonCache()`, `getTableComparisonCache()` - Cache
- `saveTableFilters()`, `getTableFilters()`, `clearTableFilters()` - Filtros

### **`renderer.js`** - Lógica Frontend Principal
- **Função**: Controla interface da tela principal
- **Responsabilidades**:
  - Gerenciamento da seleção de projetos
  - Atualização de status das conexões
  - Navegação entre janelas
  - Feedback visual para usuário

**Principais Funções**:
- `loadProjectsList()` - Carrega projetos no dropdown
- `handleProjectSelection()` - Processa mudança de projeto
- `updateConnectionStatus()` - Atualiza status das conexões
- `showMessage()` - Exibe mensagens de feedback

---

## 🎨 **INTERFACES HTML**

### **`index.html`** - Tela Principal
- **Função**: Interface inicial com seleção de projetos
- **Seções**:
  - Header com dropdown de projetos
  - Welcome section com features
  - Actions section com passos de uso
  - Status section com conexões

### **`config.html`** - Configuração de Conexões
- **Função**: Interface para configurar conexões MySQL
- **Elementos**:
  - Formulários para 2 bancos de dados
  - Campos: host, porta, usuário, senha, database, nome
  - Botões de teste de conexão
  - Salvamento automático

### **`compare.html`** - Comparação de Tabelas
- **Função**: Visualizar comparação entre bancos
- **Recursos**:
  - Barra de progresso em tempo real
  - Tabela com resultados coloridos
  - Informações de cache
  - Clique em tabelas para detalhes

### **`history.html`** - Histórico de Comparações
- **Função**: Gerenciar histórico de comparações
- **Funcionalidades**:
  - Lista de comparações anteriores
  - Modal com detalhes expandidos
  - Exclusão individual ou em lote
  - Estatísticas detalhadas

### **`projects.html`** - Gerenciamento de Projetos
- **Função**: CRUD completo de projetos
- **Recursos**:
  - Formulário de criação
  - Lista com ações (usar, editar, excluir)
  - Modais de edição e confirmação
  - Validações e feedback

### **`records-compare.html`** - Comparação Detalhada
- **Função**: Análise granular de registros
- **Características**:
  - Sistema de filtros múltiplos com persistência
  - Comparação lado-a-lado
  - Tabs por categoria (iguais/diferentes/únicos)
  - Seleção e envio em lote com logs detalhados
  - Salvamento automático de filtros por projeto/tabela

---

## 🎨 **ESTILO E DESIGN**

### **`styles.css`** - Design System Completo
- **Função**: Todos os estilos da aplicação
- **Componentes**:
  - Reset CSS e tipografia base
  - Layout responsivo com gradientes
  - Sistema de cores e botões
  - Tabelas com cores por status
  - Modais e overlays
  - Animações e transições
  - Media queries para mobile

**Classes Principais**:
- `.container`, `.card`, `.btn-*` - Layout básico
- `.comparison-table`, `.table-row` - Tabelas de dados
- `.modal`, `.loading-spinner` - Overlays
- `.project-section`, `.project-item` - Gestão de projetos

---

## 📋 **DOCUMENTAÇÃO**

### **`README.md`** - Documentação Principal
- Visão geral do projeto
- Instruções de instalação
- Guia de uso básico
- Lista de recursos

### **`TODO.md`** - Histórico de Desenvolvimento
- Registro completo do desenvolvimento
- Funcionalidades implementadas
- Métricas do projeto
- Sugestões futuras

### **`MIGRATION.md`** - Sistema de Migrações
- Documentação das migrações SQLite
- Versionamento da estrutura
- Procedimentos de atualização

### **`SQLITE.md`** - Documentação do Banco
- Estrutura detalhada das tabelas
- Relacionamentos e índices
- Exemplos de uso

---

## ⚙️ **CONFIGURAÇÃO**

### **`package.json`** - Configuração Node.js
- Metadados do projeto
- Dependências: electron, mysql2, sqlite3
- Scripts: start (npm start)
- Configurações de build

### **`package-lock.json`** - Lock de Dependências
- Versões exatas das dependências
- Garantia de reprodutibilidade

### **`.gitignore`** - Exclusões Git
- node_modules/
- Arquivos de build
- Dados locais

---

## 🎯 **ARQUIVOS DE APOIO**

### **`database-example.sql`** - Exemplo MySQL
- Estrutura de banco para testes
- Dados de exemplo
- Comandos de criação

### **`tree-output.json`** - Estrutura do Projeto
- Listagem em JSON dos arquivos
- Mapeamento da organização

### **`assets/icon.png`** - Ícone da Aplicação
- Ícone exibido na aplicação
- Formato PNG para compatibilidade

---

## 🏗️ **ARQUITETURA GERAL**

```
Frontend (Renderer)     ←→ IPC ←→     Backend (Main)
├── HTML Pages                        ├── Window Management  
├── CSS Styles                        ├── Menu System
├── JavaScript Logic                  ├── IPC Handlers
└── User Interface                    └── Database Layer
                                           ├── SQLite (Local)
                                           └── MySQL (Remote)
```

---

## 📊 **ESTATÍSTICAS DO PROJETO**

| Tipo | Quantidade | Descrição |
|------|------------|-----------|
| **Arquivos HTML** | 6 | Interfaces completas |
| **Arquivos JS** | 3 | main.js, database.js, renderer.js |
| **Arquivos CSS** | 1 | Design system completo |
| **Documentação** | 5+ | README, TODO, MIGRATION, etc |
| **Configuração** | 3 | package.json, .gitignore, etc |
| **Total Linhas** | ~6000+ | Código completo e funcional |
| **Funções JS** | 120+ | Lógica robusta e organizada |

---

## 🎯 **FLUXO DE DADOS**

1. **Usuario** → `index.html` → `renderer.js` → **IPC** → `main.js`
2. **main.js** → `database.js` → **SQLite Local**
3. **main.js** → **MySQL Remote** (para comparações)
4. **Resultados** → `database.js` → **IPC** → Interface HTML

---

## 🚀 **RESULTADO FINAL**

O projeto Database Sync possui uma **arquitetura completa e robusta** com:

✅ **19+ arquivos** organizados por responsabilidade  
✅ **Separação clara** entre frontend e backend  
✅ **Sistema de persistência** dual (SQLite + MySQL)  
✅ **Interface moderna** e responsiva  
✅ **Documentação completa** para manutenção  
✅ **Código limpo** e bem estruturado  

**Uma solução profissional e completa para comparação de bancos de dados MySQL! 🎉** 

## 🚀 **NOVAS IMPLEMENTAÇÕES**

### **📋 Sistema de Persistência de Filtros**
- **Nova tabela SQLite**: `table_filters` para armazenar filtros por contexto
- **Métodos no database.js**: 
  - `saveTableFilters()` - Salva filtros por projeto/tabela/banco
  - `getTableFilters()` - Carrega filtros específicos
  - `clearTableFilters()` - Remove filtros de uma tabela
- **Handlers IPC adicionais**:
  - `save-table-filters` - Backend para salvamento
  - `get-table-filters` - Backend para carregamento  
  - `clear-table-filters` - Backend para limpeza

### **🔍 Sistema de Debug e Logs**
- **Logs detalhados** em todas as operações críticas
- **Validação robusta** de dados antes do envio
- **Teste de conectividade** automático
- **Rastreamento completo** do fluxo de dados
- **Métricas precisas** de operações realizadas

### **🛠️ Melhorias na Interface**
- **Botão "Limpar Salvos"** para gerenciar filtros persistidos
- **Feedback visual** aprimorado para operações
- **Logs no console** para debugging
- **Validação de dados** em tempo real

---

## 📊 **ESTATÍSTICAS ATUALIZADAS**

| Componente | Antes | Agora | Crescimento |
|------------|-------|-------|-------------|
| **Linhas de código** | ~5.000 | ~6.000 | +20% |
| **Funções JS** | 100+ | 120+ | +20% |
| **Handlers IPC** | 15+ | 20+ | +33% |
| **Tabelas SQLite** | 4 | 5 | +25% |
| **Funcionalidades** | 10 | 12 | +20% |

**O Database Sync continua evoluindo com foco na experiência do usuário e robustez técnica! 🎯** 